# test_orchestrator.py — Ce qu'on vérifie

**Fichier :** `apps/api/core/test_orchestrator.py`
**Catégorie :** unit
**Ce qu'on teste :** La détection automatique du type de fichier (MIME type) à partir du nom de fichier ou du contenu binaire, et la cohérence du tableau des coûts des modèles IA.

---

## Le code

```python
"""Tests pour Orchestrator (detect_mime + logique pipeline) — zéro mock."""
from core.orchestrator import COST_PER_MILLION, Orchestrator


class TestDetectMime:
    def test_pdf_by_extension(self):
        assert Orchestrator._detect_mime("facture.pdf", b"") == "application/pdf"

    def test_jpg_by_extension(self):
        assert Orchestrator._detect_mime("photo.jpg", b"") == "image/jpeg"

    def test_jpeg_by_extension(self):
        assert Orchestrator._detect_mime("photo.jpeg", b"") == "image/jpeg"

    def test_png_by_extension(self):
        assert Orchestrator._detect_mime("scan.png", b"") == "image/png"

    def test_webp_by_extension(self):
        assert Orchestrator._detect_mime("img.webp", b"") == "image/webp"

    def test_heic_by_extension(self):
        assert Orchestrator._detect_mime("photo.heic", b"") == "image/heic"

    def test_pdf_by_magic_bytes(self):
        assert Orchestrator._detect_mime("noext", b"%PDF-1.4 blah") == "application/pdf"

    def test_jpeg_by_magic_bytes(self):
        assert Orchestrator._detect_mime("noext", b"\xff\xd8\xff\xe0rest") == "image/jpeg"

    def test_png_by_magic_bytes(self):
        assert Orchestrator._detect_mime("noext", b"\x89PNG\r\n\x1a\nrest") == "image/png"

    def test_unknown_defaults_to_jpeg(self):
        assert Orchestrator._detect_mime("unknown.xyz", b"\x00\x01\x02") == "image/jpeg"

    def test_case_insensitive_extension(self):
        assert Orchestrator._detect_mime("FILE.PDF", b"") == "application/pdf"
        assert Orchestrator._detect_mime("PHOTO.JPG", b"") == "image/jpeg"

    def test_no_extension(self):
        assert Orchestrator._detect_mime("justname", b"random") == "image/jpeg"


class TestCostCalculation:
    def test_cost_per_million_keys(self):
        assert "gemini-3-flash-preview" in COST_PER_MILLION
        assert "gemini-2.5-flash" in COST_PER_MILLION
        assert "gemini-3.1-pro-preview" in COST_PER_MILLION

    def test_cost_values_positive(self):
        for model, cost in COST_PER_MILLION.items():
            assert cost > 0, f"{model} has non-positive cost"

    def test_flash_cheaper_than_pro(self):
        assert COST_PER_MILLION["gemini-3-flash-preview"] < COST_PER_MILLION["gemini-3.1-pro-preview"]
```

---

## Ce que ces tests vérifient — en clair

### TestDetectMime — détection du type de fichier

Quand un utilisateur uploade un fichier, l'application doit savoir si c'est un PDF ou une image pour le traiter correctement. La méthode `_detect_mime` prend le nom du fichier et son contenu binaire.

**Détection par extension (7 tests)**
Si le fichier a une extension connue (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`), l'extension est prioritaire. Le contenu binaire est ignoré (`b""`). Cela couvre les cas normaux où l'utilisateur uploade un fichier bien nommé.

**`test_heic_by_extension`** : HEIC est le format photo d'Apple (iPhone). Les utilisateurs mobiles uploadent souvent des HEIC, il faut les reconnaître.

**Détection par "magic bytes" (3 tests)**
Quand le fichier n'a pas d'extension (ou une extension inconnue), on regarde les premiers octets du contenu — c'est la "signature magique" du format :
- PDF commence toujours par `%PDF`
- JPEG commence toujours par `\xff\xd8\xff`
- PNG commence toujours par `\x89PNG`

**`test_unknown_defaults_to_jpeg`**
Un fichier avec une extension inconnue (`.xyz`) et un contenu non reconnu est traité comme JPEG par défaut. C'est un choix pragmatique — mieux vaut essayer de traiter l'image plutôt que de rejeter.

**`test_case_insensitive_extension`**
`FILE.PDF` et `file.pdf` doivent être traités identiquement. Les majuscules dans les extensions existent dans la pratique (certains appareils photo génèrent des fichiers en `.JPG`).

**`test_no_extension`**
Un fichier sans point dans le nom est traité comme JPEG par défaut.

### TestCostCalculation — tableau des coûts IA

L'application calcule le coût de chaque extraction OCR pour afficher à l'utilisateur combien il dépense en tokens Gemini.

**`test_cost_per_million_keys`**
Vérifie que les modèles importants sont dans le dictionnaire de coûts : `gemini-3-flash-preview`, `gemini-2.5-flash`, et `gemini-3.1-pro-preview`. Si on ajoute un nouveau modèle sans l'ajouter au dictionnaire de coûts, ce test l'attrape.

**`test_cost_values_positive`**
Vérifie qu'aucun modèle n'a un coût nul ou négatif. Un coût à zéro signifierait que l'application afficherait "0€" pour toutes les extractions, ce qui est faux.

**`test_flash_cheaper_than_pro`**
Vérifie que le modèle Flash (rapide, moins puissant) coûte moins cher que le modèle Pro (lent, plus puissant). C'est une cohérence métier : si les prix sont inversés, l'affichage des coûts serait trompeur.

---

## Pourquoi c'est important

La détection MIME est le premier filtre du pipeline OCR. Une erreur ici signifie qu'un PDF serait traité comme une image (ou vice-versa), ce qui ferait échouer l'extraction Gemini ou donnerait des résultats incorrects. Sur mobile, les photos de factures arrivent en HEIC ou WEBP — si ces formats ne sont pas reconnus, les artisans ne pourraient pas scanner leurs factures avec leur iPhone.

Les coûts IA sont importants pour la transparence avec les utilisateurs et pour le suivi des dépenses API.

---

## Peut-on améliorer ces tests ?

- **Pas de test du cas PDF avec contenu JPEG** : que se passe-t-il si un fichier s'appelle `facture.pdf` mais que son contenu commence par `\xff\xd8\xff` (JPEG) ? L'extension prime-t-elle toujours ?
- **Pas de test pour BMP, TIFF** : ces formats d'image existent mais ne sont pas testés. Sont-ils supportés ?
- **`test_unknown_defaults_to_jpeg` pourrait être dangereux** : si un utilisateur uploade un fichier malveillant avec une extension inconnue, il sera traité comme image JPEG. Il n'y a pas de test vérifiant que cela est géré de façon sécurisée.
- **Les coûts hardcodés dans les tests** : si les prix de l'API Gemini changent et que le dictionnaire est mis à jour, les tests passeront toujours car on ne compare pas à des valeurs précises (seulement "Flash < Pro").
- **Pas de test du calcul de coût réel** : la fonction qui calcule le coût d'une extraction à partir du nombre de tokens utilisés n'est pas testée ici.
