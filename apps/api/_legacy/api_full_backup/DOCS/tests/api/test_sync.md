# test_sync.py — Ce qu'on vérifie

**Fichier :** `tests/api/test_sync.py`
**Catégorie :** api
**Ce qu'on teste :** Que l'endpoint de statut du service watchdog (synchronisation automatique de dossier) répond correctement et retourne une structure reconnaissable.

---

## Le code

```python
"""
Tests API — statut sync watchdog.
"""

import httpx


def test_sync_status_structure(http_client: httpx.Client):
    resp = http_client.get("/api/v1/sync/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "active" in data or "folder" in data or "last_file" in data
```

---

## Ce que ces tests vérifient — en clair

**`test_sync_status_structure`**
C'est comme vérifier le panneau d'état d'une machine dans une usine : on appelle l'endpoint de statut du watchdog (le service qui surveille un dossier pour détecter de nouveaux PDF) et on s'assure qu'il répond (code 200) avec au moins l'une des informations utiles : est-il actif (`active`), quel dossier surveille-t-il (`folder`), ou quel est le dernier fichier détecté (`last_file`).

Le watchdog est le service qui permet de déposer des factures dans un dossier partagé et de les traiter automatiquement — sans avoir à passer par l'interface manuelle.

---

## Pourquoi c'est important

Le watchdog est une fonctionnalité utilisée par les artisans qui travaillent sur PC : ils peuvent déposer des PDFs dans un dossier et l'API les détecte automatiquement. Si ce service tombe en panne sans que personne ne le remarque, les factures s'accumulent sans être traitées.

Avoir au minimum un test de structure permet de détecter rapidement si l'endpoint disparaît ou casse lors d'une mise à jour.

---

## Peut-on améliorer ces tests ?

**C'est le fichier de test le plus minimal de toute la suite** — il ne contient qu'une seule fonction avec une seule vérification très souple.

**Cas non couverts :**
- L'activation et la désactivation du watchdog (si ces opérations existent via API).
- La configuration du dossier surveillé : peut-on changer le dossier via l'API ? Est-ce protégé ?
- Le comportement quand le dossier configuré n'existe pas.
- La liste des fichiers en attente de traitement.
- L'état détaillé du watchdog : depuis combien de temps tourne-t-il, combien de fichiers a-t-il traités, y a-t-il des erreurs ?

**Tests fragiles :**
- La condition `"active" in data or "folder" in data or "last_file" in data` est très permissive : si l'endpoint retourne `{"active": false}` parce que le watchdog est arrêté, le test passe quand même. On ne sait pas si le service fonctionne, seulement qu'il répond.

**Manques évidents :**
- Un seul test pour tout un service critique. Il faudrait au moins :
  - Vérifier le type des champs (`active` doit être un booléen, pas une chaîne).
  - Tester que le statut change quand le watchdog est actif vs inactif.
  - Vérifier l'accès : cet endpoint doit-il être protégé par authentification ? Le test utilise `http_client` sans token, ce qui suggère qu'il est public.
