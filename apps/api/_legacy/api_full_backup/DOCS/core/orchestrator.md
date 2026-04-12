# orchestrator.py — Le chef d'orchestre du traitement

**Fichier :** `core/orchestrator.py`
**Rôle :** Coordonne toutes les étapes de traitement d'une facture — de la photo brute jusqu'aux données sauvegardées en base.

---

## Le code

> Référence canonique : `core/orchestrator.py`. Extrait condensé (timeouts + coûts via `Config`).

```python
import asyncio
import logging

from core.config import Config
from core.db_manager import DBManager
from services.bytez_service import extract_invoice_fallback
from services.community_service import CommunityService
from services.gemini_service import GeminiService
from services.image_preprocessor import ImagePreprocessor
from services.storage_service import StorageService

logger = logging.getLogger(__name__)
# Coûts : Config.cost_per_million_map() — défauts dans config.py, surcharge GEMINI_COST_PER_MILLION_JSON
COST_PER_MILLION: dict[str, float] = Config.cost_per_million_map()  # alias import tests


class Orchestrator:

    @staticmethod
    async def process_file(
        file_bytes: bytes,
        filename:   str,
        model_id:   str = "gemini-3-flash-preview",
        source:     str = "pc",
        user_id:    int | None = None,
    ) -> dict:
        """
        Pipeline complet :
        1. Détecter le type MIME
        2. Prétraiter si image (OpenCV)
        3. Extraire via Gemini
        4. Sauvegarder en BDD
        5. Logger dans historique factures
        Retourne { success, products, products_added, facture_id, ... }
        """
        logger.info("→ Traitement: %s (modèle: %s, source: %s)", filename, model_id, source)

        # ── 1. Détection MIME ─────────────────────────────────────
        mime_type = Orchestrator._detect_mime(filename, file_bytes)

        # ── 2. Extraction IA (Gemini) + fallback image ─────────────
        result = None
        processed_bytes = file_bytes
        if ImagePreprocessor.is_image(filename):
            processed_bytes = await asyncio.to_thread(
                ImagePreprocessor.preprocess_bytes, file_bytes, filename
            )
        try:
            service = GeminiService.get_or_create(model_id=model_id)
            result = await service.extract_from_bytes_async(
                processed_bytes, mime_type, filename
            )
        except Exception as gemini_err:
            logger.warning("Gemini échec (%s), tentative Bytez fallback: %s", filename, gemini_err)
            result = None
            if ImagePreprocessor.is_image(filename):
                from services.bytez_service import extract_invoice_fallback
                result = await extract_invoice_fallback(processed_bytes, filename)
            if result is None:
                raise gemini_err

        if not result.produits:
            await DBManager.log_facture(
                filename=filename, statut="erreur",
                nb_produits=0, cout_usd=0.0,
                modele_ia=model_id, source=source, user_id=user_id,
            )
            return {
                "success": False,
                "error":   "Aucun produit extrait de la facture",
                "filename": filename,
            }

        # ── 4+5. BDD + S3 en parallèle ────────────────────────────
        products_dicts = [p.model_dump() for p in result.produits]
        (nb_saved, historique_failures), pdf_url = await asyncio.gather(
            DBManager.upsert_products_batch(products_dicts, source=source, user_id=user_id),
            asyncio.to_thread(
                StorageService.upload_file,
                file_bytes, filename, content_type=mime_type,
            ),
        )

        # ── 6. Historique ─────────────────────────────────────────
        costs = Config.cost_per_million_map()
        cout_usd = (result.tokens_used / 1_000_000) * costs.get(model_id, 0.50)
        facture_id = await DBManager.log_facture(
            filename=filename, statut="traite",
            nb_produits=nb_saved, cout_usd=cout_usd,
            modele_ia=model_id, source=source, pdf_url=pdf_url, user_id=user_id,
        )

        # ── 7. Base prix communautaire (anonyme, si consentement) ─
        if user_id and nb_saved > 0:
            consent, zone_geo = await DBManager.get_user_community_prefs(user_id)
            if consent and zone_geo and "-" in zone_geo:
                pays = zone_geo.split("-")[0][:2]
                batch_rows = [
                    {
                        "designation": p.get("designation_fr") or p.get("designation_raw"),
                        "fournisseur": p.get("fournisseur", ""),
                        "prix_ht": float(p.get("prix_remise_ht") or p.get("prix_brut_ht") or 0),
                        "date_facture": str(p.get("date_facture")) if p.get("date_facture") else None,
                    }
                    for p in products_dicts
                ]
                pool = await DBManager.get_pool()
                async with pool.acquire() as conn:
                    await CommunityService.insert_anonymous_prices_batch(
                        conn, rows=batch_rows, zone_geo=zone_geo, pays=pays,
                    )

        return {
            "success":          True,
            "filename":         filename,
            "products":         products_dicts,
            "products_added":   nb_saved,
            "facture_id":       facture_id,
            "fournisseur":      result.fournisseur_detecte,
            "langue":           result.langue_detectee,
            "tokens_used":      result.tokens_used,
            "cout_usd":         round(cout_usd, 6),
            "model_used":       model_id,
            "pdf_url":          pdf_url,
        }

    @staticmethod
    def _detect_mime(filename: str, file_bytes: bytes) -> str:
        """Détecte le MIME type par extension + magic bytes."""
        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

        mime_map = {
            "pdf":  "application/pdf",
            "jpg":  "image/jpeg",
            "jpeg": "image/jpeg",
            "png":  "image/png",
            "webp": "image/webp",
            "heic": "image/heic",
            "heif": "image/heif",
        }

        if ext in mime_map:
            return mime_map[ext]

        # Magic bytes fallback
        if file_bytes[:4] == b"%PDF":
            return "application/pdf"
        if file_bytes[:3] in (b"\xff\xd8\xff",):
            return "image/jpeg"
        if file_bytes[:8] == b"\x89PNG\r\n\x1a\n":
            return "image/png"

        return "image/jpeg"  # fallback safe
```

---

## Ce que ce fichier fait — en clair

L'Orchestrator, c'est le **chef d'atelier** d'une usine.
Il ne fait rien lui-même — il distribue le travail aux bons ouvriers dans le bon ordre.

Quand tu envoies une photo de facture, voici ce qu'il déclenche, étape par étape :

---

### Étape 1 — Identifier le type de fichier (`_detect_mime`)

Avant tout, il faut savoir à quoi on a affaire.
Est-ce un PDF ? Une photo JPG ? Un PNG ?

La détection se fait en deux temps :
1. **Par l'extension du nom de fichier** : `facture.pdf` → c'est un PDF
2. **Par les "magic bytes"** (les premiers octets du fichier) comme plan de secours

Les "magic bytes", c'est comme une empreinte digitale numérique :
- Tous les fichiers PDF commencent par les octets `%PDF`
- Tous les JPEG commencent par `FF D8 FF`
- Tous les PNG commencent par `89 50 4E 47`

Si quelqu'un renomme un JPEG en `.pdf` pour tromper l'application, les magic bytes révèlent la vérité.

---

### Étape 2 — Pré-analyse et OCR best-effort

L'orchestrateur applique une stratégie adaptée à la source (PDF texte, PDF image, photo):
- Prétraitement OpenCV si nécessaire
- OCR local best-effort pour enrichir le contexte
- Extraction structurée via Gemini

---

### Étape 3 — Gemini : la voie IA structurée

Pour les photos et les PDF non structurés :

**3a — Prétraitement image** (si c'est une photo) :
Le `ImagePreprocessor` améliore la qualité de la photo avant de l'envoyer à l'IA.
Réduire le bruit, augmenter le contraste, affiner les bords… comme un labo photo automatique.

**3b — Envoi à Gemini** :
L'image ou le PDF est envoyé à l'API Gemini d'Google qui lit la facture et retourne les produits structurés.

**3c — Fallback Bytez** :
Si Gemini plante (quota dépassé, erreur réseau), on essaie un deuxième service OCR en secours.
Si même ça échoue → on lève l'erreur.

---

### Étape 4+5 — Sauvegarde en parallèle

C'est là que la magie du `asyncio.gather()` entre en jeu.

Deux tâches qui n'ont pas besoin l'une de l'autre sont lancées **en même temps** :
- Sauvegarder les produits en base de données
- Uploader le PDF original dans le cloud (Storj S3)

Au lieu de faire A puis B (2 secondes), on fait A et B ensemble (1 seconde).
C'est comme passer deux coups de téléphone à la fois.

---

### Étape 6 — Calculer le coût et enregistrer

On calcule combien cet appel a coûté en crédits Gemini :

```
coût = (nombre de tokens utilisés ÷ 1 000 000) × prix au million de tokens
```

Les prix selon le modèle :
| Modèle | Prix / 1M tokens | Usage |
|---|---|---|
| `gemini-3-flash-preview` | 0.10 $ | Rapide, peu cher — usage quotidien |
| `gemini-2.5-flash` | 0.30 $ | Équilibre qualité/prix |
| `gemini-3.1-pro-preview` | 2.50 $ | Maximum de précision |

Puis on enregistre dans `factures` : qui a envoyé quoi, combien ça a coûté, combien de produits.

---

### Étape 7 — Contribution anonyme à la base communautaire

Si l'utilisateur a donné son accord (consentement RGPD explicite) ET précisé sa zone géographique :
les prix sont partagés de façon anonyme dans la base communautaire.

Ton nom, ton compte, ton entreprise — rien n'est transmis.
Seulement : "tel produit coûte X€ en zone ES-CT (Catalogne Espagne) à telle date".

---

### Le résultat final renvoyé

```json
{
  "success": true,
  "filename": "facture_bigmat_jan.pdf",
  "products": [...],
  "products_added": 42,
  "facture_id": 187,
  "fournisseur": "BIGMAT",
  "langue": "ca",
  "tokens_used": 1250,
  "cout_usd": 0.000125,
  "model_used": "gemini-3-flash-preview",
  "pdf_url": "https://..."
}
```

---

## Schéma du pipeline

```
📄 Fichier reçu
     │
     ▼
[1] Détecter type (PDF / Image)
     │
     ├─ PDF ──► [2] Factur-X XML ?
     │               ├─ Oui ──► Extraction directe ✅
     │               └─ Non ──► [3] Gemini IA
     │
     └─ Image ► [3a] Prétraitement OpenCV
                      │
                      ▼
                [3b] Gemini IA
                      │
                      ├─ Succès ──► Résultats ✅
                      └─ Échec  ──► [3c] Bytez fallback
                                         │
                                         ├─ Succès ──► Résultats ✅
                                         └─ Échec  ──► Erreur ❌
                                                │
                                                ▼ (si succès)
                               [4+5] BDD + S3 en parallèle
                                         │
                                         ▼
                               [6] Calcul coût + log facture
                                         │
                                         ▼
                               [7] Contribution communautaire
                                   (si consentement)
```

---

## Peut-on optimiser ce fichier ?

**Oui, 3 points :**

### 1. Imports `CommunityService` et `BytezService` — ✅ traité
Imports remontés en tête de `orchestrator.py` : pas de cycle (`bytez_service` / `community_service` n’importent pas l’orchestrateur).

### 2. Timeout pipeline extraction — ✅ traité
`asyncio.wait_for(..., timeout=Config.GEMINI_TIMEOUT_MS / 1000)` entoure l’appel Gemini et le fallback Bytez (même plafond). Durée par défaut : **180 s** (3 min) — ajustable via `.env`.

### 3. Coûts tokens USD / 1M — ✅ traité
Table par défaut dans `core/config.py` (`_DEFAULT_GEMINI_COST_PER_MILLION`). Surcharge optionnelle : variable **`GEMINI_COST_PER_MILLION_JSON`** (objet JSON `model_id → float`). `Config.cost_per_million_map()` ; `COST_PER_MILLION` reste un alias module pour les tests.
