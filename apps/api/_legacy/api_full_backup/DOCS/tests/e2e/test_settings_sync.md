# test_settings_sync.py — Ce qu'on vérifie

**Fichier :** `apps/api/tests/e2e/test_settings_sync.py`
**Catégorie :** e2e
**Ce qu'on teste :** Que la page des paramètres s'affiche correctement avec la section de synchronisation visible, et que la navigation depuis la barre de menu fonctionne.

---

## Le code

```python
"""
Tests E2E — page Settings, statut watchdog.
"""

import re

import pytest
from playwright.sync_api import expect

pytestmark = [pytest.mark.e2e]


def test_settings_page_loads_and_sync_visible(page, frontend_url):
    """Page /settings charge, section sync visible."""
    page.goto(f"{frontend_url}/settings", wait_until="networkidle")
    expect(page.locator("[data-testid='settings-sync-status']")).to_be_visible()
    expect(page).to_have_title(re.compile(r".+"))


def test_settings_navigation_from_navbar(page, frontend_url):
    """Navigation Scan → Settings via navbar."""
    page.goto(f"{frontend_url}/scan", wait_until="networkidle")
    page.locator("[data-testid='nav-settings']").click()
    page.wait_for_url("**/settings**", timeout=5000)
    expect(page.locator("[data-testid='settings-sync-status']")).to_be_visible()
```

---

## Ce que ces tests vérifient — en clair

**`test_settings_page_loads_and_sync_visible`**
On ouvre directement `/settings` dans un navigateur réel et on attend que la page soit complètement chargée. Ensuite on vérifie deux choses :
1. La section de statut de synchronisation (`settings-sync-status`) est visible à l'écran — c'est l'indicateur qui montre si la connexion avec le backend fonctionne.
2. La page a un titre non vide.

Ce test garantit que la page des paramètres s'ouvre sans crash JavaScript et que l'élément principal est présent.

**`test_settings_navigation_from_navbar`**
On commence sur la page `/scan`, puis on clique sur le lien "Settings" dans la barre de navigation. On vérifie que :
1. L'URL change vers `/settings` dans les 5 secondes.
2. La section de statut de synchronisation est visible après navigation.

Ce test valide que le lien de navigation fonctionne vraiment côté React (routing côté client).

---

## Pourquoi c'est important

La page des paramètres affiche des informations critiques pour l'administrateur : état du watchdog, configuration de la synchronisation, etc. Sans ces tests :
- Un bug dans le composant `SettingsSyncStatus` passerait inaperçu.
- Une route `/settings` cassée ne serait pas détectée avant qu'un utilisateur le signale.
- Un problème de navigation dans la PWA (Progressive Web App) ne serait pas visible.

---

## Peut-on améliorer ces tests ?

- **Très peu de tests pour une page importante** : seulement 2 tests, qui ne vérifient que la présence d'éléments. On pourrait tester que le statut du watchdog affiche bien "actif" ou "inactif" selon l'état du serveur.
- **Pas de test d'interaction** : la page des paramètres permet probablement de modifier des réglages (modèle IA, dossier watchdog, etc.) — aucun de ces cas n'est testé.
- **Pas de test avec utilisateur connecté vs non connecté** : si la page nécessite d'être authentifié, on ne teste pas ce qui se passe quand on y accède sans être connecté (redirection vers login ?).
- **`settings-sync-status` est vague** : on ne vérifie pas le contenu de cet élément, juste qu'il existe. Un statut bloqué sur "Chargement..." passerait le test.
