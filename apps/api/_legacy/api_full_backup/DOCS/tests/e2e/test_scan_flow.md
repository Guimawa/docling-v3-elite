# test_scan_flow.py — Ce qu'on vérifie

**Fichier :** `apps/api/tests/e2e/test_scan_flow.py`
**Catégorie :** e2e
**Ce qu'on teste :** Que la page de scan du frontend s'affiche, que la zone de dépôt de fichier est visible, et qu'on peut uploader un PDF et déclencher le traitement.

---

## Le code

```python
"""
Tests E2E — flux scan : upload → validation.
Simulation utilisateur réelle avec Playwright.
"""

import os
import re
import tempfile

import pytest
from playwright.sync_api import expect

pytestmark = [pytest.mark.e2e, pytest.mark.slow]

PDF_MINIMAL = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\nxref\n0 3\n"
    b"trailer<</Size 3/Root 1 0 R>>\nstartxref\n%%EOF"
)


def test_scan_page_loads_and_dropzone_visible(page, frontend_url):
    """Page /scan charge, dropzone visible."""
    page.goto(f"{frontend_url}/scan", wait_until="networkidle")
    expect(page.locator("[data-testid='scan-dropzone']")).to_be_visible()
    expect(page).to_have_title(re.compile(r".+"))


def test_scan_upload_file_and_trigger_processing(page, frontend_url):
    """
    Upload d'un petit PDF via Parcourir, clic sur Lancer.
    Attente du statut Terminé ou Erreur (max 90s).
    """
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(PDF_MINIMAL)
        tmp_path = f.name

    try:
        page.goto(f"{frontend_url}/scan", wait_until="networkidle")

        with page.expect_file_chooser() as fc_info:
            page.locator("[data-testid='scan-upload-btn']").click()
        fc_info.value.set_files(tmp_path)

        page.wait_for_selector(
            "[data-testid='scan-lancer-btn']:not([disabled])", timeout=5000
        )
        page.locator("[data-testid='scan-lancer-btn']").click()

        try:
            page.wait_for_selector(
                ":has-text('Traitement en cours'), "
                ":has-text('Terminé'), "
                ":has-text('Erreur')",
                timeout=10000,
            )
        except Exception:
            pass

        page.wait_for_timeout(2000)
        expect(page.locator("[data-testid='scan-dropzone']")).to_be_visible()
    finally:
        os.unlink(tmp_path)
```

---

## Ce que ces tests vérifient — en clair

**`PDF_MINIMAL`** (constante, pas un test)
C'est un tout petit fichier PDF valide synthétique (quelques dizaines d'octets). Il respecte la structure minimale du format PDF mais ne contient aucune page avec du contenu. Il sert à simuler un upload sans avoir besoin d'une vraie facture.

**`test_scan_page_loads_and_dropzone_visible`**
On ouvre `/scan` dans un navigateur réel, on attend que la page soit complètement chargée (plus de requêtes en cours), puis on vérifie :
1. La zone de dépôt de fichier (`scan-dropzone`) est visible.
2. La page a un titre non vide.

C'est le test de santé de base pour la page de scan.

**`test_scan_upload_file_and_trigger_processing`**
Ce test simule exactement ce que fait un utilisateur :
1. On crée un fichier PDF temporaire sur le disque (le `PDF_MINIMAL`).
2. On ouvre la page `/scan`.
3. On clique sur le bouton "Parcourir" (`scan-upload-btn`) et on intercepte la fenêtre de sélection de fichier.
4. On "sélectionne" notre PDF temporaire via Playwright (sans vraie fenêtre système).
5. On attend que le bouton "Lancer" devienne actif (plus désactivé).
6. On clique sur "Lancer".
7. On attend jusqu'à 10 secondes qu'un texte de statut apparaisse ("Traitement en cours", "Terminé" ou "Erreur").
8. On attend encore 2 secondes, puis on vérifie que la dropzone est toujours visible.
9. Le fichier temporaire est supprimé dans tous les cas (le `finally` garantit le nettoyage).

Ce test ne vérifie pas que l'OCR a bien fonctionné — il vérifie que le flux de l'interface utilisateur se déroule sans planter.

---

## Pourquoi c'est important

La page de scan est le cœur de l'application — c'est par là que passent toutes les factures. Sans ce test :
- Un bug dans le gestionnaire de fichiers JavaScript passerait inaperçu.
- Un bouton "Lancer" qui resterait désactivé après upload ne serait pas détecté.
- Une régression dans le composant de dropzone ne serait pas vue avant que les utilisateurs se plaignent.

Le marqueur `pytest.mark.slow` indique que ce test est plus lent que les autres (il attend des événements UI) et peut être exclu des runs rapides.

---

## Peut-on améliorer ces tests ?

- **Le test d'upload est trop tolérant** : si le bouton "Lancer" reste désactivé ou si aucun statut n'apparaît, le test passe quand même (l'`except Exception: pass` avalé silencieusement). Il faudrait au moins logger l'avertissement.
- **Pas de vérification du résultat** : on ne vérifie pas que des produits apparaissent après l'OCR. Avec un vrai PDF de test, on pourrait vérifier que l'extraction a produit des données.
- **`wait_for_timeout(2000)` fragile** : attendre 2 secondes fixes est une mauvaise pratique — mieux vaudrait attendre qu'un état spécifique soit atteint.
- **Pas de test sur le drag & drop** : la dropzone supporte probablement le glisser-déposer, ce qui n'est pas testé.
- **Pas de test d'erreur volontaire** : envoyer un fichier invalide (un `.txt` renommé en `.pdf`) pour vérifier que le message d'erreur s'affiche correctement.
