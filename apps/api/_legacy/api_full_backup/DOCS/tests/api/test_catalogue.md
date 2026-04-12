# test_catalogue.py — Ce qu'on vérifie

**Fichier :** `tests/api/test_catalogue.py`
**Catégorie :** api
**Ce qu'on teste :** Les endpoints du catalogue produits : structure de la réponse, filtres, pagination, enregistrement en lot, liste des fournisseurs, comparaison de prix et historique des prix.

---

## Le code

```python
"""
Tests API — catalogue, batch, fournisseurs, compare, price-history.
"""

import uuid

import httpx
from faker import Faker

fake = Faker("fr_FR")


def test_catalogue_structure(http_client: httpx.Client):
    resp = http_client.get("/api/v1/catalogue")
    assert resp.status_code == 200
    data = resp.json()
    assert "products" in data
    assert "next_cursor" in data or "has_more" in data or "total" in data
    assert isinstance(data["products"], list)


def test_catalogue_with_filters(http_client: httpx.Client):
    resp = http_client.get(
        "/api/v1/catalogue",
        params={"famille": "Maçonnerie", "limit": 10},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "products" in data
    for p in data["products"]:
        assert p.get("famille") == "Maçonnerie"


def test_catalogue_pagination_cursor(http_client: httpx.Client):
    resp1 = http_client.get("/api/v1/catalogue", params={"limit": 2})
    assert resp1.status_code == 200
    data1 = resp1.json()
    products1 = data1.get("products", [])
    if len(products1) < 2:
        return
    cursor = data1.get("next_cursor")
    if cursor:
        resp2 = http_client.get(
            "/api/v1/catalogue",
            params={"limit": 2, "cursor": cursor},
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        ids1 = {p["id"] for p in products1}
        ids2 = {p["id"] for p in data2.get("products", [])}
        assert ids1.isdisjoint(ids2)


def test_batch_save_and_verify_in_catalogue(
    authenticated_client,
    real_db_connection,
):
    client, _ = authenticated_client
    marker = f"batch_test_{uuid.uuid4().hex[:8]}"
    products = [
        {
            "fournisseur": f"{marker}_Fournisseur",
            "designation_raw": f"{marker}_CIMENT 42.5R",
            "designation_fr": f"{marker}_Ciment 42.5R",
            "famille": "Maçonnerie",
            "unite": "sac",
            "prix_brut_ht": 12.50,
            "remise_pct": 10.0,
            "prix_remise_ht": 11.25,
            "prix_ttc_iva21": 13.61,
            "confidence": "high",
        },
    ]
    resp = client.post(
        "/api/v1/catalogue/batch",
        json={"produits": products, "source": "pc"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body.get("saved", 0) >= 1
    assert body.get("total") == 1

    # Vérifier en DB
    if real_db_connection:
        cur = real_db_connection.cursor()
        cur.execute(
            "SELECT designation_fr, prix_remise_ht FROM produits WHERE fournisseur = %s",
            (f"{marker}_Fournisseur",),
        )
        row = cur.fetchone()
        assert row is not None
        assert marker in row[0]
        assert float(row[1]) == 11.25
        cur.execute("DELETE FROM produits WHERE fournisseur = %s", (f"{marker}_Fournisseur",))
        real_db_connection.commit()
        cur.close()


def test_fournisseurs_structure(http_client: httpx.Client):
    resp = http_client.get("/api/v1/catalogue/fournisseurs")
    assert resp.status_code == 200
    data = resp.json()
    assert "fournisseurs" in data
    assert isinstance(data["fournisseurs"], list)


def test_compare_search_too_short_400(http_client: httpx.Client):
    resp = http_client.get("/api/v1/catalogue/compare", params={"search": "a"})
    assert resp.status_code == 400


def test_compare_search_ok(http_client: httpx.Client):
    resp = http_client.get(
        "/api/v1/catalogue/compare",
        params={"search": "ciment", "with_history": "false"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "results" in data
    assert "search" in data


def test_price_history_404_for_invalid_id(http_client: httpx.Client):
    resp = http_client.get("/api/v1/catalogue/price-history/999999999")
    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        assert resp.json().get("history") == []
```

---

## Ce que ces tests vérifient — en clair

**`test_catalogue_structure`**
C'est comme vérifier qu'un annuaire a bien les bonnes colonnes : on s'assure que la réponse contient une liste de produits et au moins une indication de pagination (curseur, flag "il y a plus", ou total). Sans ça, l'interface ne saurait pas comment afficher les données.

**`test_catalogue_with_filters`**
C'est comme filtrer un catalogue papier par catégorie et s'assurer que tous les produits retournés appartiennent bien à cette catégorie. On filtre sur `famille = "Maçonnerie"` et on vérifie chaque produit retourné : si un produit d'une autre famille se glisse dans le résultat, c'est un bug de filtrage.

**`test_catalogue_pagination_cursor`**
C'est comme feuilleter un livre page par page : on demande la page 1 (2 produits), on récupère le "marque-page" (cursor), on demande la page 2 avec ce marque-page, et on vérifie que les produits de la page 2 sont différents de ceux de la page 1. Si les mêmes produits apparaissent deux fois, la pagination est cassée.

**`test_batch_save_and_verify_in_catalogue`**
C'est le test le plus complet ici : on enregistre un produit avec l'API, puis on va directement vérifier en base de données que le produit a bien été créé avec les bonnes valeurs. Le test utilise un marqueur unique (`uuid`) pour identifier sans ambiguïté le produit créé, et fait le ménage après (suppression en DB). C'est comme vérifier qu'une commande passée sur un site est bien arrivée en stock.

**`test_fournisseurs_structure`**
C'est comme vérifier que la liste des marques dans un magasin est bien une liste : l'endpoint doit retourner un objet avec une clé `fournisseurs` contenant un tableau. Ce test est simple mais garantit que l'interface ne recevra pas une structure inattendue.

**`test_compare_search_too_short_400`**
C'est comme une barre de recherche qui refuse les requêtes d'une seule lettre : chercher `"a"` est trop vague et le serveur doit rejeter la demande (400) plutôt que d'effectuer une recherche coûteuse inutile.

**`test_compare_search_ok`**
C'est comme taper "ciment" dans la barre de recherche et s'assurer qu'on reçoit des résultats dans le bon format : la réponse doit contenir les clés `results` et `search`.

**`test_price_history_404_for_invalid_id`**
C'est comme chercher l'historique des prix d'un produit qui n'existe pas : l'API doit soit retourner 404, soit retourner 200 avec une liste vide. Dans les deux cas, elle ne doit pas planter.

---

## Pourquoi c'est important

Sans ces tests, on pourrait :
- Casser la structure de la réponse du catalogue et bloquer toute l'interface utilisateur.
- Introduire un bug de filtrage qui montrerait des produits de la mauvaise catégorie.
- Casser la pagination et afficher les mêmes produits en boucle.
- Avoir un enregistrement en base silencieusement raté (API retourne 200 mais rien n'est sauvegardé).
- Permettre des recherches trop courtes qui surchargent la base de données.

---

## Peut-on améliorer ces tests ?

**Cas non couverts :**
- La recherche par texte dans le catalogue (via un paramètre `search` ou `q`).
- Le tri des produits (par prix, par fournisseur, etc.).
- L'accès à un produit individuel par son `id`.
- La mise à jour d'un produit existant (upsert lors d'un deuxième batch avec le même produit).
- Le comportement du catalogue pour un utilisateur non connecté (le test utilise `http_client` sans auth — est-ce voulu pour toutes les routes ?).

**Tests fragiles :**
- `test_catalogue_pagination_cursor` se termine silencieusement (`return`) si la base a moins de 2 produits. Dans un environnement vide, le test ne vérifie rien mais passe quand même — c'est un faux positif potentiel.
- `test_price_history_404_for_invalid_id` accepte deux comportements différents (200 ou 404), ce qui masque une incohérence de l'API.

**Manques évidents :**
- Pas de nettoyage systématique des données créées en batch (le test `test_batch_save_and_verify_in_catalogue` nettoie, mais seulement si `real_db_connection` est disponible).
- Pas de test de la réponse complète d'un produit (vérifier tous les champs retournés).
