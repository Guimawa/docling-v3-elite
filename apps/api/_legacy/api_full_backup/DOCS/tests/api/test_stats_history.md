# test_stats_history.py — Ce qu'on vérifie

**Fichier :** `tests/api/test_stats_history.py`
**Catégorie :** api
**Ce qu'on teste :** Les endpoints de statistiques globales du catalogue et d'historique des scans de factures : structure des réponses, respect de la limite maximale, et gestion des ressources inexistantes.

---

## Le code

```python
"""
Tests API — stats, history.
"""

import httpx


def test_stats_structure(http_client: httpx.Client):
    resp = http_client.get("/api/v1/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_produits" in data
    assert "total_fournisseurs" in data
    assert "total_familles" in data or "familles" in data


def test_history_structure(http_client: httpx.Client):
    resp = http_client.get("/api/v1/history", params={"limit": 10})
    assert resp.status_code == 200
    data = resp.json()
    assert "history" in data
    assert "total" in data
    assert isinstance(data["history"], list)


def test_history_limit_max_200(http_client: httpx.Client):
    resp = http_client.get("/api/v1/history", params={"limit": 500})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["history"]) <= 200


def test_history_pdf_404_for_invalid_id(http_client: httpx.Client):
    resp = http_client.get("/api/v1/history/999999999/pdf")
    assert resp.status_code == 404
```

---

## Ce que ces tests vérifient — en clair

**`test_stats_structure`**
C'est comme demander un tableau de bord à un directeur d'entrepôt et vérifier qu'il contient bien les indicateurs essentiels. On appelle `/stats` et on s'assure que la réponse indique le nombre total de produits, de fournisseurs et de familles (catégories). Si un de ces chiffres disparaît, le tableau de bord de l'interface sera cassé.

**`test_history_structure`**
C'est comme consulter le journal des livraisons : on s'assure que l'historique des factures scannées est bien une liste, accompagnée d'un compteur total. La structure est vérifiée pour garantir que l'interface peut afficher cet historique correctement.

**`test_history_limit_max_200`**
C'est une protection contre la surcharge : même si quelqu'un demande les 500 derniers scans, l'API ne doit jamais en retourner plus de 200. C'est comme un serveur de restaurant qui refuse d'apporter plus de 200 plats à la fois même si on en commande 500. Sans cette limite, une requête mal formulée pourrait retourner des milliers de lignes et ralentir à la fois le serveur et l'interface.

**`test_history_pdf_404_for_invalid_id`**
C'est comme demander à voir la facture originale d'une livraison passée avec un numéro de bon qui n'existe pas : le serveur doit répondre "pas trouvé" (404) plutôt que de planter ou de retourner des données incorrectes.

---

## Pourquoi c'est important

Sans ces tests :
- Un changement de structure dans la réponse `/stats` (renommer `total_familles` en `familles_count`) casserait silencieusement le tableau de bord sans alerte.
- Sans plafond de pagination, une demande avec `limit=10000` pourrait retourner des mégaoctets de données et saturer la mémoire du serveur ou du navigateur.
- Un mauvais ID d'historique qui fait planter le serveur (500) plutôt que retourner 404 serait une régression grave.

---

## Peut-on améliorer ces tests ?

**Cas non couverts :**
- La valeur des statistiques : on vérifie que les clés existent, mais pas que les chiffres sont cohérents (ex: `total_produits` devrait être >= 0 et un entier).
- Le comportement avec `limit=0` ou `limit=-1` : est-ce refusé ou retourne-t-il des résultats par défaut ?
- Le filtre par date dans l'historique : on peut probablement filtrer les scans par plage de dates — ce cas n'est pas testé.
- Le contenu d'une entrée d'historique : quels champs contient chaque élément de la liste `history` ? On ne le vérifie pas.
- L'accès au PDF d'un vrai historique : `test_history_pdf_404_for_invalid_id` teste l'ID invalide, mais pas qu'un ID valide retourne bien un PDF.

**Tests fragiles :**
- `test_stats_structure` accepte soit `"total_familles"` soit `"familles"` comme clé. Cette ambiguïté suggère que le schéma de réponse n'est pas encore stabilisé.

**Manques évidents :**
- Pas de test de pagination dans l'historique (page 1, page 2…).
- Pas de test de tri (par date, par fournisseur, etc.).
- Le `/stats` ne semble pas protégé par authentification (utilise `http_client` sans token) — est-ce intentionnel ? Ce n'est pas vérifié explicitement.
