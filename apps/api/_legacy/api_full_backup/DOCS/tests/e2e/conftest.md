# conftest.py (e2e) — Ce qu'on vérifie

**Fichier :** `apps/api/tests/e2e/conftest.py`
**Catégorie :** conftest
**Ce qu'on teste :** Ce fichier ne contient pas de tests — il prépare l'environnement Playwright (navigateur, contexte, page) que tous les tests e2e partagent.

---

## Le code

```python
"""
Fixtures E2E — Playwright centralisé.
Toute la configuration (viewport, locale, headless, timeouts) est ici.
Les tests n'ont qu'à utiliser la fixture `page` ou `browser_context`.
"""

import os

import pytest
from playwright.sync_api import sync_playwright

TEST_FRONTEND_URL = os.getenv("TEST_FRONTEND_URL", "http://localhost:5173")

VIEWPORT = {"width": 1280, "height": 720}
LOCALE = "fr-FR"
HEADLESS = os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() != "false"
DEFAULT_NAV_TIMEOUT = 15_000
DEFAULT_EXPECT_TIMEOUT = 10_000


@pytest.fixture(scope="module")
def frontend_url():
    return TEST_FRONTEND_URL


@pytest.fixture(scope="module")
def browser():
    """Lance un navigateur Chromium partagé pour le module."""
    with sync_playwright() as pw:
        try:
            b = pw.chromium.launch(headless=HEADLESS)
        except Exception as exc:
            pytest.skip(f"Playwright/Chromium non disponible : {exc}", allow_module_level=True)
        yield b
        b.close()


@pytest.fixture(scope="function")
def browser_context(browser):
    """Contexte isolé par test (cookies, storage vierges)."""
    ctx = browser.new_context(
        viewport=VIEWPORT,
        locale=LOCALE,
    )
    ctx.set_default_navigation_timeout(DEFAULT_NAV_TIMEOUT)
    ctx.set_default_timeout(DEFAULT_EXPECT_TIMEOUT)
    yield ctx
    ctx.close()


@pytest.fixture(scope="function")
def page(browser_context):
    """Page prête à l'emploi, nettoyée après chaque test."""
    p = browser_context.new_page()
    yield p
    p.close()
```

---

## Ce que chaque fixture prépare

**Constantes de configuration**
Avant même les fixtures, le fichier définit des valeurs par défaut :
- `TEST_FRONTEND_URL` : l'adresse du frontend React (par défaut `http://localhost:5173`, le port de Vite en dev). Peut être changé via une variable d'environnement pour les tests en CI.
- `VIEWPORT` : la taille de la fenêtre du navigateur simulé (1280×720, taille d'un écran d'ordinateur standard).
- `LOCALE` : la langue du navigateur simulé (`fr-FR`), ce qui permet de tester les textes en français.
- `HEADLESS` : si `true` (valeur par défaut), le navigateur tourne en arrière-plan sans fenêtre visible. Mettre `PLAYWRIGHT_HEADLESS=false` permet de voir le navigateur pendant les tests (utile pour déboguer).
- `DEFAULT_NAV_TIMEOUT` : temps maximum d'attente pour qu'une page se charge (15 secondes).
- `DEFAULT_EXPECT_TIMEOUT` : temps maximum d'attente pour qu'un élément apparaisse (10 secondes).

**`frontend_url`** (scope: module)
Retourne simplement l'URL du frontend. Le scope `module` signifie que cette valeur est calculée une seule fois par fichier de test, et partagée entre tous les tests du même fichier. Les tests l'utilisent pour construire leurs URLs : `f"{frontend_url}/scan"`.

**`browser`** (scope: module)
Lance un vrai navigateur Chromium (le même moteur que Google Chrome). Le scope `module` signifie qu'un seul navigateur est ouvert pour tout le fichier de test — c'est plus rapide que d'ouvrir/fermer un navigateur à chaque test. Si Chromium n'est pas installé, tous les tests du module sont ignorés automatiquement (`pytest.skip`) plutôt que d'échouer avec une erreur incompréhensible.

**`browser_context`** (scope: function)
Crée un "contexte" de navigation isolé pour chaque test. Un contexte, c'est comme une fenêtre de navigation privée : cookies vides, localStorage vide, historique vide. Cela garantit que les tests ne s'influencent pas entre eux (si le test 1 se connecte, le test 2 repart de zéro). Les timeouts par défaut sont appliqués ici.

**`page`** (scope: function)
Crée un onglet (une page) dans le contexte. C'est l'objet que les tests utilisent directement pour naviguer, cliquer, remplir des formulaires, etc. La page est fermée proprement après chaque test.

---

## Pourquoi c'est important

Sans ce fichier, chaque test e2e devrait lancer et fermer son propre navigateur, configurer ses timeouts et gérer les erreurs si Chromium est absent. Ce fichier centralise toute la configuration pour que les tests restent simples et lisibles. Il applique aussi le principe d'isolation : chaque test repart d'un état propre, ce qui évite les faux positifs ou négatifs causés par des données résiduelles.

---

## Peut-on améliorer ces fixtures ?

- **Pas de gestion de l'authentification** : si la plupart des tests nécessitent d'être connecté, il faudrait une fixture `authenticated_page` qui ferait le login une fois et réutiliserait le cookie de session. Actuellement, chaque test doit gérer l'auth lui-même (ou les pages sont accessibles sans auth).
- **Un seul navigateur (Chromium)** : en production, les utilisateurs peuvent utiliser Firefox ou Safari. On ne teste pas ces navigateurs.
- **Pas de capture d'écran en cas d'échec** : une pratique courante est de prendre une capture d'écran automatiquement quand un test e2e échoue, pour faciliter le diagnostic. Ce n'est pas implémenté ici.
- **Pas de rapport de trace Playwright** : Playwright peut enregistrer une "trace" vidéo des actions effectuées. Ce serait utile pour déboguer les tests qui échouent en CI.
