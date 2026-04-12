# test_api_db_coherence.py — Ce qu'on vérifie

**Fichier :** `tests/data_integrity/test_api_db_coherence.py`
**Catégorie :** data_integrity
**Ce qu'on teste :** Que ce que l'API renvoie correspond exactement à ce qui est stocké en base de données — pas de déformation, pas de perte de données entre l'écriture et la lecture.

---

## Le code

```python
"""
Tests d'intégrité — cohérence API ↔ DB.
"""

import uuid


def test_batch_then_catalogue_matches_db(
    authenticated_client,
    real_db_connection,
):
    """Création via batch → GET catalogue → données identiques à la DB."""
    client, _ = authenticated_client
    marker = f"coh_{uuid.uuid4().hex[:8]}"
    product = {
        "fournisseur": f"{marker}_Fournisseur",
        "designation_raw": f"{marker}_Produit cohérence",
        "designation_fr": "Produit test cohérence",
        "famille": "Plomberie",
        "unite": "m",
        "prix_brut_ht": 25.50,
        "remise_pct": 5.0,
        "prix_remise_ht": 24.23,
        "prix_ttc_iva21": 29.32,
        "confidence": "high",
    }

    resp = client.post("/api/v1/catalogue/batch", json={"produits": [product], "source": "pc"})
    assert resp.status_code == 200

    cat = client.get("/api/v1/catalogue", params={"fournisseur": product["fournisseur"]})
    assert cat.status_code == 200
    products = cat.json().get("products", [])
    found = [p for p in products if p.get("fournisseur") == product["fournisseur"]]
    assert len(found) >= 1
    api_product = found[0]

    assert api_product["designation_fr"] == product["designation_fr"]
    assert float(api_product["prix_remise_ht"]) == product["prix_remise_ht"]
    assert api_product["famille"] == product["famille"]

    if real_db_connection:
        cur = real_db_connection.cursor()
        cur.execute(
            "SELECT designation_fr, prix_remise_ht, famille FROM produits WHERE fournisseur = %s",
            (product["fournisseur"],),
        )
        row = cur.fetchone()
        assert row is not None
        assert row[0] == product["designation_fr"]
        assert float(row[1]) == product["prix_remise_ht"]
        assert row[2] == product["famille"]
        cur.execute("DELETE FROM produits WHERE fournisseur = %s", (product["fournisseur"],))
        real_db_connection.commit()
        cur.close()
```

---

## Ce que ces tests vérifient — en clair

### `test_batch_then_catalogue_matches_db`

Ce test suit le chemin complet d'un produit, de l'entrée jusqu'à la sortie, en trois étapes :

**Étape 1 — Écrire un produit via l'API.**
On envoie un produit fictif (avec un nom unique généré aléatoirement grâce à `uuid4`) à la route `/api/v1/catalogue/batch`. C'est la porte d'entrée normale : c'est comme ça qu'une facture scannée ajoute ses produits au catalogue.

Le nom unique (`marker`) est important : il permet de retrouver exactement ce produit parmi tous ceux déjà en base, et de ne pas confondre avec d'autres données de test.

**Étape 2 — Relire via l'API et comparer.**
On appelle `/api/v1/catalogue` pour récupérer le produit qu'on vient d'envoyer. On vérifie que les champs essentiels sont identiques : la désignation en français, le prix remisé HT, et la famille de produit.

C'est comme écrire un message dans une boîte aux lettres, puis ouvrir la boîte et vérifier que le message est intact.

**Étape 3 — Vérifier directement en base de données (si disponible).**
Si une vraie connexion PostgreSQL est accessible, on va chercher le produit directement dans la table `produits` — en contournant complètement l'API. On compare à nouveau les mêmes champs.

Cela élimine tout risque que l'API "mente" : elle pourrait théoriquement afficher autre chose que ce qu'elle a enregistré. Ici, on vérifie la source de vérité absolue.

**Nettoyage final :** le produit de test est supprimé de la base pour ne pas polluer les données.

---

## Pourquoi c'est important

Sans ce test, on pourrait avoir une situation silencieuse et catastrophique : l'API accepte un produit, répond "200 OK", mais en réalité enregistre des données tronquées, arrondies différemment, ou stocke dans la mauvaise colonne.

Cas concrets qui peuvent arriver sans ce test :
- Un prix `24.23` est enregistré `24.2` à cause d'une conversion de type non maîtrisée.
- La désignation française est écrite dans le champ `designation_raw` par erreur de mapping.
- L'API lit les données depuis un cache qui n'a pas été mis à jour, et affiche des valeurs obsolètes.

Dans un outil de gestion de prix pour le BTP, une erreur sur un prix peut fausser tous les devis générés en aval. Ce test garantit que ce qu'on voit dans l'interface est bien ce qui est stocké.

---

## Peut-on améliorer ces tests ?

**Points forts actuels :**
- Le marqueur UUID garantit l'isolation : chaque exécution de test est indépendante.
- La vérification en trois niveaux (écriture → API → DB directe) est solide.
- Le nettoyage en fin de test évite la pollution des données.

**Améliorations possibles :**

1. **Le nettoyage n'est pas garanti en cas d'échec.** Si le test plante avant d'atteindre le `DELETE`, le produit de test reste en base. On pourrait utiliser un `try/finally` ou un `pytest.fixture` avec `yield` pour s'assurer que le nettoyage se fait même quand le test échoue.

2. **On ne vérifie que trois champs sur les dix envoyés.** Des champs comme `unite`, `remise_pct`, `prix_brut_ht` ou `prix_ttc_iva21` ne sont pas vérifiés en retour. Un bug sur l'un d'eux passerait inaperçu.

3. **Le test dépend de la disponibilité d'une vraie connexion DB.** Si `real_db_connection` est absent, la partie la plus solide (vérification directe en base) est silencieusement ignorée. Ce n'est pas un échec explicite.

4. **Un seul produit est testé.** Tester avec plusieurs produits simultanément renforcerait la confiance sur le comportement en lot.
