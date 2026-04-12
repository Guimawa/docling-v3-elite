# test_catalogue_browse.py — Ce qu'on vérifie

**Fichier :** `apps/api/tests/e2e/test_catalogue_browse.py`
**Catégorie :** e2e
**Ce qu'on teste :** Que la page catalogue du frontend s'affiche correctement, que la recherche est accessible et que la navigation depuis la barre de menu fonctionne.

---

## Le code

```python
"""
Tests E2E — navigation catalogue, filtres, recherche.
"""

import re

import pytest
from playwright.sync_api import expect

pytestmark = [pytest.mark.e2e]


def test_catalogue_page_loads_and_search_visible(page, frontend_url):
    """Page /catalogue charge, champ recherche visible."""
    page.goto(f"{frontend_url}/catalogue", wait_until="networkidle")
    expect(page.locator("[data-testid='catalogue-search']")).to_be_visible()
    expect(page).to_have_title(re.compile(r".+"))


def test_catalogue_navigation_from_navbar(page, frontend_url):
    """Navigation Scan → Catalogue via navbar."""
    page.goto(f"{frontend_url}/scan", wait_until="networkidle")
    page.locator("[data-testid='nav-catalogue']").click()
    page.wait_for_url("**/catalogue**", timeout=5000)
    expect(page.locator("[data-testid='catalogue-search']")).to_be_visible()


def test_catalogue_search_filter(page, frontend_url):
    """Recherche dans le catalogue."""
    page.goto(f"{frontend_url}/catalogue", wait_until="networkidle")
    search = page.locator("[data-testid='catalogue-search']")
    search.fill("ciment")
    search.press("Enter")
    page.wait_for_timeout(500)
```

---

## Ce que ces tests vérifient — en clair

**`test_catalogue_page_loads_and_search_visible`**
On ouvre la page `/catalogue` dans un vrai navigateur et on attend que tout soit chargé (pas de requêtes en cours). Ensuite on vérifie deux choses : le champ de recherche est bien visible à l'écran, et la page a bien un titre (n'importe lequel, tant qu'il n'est pas vide). C'est le test de base qui dit "la page s'ouvre sans planter".

**`test_catalogue_navigation_from_navbar`**
On démarre sur la page `/scan`, puis on clique sur le lien "Catalogue" dans la barre de navigation. On vérifie que l'URL change bien vers `/catalogue` (dans les 5 secondes) et que le champ de recherche apparaît. Ce test valide que les liens de navigation fonctionnent vraiment, comme le ferait un utilisateur.

**`test_catalogue_search_filter`**
On va sur `/catalogue`, on tape "ciment" dans le champ de recherche, on appuie sur Entrée, et on attend un demi-seconde. Ce test vérifie que taper dans le champ de recherche ne fait pas planter la page. Note : il ne vérifie pas les résultats affichés, juste que l'action se déroule sans erreur.

---

## Pourquoi c'est important

Sans ces tests, on ne saurait pas si :
- La page catalogue s'affiche vraiment chez l'utilisateur (crash JavaScript silencieux possible)
- Le lien "Catalogue" dans la navbar mène bien au bon endroit
- Le champ de recherche est présent et utilisable

Un bug dans le routing React, un composant qui ne se monte pas, ou un `data-testid` manquant seraient détectés immédiatement.

---

## Peut-on améliorer ces tests ?

- **Le test de recherche est incomplet** : il tape "ciment" mais ne vérifie jamais que des résultats apparaissent (ou que la liste est filtrée). Un vrai test vérifierait que les éléments affichés contiennent bien "ciment".
- **Pas de test avec des données réelles** : le catalogue est peut-être vide dans l'environnement de test, ce qui rend le test de filtrage peu utile.
- **`wait_for_timeout(500)` est fragile** : attendre un temps fixe (500ms) est une mauvaise pratique — mieux vaudrait attendre qu'un élément précis apparaisse ou change.
- **Pas de test sur les filtres par famille** : le catalogue a sûrement des filtres (Maçonnerie, Plomberie, etc.) qui ne sont pas testés ici.
