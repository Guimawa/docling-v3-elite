# image_preprocessor — Le développeur photo qui prépare les clichés avant de les envoyer à l'IA

**Fichier :** `services/image_preprocessor.py`
**Rôle :** Nettoyer et améliorer automatiquement les photos de factures prises avec un téléphone avant de les envoyer à Gemini, pour maximiser la qualité de lecture.

---

## Le code

```python
"""
Image Preprocessor — Docling Agent v3
Nettoyage et optimisation des photos mobiles avant envoi à Gemini.
Pipeline : débruitage → contraste CLAHE → redressement → WebP
"""

import logging
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class ImagePreprocessor:

    @staticmethod
    def preprocess_bytes(image_bytes: bytes, filename: str = "image") -> bytes:
        """
        Prend des bytes d'image (JPG/PNG/WebP),
        applique le pipeline de nettoyage,
        retourne des bytes WebP optimisés.
        """
        try:
            # Décoder l'image
            nparr = np.frombuffer(image_bytes, np.uint8)
            img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                logger.warning("Impossible de décoder le fichier image, retour image brute")
                return image_bytes

            # ── 1. Redimensionner si trop grand (max 2500px) ──────
            h, w = img.shape[:2]
            max_dim = 2500
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)),
                                interpolation=cv2.INTER_LANCZOS4)
                logger.debug("Resize: %dx%d → %dx%d", w, h, img.shape[1], img.shape[0])

            # ── 2. Débruitage léger (préserve les textes fins) ────
            img = cv2.fastNlMeansDenoisingColored(img, None, 5, 5, 7, 21)

            # ── 3. Contraste CLAHE sur canal L (Lab) ──────────────
            # Améliore la lisibilité sans saturer les couleurs
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l_ch, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l_ch = clahe.apply(l_ch)
            img = cv2.cvtColor(cv2.merge([l_ch, a, b]), cv2.COLOR_LAB2BGR)

            # ── 4. Légère netteté (unsharp mask) ──────────────────
            gaussian = cv2.GaussianBlur(img, (0, 0), 2.0)
            img = cv2.addWeighted(img, 1.4, gaussian, -0.4, 0)

            # ── 5. Encoder en WebP qualité 90 ─────────────────────
            success, buffer = cv2.imencode(
                ".webp", img, [cv2.IMWRITE_WEBP_QUALITY, 90]
            )
            if not success:
                return image_bytes

            logger.info("✅ Prétraitement OK: %dKo → %dKo", len(image_bytes) // 1024, len(buffer) // 1024)
            return buffer.tobytes()

        except Exception as e:
            logger.error("Erreur prétraitement image: %s", type(e).__name__)
            return image_bytes   # Retour image originale si erreur

    @staticmethod
    def is_image(filename: str) -> bool:
        return Path(filename).suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
```

---

## Ce que ce fichier fait — en clair

Imagine que tu prends une photo d'une facture avec ton téléphone dans un entrepôt mal éclairé. La photo est peut-être un peu floue, le contraste est mauvais, la résolution est énorme. Si tu envoies ça directement à l'IA, elle aura du mal à lire les chiffres. Ce fichier, c'est **le labo photo** qui reçoit ta photo brute et la retouche automatiquement avant de l'envoyer au comptable-IA.

Le tout se fait en 5 étapes successives, comme une chaîne de montage photo.

---

### Étape 1 — Décoder l'image

Les fichiers d'image arrivent sous forme d'une suite d'octets (des données brutes). La première chose à faire, c'est de transformer ces octets en une vraie image que le programme peut manipuler — comme ouvrir un fichier zip pour accéder à son contenu.

Si l'image est corrompue ou dans un format inconnu, on retourne l'original sans rien faire plutôt que de planter.

---

### Étape 2 — Réduire la taille si elle est trop grande (max 2500 pixels)

Les téléphones modernes prennent des photos en 12, 48, voire 108 mégapixels. C'est beaucoup trop pour une facture — Gemini n'a pas besoin de voir chaque grain de papier. Si la photo dépasse 2500 pixels dans sa plus grande dimension, on la réduit proportionnellement. On utilise l'algorithme **Lanczos** pour ça — c'est l'algorithme de redimensionnement le plus qualitatif, celui qui préserve le mieux les petits caractères et les détails fins (comme les chiffres sur une facture).

---

### Étape 3 — Débruiter légèrement

Les photos prises à la volée ont souvent du "bruit" — des pixels parasites qui ressemblent à du grain photographique. L'algorithme utilisé (`fastNlMeansDenoisingColored`) analyse chaque zone de l'image et lisse ce qui ressemble à du bruit tout en préservant les contours nets. C'est réglé de façon conservative (valeur 5) pour ne pas effacer les petits caractères en voulant nettoyer.

---

### Étape 4 — Améliorer le contraste (CLAHE)

C'est l'étape la plus "photo pro" du pipeline. **CLAHE** (Contrast Limited Adaptive Histogram Equalization) améliore le contraste, mais de manière intelligente : il ne traite pas toute l'image d'un seul coup, mais par petites zones de 8×8 pixels. Résultat : si une partie de la facture est sombre (dans l'ombre) et une autre est très claire, les deux parties deviennent lisibles en même temps — sans exploser les zones déjà bien exposées.

Pour faire ça proprement, on convertit l'image du format couleur habituel (BGR, les trois couleurs) en un format séparé où la **luminosité** (canal L) est distinguée des **couleurs** (canaux a et b). On améliore uniquement la luminosité, puis on remet les couleurs — les couleurs ne sont donc pas affectées par cette opération.

---

### Étape 5 — Accentuer la netteté

Cette technique s'appelle **unsharp mask** (masque flou) — un terme venu de la photo argentique. On crée une version volontairement floue de l'image, puis on la soustrait légèrement à l'original. Le résultat, c'est que les contours et les détails nets ressortent davantage. Concrètement : les chiffres et les lettres sur la facture apparaissent plus nets et définis.

---

### Étape 6 — Convertir en WebP qualité 90

On encode le résultat final en **WebP**, un format image moderne qui est plus compact que JPEG à qualité égale. La qualité 90/100 est un bon équilibre : l'image est nette pour l'IA, mais pas ridiculement lourde à transmettre. On logge la taille avant/après pour avoir une idée du gain.

---

### `is_image()` — Vérifier qu'un fichier est bien une image

Simple vérification : on regarde si l'extension du fichier (`.jpg`, `.png`, `.webp`, etc.) est dans la liste des formats images supportés. Un fichier `.pdf` ou `.docx` ne passera pas ici.

---

### Sécurité du pipeline

Si n'importe quelle étape échoue (image corrompue, mémoire insuffisante, format exotique), le code retourne silencieusement l'image originale. L'IA essaiera quand même de lire la facture — peut-être avec moins de précision, mais le traitement ne plante pas.

---

## Peut-on optimiser ce fichier ?

**Ce qui est très bien fait :**
- Le choix CLAHE sur le canal L (Lab) plutôt qu'un simple "equalizeHist" est la bonne approche pour les documents : on améliore la lisibilité sans changer les couleurs.
- L'unsharp mask avec les paramètres actuels (1.4 / -0.4) est bien calibré pour du texte.
- Lanczos pour le redimensionnement est le meilleur algorithme pour préserver les petits caractères.
- Le fallback systématique sur l'image originale en cas d'erreur évite tout blocage.
- Limiter à 2500px est un bon compromis Gemini : assez pour lire les chiffres, pas trop pour les tokens.

**Ce qui pourrait être amélioré :**

1. **`fastNlMeansDenoisingColored` est très lent** — c'est l'étape la plus coûteuse en temps de calcul (typiquement 2 à 5 secondes pour une image de 2500px). Pour une application mobile qui doit répondre vite, c'est problématique. Une alternative plus rapide serait un filtre bilatéral (`cv2.bilateralFilter`) qui offre un débruitage acceptable en quelques dizaines de millisecondes.

2. **Pas de correction de perspective** — les photos de factures prises à la main sont souvent prises en biais. Corriger la perspective (redresser le document) améliorerait significativement la lecture OCR. OpenCV a tout ce qu'il faut pour ça (`cv2.getPerspectiveTransform`), mais ce n'est pas encore implémenté.

3. **Pas de détection d'orientation** — une photo prise à 90° ou 180° n'est pas corrigée. Gemini peut généralement gérer ça, mais une rotation automatique (via la balise EXIF ou une détection de texte) serait plus robuste.

4. **Le `clipLimit=2.0` de CLAHE est codé en dur** — pour les factures très sombres ou très surexposées, un `clipLimit` plus élevé (3.0 ou 4.0) donnerait de meilleurs résultats. Ce paramètre pourrait être configurable ou auto-ajusté selon la luminosité moyenne de l'image.

5. **Pas de test de flou** — si la photo est vraiment trop floue (bougé, mise au point ratée), les étapes de traitement ne peuvent rien faire de significatif. Calculer le score de netteté (`cv2.Laplacian`) avant traitement et avertir l'utilisateur serait utile pour la qualité globale des extractions.

6. **WebP qualité 90 est peut-être trop élevé** — pour l'extraction de texte, une qualité 75-80 suffit amplement et réduit encore plus le poids à transmettre à l'API Gemini (moins de tokens d'image, moins de coût).
