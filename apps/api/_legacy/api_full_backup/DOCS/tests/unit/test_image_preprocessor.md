# test_image_preprocessor.py — Ce qu'on vérifie

**Fichier :** `apps/api/services/test_image_preprocessor.py`
**Catégorie :** unit
**Ce qu'on teste :** La détection des fichiers image par extension et la transformation des images (compression, redimensionnement, conversion en WebP) avant envoi à Gemini.

---

## Le code

```python
"""Tests pour ImagePreprocessor — zéro mock."""
import cv2
import numpy as np
import pytest

from services.image_preprocessor import ImagePreprocessor


class TestIsImage:
    @pytest.mark.parametrize("filename,expected", [
        ("photo.jpg", True),
        ("scan.jpeg", True),
        ("facture.png", True),
        ("compressed.webp", True),
        ("old.bmp", True),
        ("scan.tiff", True),
        ("facture.pdf", False),
        ("data.json", False),
        ("readme.txt", False),
        ("noext", False),
    ])
    def test_is_image(self, filename, expected):
        assert ImagePreprocessor.is_image(filename) == expected


class TestPreprocessBytes:
    def _make_test_image(self, w=200, h=300) -> bytes:
        img = np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)
        _, buf = cv2.imencode(".jpg", img)
        return buf.tobytes()

    def test_returns_bytes(self):
        img_bytes = self._make_test_image()
        result = ImagePreprocessor.preprocess_bytes(img_bytes, "test.jpg")
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_output_is_webp(self):
        img_bytes = self._make_test_image()
        result = ImagePreprocessor.preprocess_bytes(img_bytes, "test.jpg")
        assert result[:4] == b"RIFF"

    def test_invalid_bytes_returns_original(self):
        garbage = b"not an image at all"
        result = ImagePreprocessor.preprocess_bytes(garbage, "bad.jpg")
        assert result == garbage

    def test_large_image_gets_resized(self):
        img_bytes = self._make_test_image(w=4000, h=3000)
        result = ImagePreprocessor.preprocess_bytes(img_bytes, "large.jpg")
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_png_input(self):
        img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        _, buf = cv2.imencode(".png", img)
        result = ImagePreprocessor.preprocess_bytes(buf.tobytes(), "test.png")
        assert isinstance(result, bytes)
```

---

## Ce que ces tests vérifient — en clair

### TestIsImage — reconnaître une image par son extension

La méthode `is_image` dit simplement "ce fichier est-il une image ?". Ces tests utilisent le mécanisme de `@pytest.mark.parametrize` : une seule fonction de test est exécutée 10 fois avec des données différentes. C'est plus lisible qu'écrire 10 fonctions séparées.

**Extensions reconnues comme images** (`True`) :
- `.jpg` / `.jpeg` : format photo le plus courant
- `.png` : capture d'écran ou scan haute qualité
- `.webp` : format moderne compressé (Google)
- `.bmp` : format Windows ancien
- `.tiff` : format professionnel de haute qualité

**Extensions non reconnues comme images** (`False`) :
- `.pdf` : document PDF (traité différemment)
- `.json` : fichier de données
- `.txt` : fichier texte
- Pas d'extension du tout

### TestPreprocessBytes — traitement des images avant l'OCR

**`_make_test_image()`** (méthode utilitaire, pas un test)
Crée une image synthétique avec `numpy` et `OpenCV` : un tableau de pixels aléatoires encodé en JPEG. Cela permet de créer des images de n'importe quelle taille pour les tests, sans avoir besoin d'images réelles sur le disque.

**`test_returns_bytes`**
Le résultat du traitement doit être des bytes non vides. La vérification la plus basique : la fonction retourne quelque chose d'utilisable.

**`test_output_is_webp`**
Peu importe le format d'entrée (JPEG, PNG...), la sortie doit toujours être en WebP. On le vérifie en regardant les 4 premiers octets : tout fichier WebP commence par `b"RIFF"`. Le WebP est choisi car c'est un format moderne qui compresse mieux le JPEG/PNG, réduisant les coûts d'envoi à Gemini (l'API facture en partie par taille de données).

**`test_invalid_bytes_returns_original`**
Si on passe des données corrompues (pas une image valide), la fonction doit retourner les données originales plutôt que de planter. C'est la tolérance aux pannes : même si le prétraitement échoue, l'application peut quand même tenter l'OCR avec les données brutes.

**`test_large_image_gets_resized`**
Une image de 4000×3000 pixels (12 mégapixels, typique d'un smartphone moderne) doit être traitée sans erreur de mémoire. Elle sera probablement redimensionnée à une résolution plus petite pour ne pas dépasser les limites de l'API Gemini. Le test vérifie juste que ça ne plante pas et retourne quelque chose.

**`test_png_input`**
Un PNG doit aussi être accepté en entrée et converti en WebP. On crée un PNG de 100×100 pixels avec `cv2.imencode(".png", ...)` et on vérifie que la sortie est des bytes valides.

---

## Pourquoi c'est important

La qualité de l'image envoyée à Gemini a un impact direct sur la qualité de l'extraction OCR. Si une photo de facture prise avec un iPhone à 12 mégapixels est envoyée telle quelle, elle :
1. Dépasse les limites de taille de l'API Gemini.
2. Coûte plus cher en tokens.
3. Peut même être refusée.

Le préprocesseur est donc un composant critique. Sans ces tests :
- Un refactoring de l'encodage WebP pourrait casser silencieusement le traitement.
- La gestion des images corrompues pourrait lever une exception et faire échouer tout l'upload.
- Le redimensionnement des grandes images pourrait introduire une perte de qualité excessive qui rendrait l'OCR inutilisable.

---

## Peut-on améliorer ces tests ?

- **On ne vérifie pas que les grandes images sont vraiment redimensionnées** : `test_large_image_gets_resized` vérifie juste que ça ne plante pas, pas que l'image en sortie est plus petite qu'en entrée. On pourrait décoder l'image WebP de sortie et vérifier ses dimensions.
- **Pas de test de la qualité WebP** : on ne vérifie pas que la qualité est réglée à un niveau raisonnable (ni trop dégradée au point de perdre le texte, ni trop haute au point de ne pas compresser).
- **Images synthétiques vs images réelles** : les images créées avec `numpy.random` sont du bruit aléatoire, pas du texte sur fond blanc. Le préprocesseur pourrait avoir des comportements différents (contraste, binarisation...) sur de vraies images de factures.
- **Pas de test HEIC** : les photos iPhone sont souvent en HEIC, mais ce format n'est pas testé ici (il nécessite une lib supplémentaire pour la conversion).
- **Pas de test des transformations intermédiaires** : si le préprocesseur fait des corrections (rotation, amélioration du contraste, etc.), ces transformations ne sont pas testées individuellement.
