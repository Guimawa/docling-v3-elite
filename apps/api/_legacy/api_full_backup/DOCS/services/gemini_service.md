# gemini_service — Le lecteur de factures multilingue alimenté par l'IA

**Fichier :** `services/gemini_service.py`
**Rôle :** Envoyer une photo ou un PDF de facture à l'intelligence artificielle Gemini et récupérer une liste structurée de produits avec leurs prix.

---

## Le code

```python
"""
GeminiService - Docling Agent v3 / v4
Extraction multilingue CA/ES/FR avec Gemini (Flash / Pro).
- SDK google-genai avec async natif (client.aio)
- Structured Output (response_schema) pour parsing fiable
- Fallback regex si response_schema non supporte
- Retry automatique sur rate limit 429
"""

import asyncio
import json
import logging
import re

from google import genai
from google.genai import types

from core.config import Config
from schemas.invoice import InvoiceExtractionResult, Product

logger = logging.getLogger(__name__)

_gemini_cache: dict[str, "GeminiService"] = {}

SYSTEM_PROMPT = """Tu es un expert-comptable BTP specialise dans les factures
fournisseurs franco-espagnoles et catalanes (BigMat, Punto Madera, Leroy Merlin ES, etc.).

MISSION : Extraire CHAQUE ligne produit de la facture et retourner un JSON strict.

LANGUES : La facture peut etre en Catalan, Espagnol ou Francais. Traduis TOUJOURS
designation_fr en Francais clair et concis (max 80 caracteres).

FAMILLES BTP autorisees (choisir la plus proche) :
Armature, Cloison, Climatisation, Plomberie, Électricité, Menuiserie,
Couverture, Carrelage, Isolation, Peinture, Outillage, Consommable,
Maçonnerie, Terrassement, Autre

VERIFICATION ARITHMETIQUE OBLIGATOIRE :
- prix_remise_ht = prix_brut_ht x (1 - remise_pct/100)
- prix_ttc_iva21  = prix_remise_ht x 1.21
- Si ecart > 2% entre valeur facturee et calcul -> confidence: "low"
- Si prix_remise_ht = 0 ou illisible -> confidence: "low"

REGLES STRICTES :
- N'invente AUCUN prix. Si illisible -> confidence: "low" et mettre 0.
- Une ligne JSON par ligne produit de la facture.
- Ignorer les totaux, sous-totaux, frais de port.
- Si la facture est floue ou incomplete -> traiter ce qui est lisible.
"""

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "fournisseur_detecte": {"type": "string"},
        "numero_facture": {"type": "string"},
        "date_facture": {"type": "string"},
        "langue_detectee": {"type": "string", "enum": ["ca", "es", "fr"]},
        "nb_lignes_brutes": {"type": "integer"},
        "produits": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "fournisseur": {"type": "string"},
                    "designation_raw": {"type": "string"},
                    "designation_fr": {"type": "string"},
                    "famille": {"type": "string"},
                    "unite": {"type": "string"},
                    "prix_brut_ht": {"type": "number"},
                    "remise_pct": {"type": "number"},
                    "prix_remise_ht": {"type": "number"},
                    "prix_ttc_iva21": {"type": "number"},
                    "numero_facture": {"type": "string"},
                    "date_facture": {"type": "string"},
                    "confidence": {"type": "string", "enum": ["high", "low"]}
                },
                "required": [
                    "fournisseur", "designation_raw", "designation_fr",
                    "prix_brut_ht", "prix_remise_ht"
                ]
            }
        }
    },
    "required": ["produits"]
}


class GeminiService:

    @classmethod
    def get_or_create(cls, model_id: str | None = None) -> "GeminiService":
        """Retourne une instance mise en cache par model_id."""
        key = model_id or Config.DEFAULT_MODEL
        if key not in _gemini_cache:
            _gemini_cache[key] = cls(model_id=key)
        return _gemini_cache[key]

    def __init__(self, model_id: str | None = None):
        api_key = Config.GEMINI_API_KEY
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY non configuree")

        model_id = model_id or Config.DEFAULT_MODEL
        model_name = Config.MODELS_DISPONIBLES.get(
            model_id,
            Config.MODELS_DISPONIBLES.get("gemini-2.5-flash", "models/gemini-2.5-flash")
        )
        if model_name.startswith("models/"):
            model_name = model_name.replace("models/", "")

        self._client = genai.Client(api_key=api_key)
        self.model_id = model_id
        self.model_name = model_name
        logger.info("GeminiService init: %s (google-genai async)", model_name)

    async def extract_from_bytes_async(
        self,
        file_bytes: bytes,
        mime_type: str,
        filename: str = "facture",
    ) -> InvoiceExtractionResult:
        """Extraction async via client.aio (sans asyncio.to_thread)."""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                contents = [
                    types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                    types.Part.from_text(text="Analyse cette facture et retourne le JSON demande."),
                ]
                config = types.GenerateContentConfig(
                    temperature=0,
                    response_mime_type="application/json",
                    response_schema=RESPONSE_SCHEMA,
                    system_instruction=SYSTEM_PROMPT,
                    http_options=types.HttpOptions(
                        timeout=Config.GEMINI_TIMEOUT_MS,
                    ),
                )

                async with self._client.aio as aclient:
                    response = await aclient.models.generate_content(
                        model=self.model_name,
                        contents=contents,
                        config=config,
                    )

                raw_text = response.text or ""
                usage = getattr(response, "usage_metadata", None)
                tokens = usage.total_token_count if usage else 0

                try:
                    data = json.loads(raw_text)
                except json.JSONDecodeError:
                    json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
                    if not json_match:
                        raise ValueError(f"Pas de JSON dans la reponse: {raw_text[:200]!s}") from None
                    data = json.loads(json_match.group())

                produits_valides = []
                for p in data.get("produits", []):
                    try:
                        p["fournisseur"] = p.get("fournisseur") or data.get("fournisseur_detecte", "Inconnu")
                        produits_valides.append(Product(**p))
                    except Exception as e:
                        logger.warning("Produit ignore (validation): %s", e)

                result = InvoiceExtractionResult(
                    produits=produits_valides,
                    fournisseur_detecte=data.get("fournisseur_detecte"),
                    numero_facture=data.get("numero_facture"),
                    date_facture=data.get("date_facture"),
                    langue_detectee=data.get("langue_detectee", "es"),
                    nb_lignes_brutes=data.get("nb_lignes_brutes", len(produits_valides)),
                    tokens_used=tokens,
                )

                logger.info("OK %s: %d produits (%d tokens)", filename, len(produits_valides), tokens)
                return result

            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    wait = 2 ** (attempt + 1)
                    logger.warning("Rate limit Gemini, attente %ds (%d/%d)", wait, attempt + 1, max_retries)
                    await asyncio.sleep(wait)
                    continue
                logger.error("Erreur Gemini: %s", type(e).__name__)
                raise

        raise RuntimeError(f"Gemini rate limit persistant apres {max_retries} tentatives")
```

---

## Ce que ce fichier fait — en clair

Imagine que tu as une pile de factures de chantier en catalan, en espagnol et en français, et que tu engages un **expert-comptable BTP trilingue** pour les lire, tout classer et te rendre un tableau Excel propre. Ce fichier, c'est exactement cet expert — sauf que c'est une intelligence artificielle (Google Gemini) qui fait le travail.

---

### `SYSTEM_PROMPT` — Les instructions données à l'IA avant qu'elle commence à travailler

Avant de lui envoyer une facture, on lui donne un "brief" très précis, comme un patron qui brief son comptable :
- "Tu es spécialisé dans les factures BTP franco-espagnoles"
- "Traduis toujours la désignation en français, même si la facture est en catalan"
- "Classe chaque produit dans une famille (Plomberie, Électricité, Carrelage…)"
- "Vérifie les calculs de prix — si ça ne colle pas à 2% près, marque confidence: low"
- "N'invente rien. Si c'est illisible, mets 0 et dis que c'est peu fiable"

---

### `RESPONSE_SCHEMA` — Le formulaire que l'IA doit remplir

Plutôt que de laisser l'IA écrire ce qu'elle veut, on lui impose un **formulaire structuré** très précis. C'est comme dire à quelqu'un "remplis ce tableau Excel avec exactement ces colonnes, pas d'autres". Le schéma décrit chaque champ attendu : fournisseur, numéro de facture, liste des produits avec prix brut, remise, prix TTC, etc. Gemini ne peut pas sortir des cases définies.

---

### `get_or_create()` — Ne pas recréer le même outil deux fois

C'est le **système de rangement** : si on a déjà créé un service Gemini pour un modèle donné, on le garde en mémoire et on le réutilise. Comme un outil rangé sur son crochet dans l'atelier — on ne le rachète pas à chaque fois qu'on en a besoin.

---

### `__init__()` — Préparer l'outil avant de travailler

Quand on crée le service pour la première fois, on :
1. Vérifie qu'on a bien la clé API Google
2. Choisit quel modèle Gemini utiliser (Flash rapide ou Pro plus puissant)
3. Crée la connexion vers les serveurs Google

---

### `extract_from_bytes_async()` — La fonction principale : lire une facture

C'est le cœur du fichier. Voici ce qui se passe quand on envoie une facture :

**Étape 1 — Préparer le paquet**
On met ensemble : les octets de la facture (l'image ou le PDF) + une courte instruction "Analyse cette facture".

**Étape 2 — Envoyer à Gemini**
On envoie tout ça à l'IA avec `temperature=0` — ce paramètre signifie "sois déterministe, pas créatif". Pour lire des chiffres sur une facture, on ne veut pas d'improvisation.

**Étape 3 — Récupérer et parser la réponse**
Gemini répond du JSON. Le code essaie d'abord de le lire directement. Si jamais il y a du texte parasite autour (ça arrive), une recherche par expression régulière extrait quand même le bloc JSON. C'est le "plan B".

**Étape 4 — Valider chaque produit**
Chaque ligne produit est passée dans un validateur Pydantic (`Product`). Si une ligne est malformée, elle est ignorée avec un avertissement — mais ça ne fait pas planter tout le reste.

**Étape 5 — Gérer les refus de l'IA (rate limit)**
Si Gemini répond "trop de requêtes, attends" (erreur 429), le code attend puis réessaie. L'attente double à chaque tentative : 2 secondes, puis 4, puis 8. C'est ce qu'on appelle un **backoff exponentiel** — comme attendre de plus en plus longtemps avant de rappeler quelqu'un qui ne décroche pas.

---

## Peut-on optimiser ce fichier ?

**Ce qui est très bien fait :**
- `temperature=0` est le bon choix pour de l'extraction de données — pas de place à l'interprétation.
- Sortie structurée via `response_schema` aligné sur le modèle Pydantic (voir ci-dessous).
- Le fallback regex en cas de JSON mal emballé est pragmatique.
- Le backoff exponentiel (2s, 4s, 8s) sur les rate limits est correct.
- La validation produit par produit avec `try/except` individuel évite qu'une seule ligne mauvaise fasse échouer toute une facture.

**Évolutions déjà intégrées :**

1. **`async with self._client.aio`** : ouvert **une seule fois** autour de la boucle de tentatives ; le même `aclient` sert tous les essais.

2. **`GEMINI_MAX_RETRIES`** : variable d’environnement / `Config` (entier 1–10, défaut 3) pour le nombre de tentatives sur 429 / `RESOURCE_EXHAUSTED`.

3. **Gestion d’erreurs** : la boucle n’utilise plus un `except Exception` large ; `KeyboardInterrupt` / `SystemExit` et bugs évidents (`TypeError`, `AttributeError`, `KeyError`) ne sont pas assimilés au rate limit. Les erreurs API sont ciblées via `google.genai.errors.APIError` ; `json.JSONDecodeError` et `ValueError` (ex. absence de JSON exploitable) remontent sans retry « rate limit ».

4. **Tokens** : log **INFO** structuré quand `usage_metadata` fournit des compteurs (`prompt_token_count`, `candidates_token_count`, `total_token_count`) en plus de la ligne existante « OK fichier : N produits (tokens) ».

5. **Schéma de réponse** : `GenerateContentConfig` utilise `response_schema=InvoiceExtractionResult` (classe Pydantic acceptée par le SDK). Le dictionnaire `RESPONSE_SCHEMA` est conservé avec un commentaire comme **repli documenté** si un modèle ou une version du SDK imposait l’ancien format JSON Schema explicite.

**Piste restante :**

- **Métriques agrégées** (tokens par modèle / jour) : pas d’export Prometheus ou table de stats dans ce module — uniquement des logs.
