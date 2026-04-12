# test_database.py — Ce qu'on vérifie

**Fichier :** `tests/integration/test_database.py`
**Catégorie :** integration
**Ce qu'on teste :** Que la couche d'accès à la base de données (`DBManager`) fonctionne correctement avec une vraie base PostgreSQL — sans simulacre, sans bouchon, avec de vraies données qui transitent réellement.

---

## Le code

```python
"""
Tests d'intégration base de données réelle — zéro mock.
Connexion PostgreSQL réelle, CRUD via DBManager.
"""

import os
import uuid

import pytest

# Utiliser la même DB que l'API pour les tests
_db_url = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")


@pytest.fixture
def db_url():
    if not _db_url:
        pytest.skip("TEST_DATABASE_URL ou DATABASE_URL non défini")
    return _db_url


@pytest.mark.asyncio
async def test_upsert_products_batch_real_db(
    real_db_connection,
    sample_products,
):
    """
    Connexion réelle : création de produits via DBManager.upsert_products_batch,
    vérification en DB directe.
    """
    from core.db_manager import DBManager

    # Marquer les produits pour cleanup
    marker = f"test_{uuid.uuid4().hex[:8]}"
    for p in sample_products:
        p["fournisseur"] = f"{marker}_{p['fournisseur'][:30]}"
        p["designation_raw"] = f"{marker}_{p['designation_raw'][:50]}"
        p["designation_fr"] = f"{marker}_{p['designation_fr'][:50]}"

    # S'assurer que le pool utilise la bonne URL
    if not os.getenv("DATABASE_URL") and os.getenv("TEST_DATABASE_URL"):
        os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]

    try:
        await DBManager.get_pool()
    except RuntimeError:
        pytest.skip("DATABASE_URL non définie")

    nb_saved, _ = await DBManager.upsert_products_batch(
        sample_products,
        source="pc",
    )
    assert nb_saved == len(sample_products), f"Attendu {len(sample_products)} sauvegardés, obtenu {nb_saved}"

    # Vérification directe en DB via psycopg2
    conn = real_db_connection
    cur = conn.cursor()
    cur.execute(
        "SELECT id, fournisseur, designation_fr, prix_remise_ht FROM produits WHERE fournisseur LIKE %s",
        (f"{marker}%",),
    )
    rows = cur.fetchall()
    assert len(rows) == len(sample_products), f"Produits non trouvés en DB : {rows}"

    for row, expected in zip(rows, sample_products, strict=True):
        assert row[1] == expected["fournisseur"]
        assert row[2] == expected["designation_fr"]
        assert float(row[3]) == expected["prix_remise_ht"]

    # Cleanup
    cur.execute("DELETE FROM produits WHERE fournisseur LIKE %s", (f"{marker}%",))
    conn.commit()
    cur.close()


@pytest.mark.asyncio
async def test_db_connection_and_simple_query(real_db_connection):
    """Vérifie que la connexion DB fonctionne et que les tables existent."""
    cur = real_db_connection.cursor()
    cur.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('produits', 'factures', 'users')"
    )
    tables = [r[0] for r in cur.fetchall()]
    assert "produits" in tables
    cur.close()
```

---

## Ce que ces tests vérifient — en clair

### `test_upsert_products_batch_real_db`

Ce test vérifie que `DBManager.upsert_products_batch` — la fonction Python qui insère les produits en base — fonctionne réellement avec une vraie base PostgreSQL.

**Pourquoi "zéro mock" c'est important ici ?**
Dans la plupart des tests unitaires, on simule la base de données avec un "mock" (un faux). C'est rapide, mais le mock ne se comporte pas toujours comme la vraie base. Ce test, lui, connecte la vraie base et fait de vraies opérations SQL.

**Ce que le test fait pas à pas :**

1. **Préparation des données :** Les produits de la fixture `sample_products` sont préfixés avec un marqueur UUID unique. Cela permet de les retrouver et les supprimer sans toucher aux autres données.

2. **Initialisation du pool de connexions :** `DBManager.get_pool()` ouvre un pool de connexions asynchrones vers PostgreSQL. Si la variable d'environnement `DATABASE_URL` n'est pas définie, le test est ignoré (`pytest.skip`) plutôt que d'échouer avec une erreur cryptique.

3. **Appel de la vraie fonction :** `upsert_products_batch` est appelée directement — c'est la même fonction que l'API utilise en production. Le résultat `nb_saved` doit correspondre exactement au nombre de produits envoyés.

4. **Vérification indépendante en base :** On interroge la base avec `psycopg2` (une bibliothèque différente de celle utilisée par `DBManager`) pour lire les données enregistrées. On vérifie champ par champ que ce qui est en base correspond à ce qu'on a envoyé.

5. **Nettoyage :** Les lignes de test sont supprimées.

**L'option `strict=True` dans `zip` :** C'est un détail technique important. Sans `strict=True`, si la liste des lignes retournées par la base est plus courte que la liste attendue, Python se contenterait de comparer les éléments disponibles sans signaler l'écart. Avec `strict=True`, si les deux listes n'ont pas la même taille, le test échoue explicitement.

---

### `test_db_connection_and_simple_query`

Ce test vérifie deux choses fondamentales :

1. **La connexion à la base fonctionne.** Si la base est inaccessible (mauvaise URL, problème réseau, base éteinte), ce test échoue immédiatement.

2. **Les tables essentielles existent.** On interroge `information_schema.tables`, qui est le catalogue interne de PostgreSQL listant toutes les tables. On vérifie que la table `produits` est bien présente dans le schéma `public`.

C'est le test de "porte d'entrée" : si celui-ci échoue, tous les autres tests de base de données échoueront aussi, et on sait immédiatement que le problème est structurel (connexion ou schéma), pas fonctionnel.

**Pourquoi ne vérifie-t-on que `produits` et pas `factures` et `users` ?** L'assertion est `assert "produits" in tables`. Les tables `factures` et `users` sont récupérées dans la requête mais ne sont pas vérifiées. C'est un oubli probable (voir section amélioration).

---

## Pourquoi c'est important

Ces tests constituent le filet de sécurité le plus proche du métal. Ils testent non pas ce que l'API expose, mais ce que la couche de persistence fait réellement.

Sans eux :
- On pourrait déployer une version de `DBManager` qui génère silencieusement une erreur SQL, mais l'attrape et retourne `0` au lieu de planter.
- Les migrations Alembic pourraient avoir été appliquées dans un mauvais ordre, laissant certaines tables absentes.
- La connexion à Neon (la base PostgreSQL cloud) pourrait être intermittente, et on ne le découvrirait qu'en production.

Ces tests sont particulièrement précieux dans un contexte cloud (Neon) où la base n'est pas sous le contrôle direct de l'équipe de développement.

---

## Peut-on améliorer ces tests ?

**Points forts actuels :**
- "Zéro mock" est le bon choix pour des tests d'intégration : on teste la vraie chose.
- Le skip automatique si `DATABASE_URL` est absent est élégant — pas d'erreur cryptique.
- `strict=True` dans le `zip` est une bonne pratique qui évite les faux positifs silencieux.

**Améliorations possibles :**

1. **`test_db_connection_and_simple_query` ne vérifie qu'une table sur trois.** On récupère `produits`, `factures`, `users` dans la requête, mais on n'assert que `"produits" in tables`. Les tables `factures` et `users` devraient aussi être vérifiées.

2. **Le nettoyage n'est pas protégé en cas d'échec.** Si l'assertion sur le nombre de lignes échoue, le `DELETE` final n'est jamais exécuté. Un `try/finally` ou une fixture `yield` résoudrait cela.

3. **La vérification ligne par ligne suppose un ordre stable.** `zip(rows, sample_products)` suppose que la base retourne les lignes dans le même ordre que l'insertion. En SQL, l'ordre n'est pas garanti sans `ORDER BY`. On devrait trier ou faire des comparaisons par identifiant.

4. **Le test `test_upsert` est asynchrone mais `real_db_connection` utilise `psycopg2` synchrone.** Ce mélange synchrone/asynchrone peut créer des problèmes de compatibilité selon la configuration de l'event loop pytest.

5. **Aucun test de cas d'erreur.** Que se passe-t-il si la connexion est coupée en milieu de batch ? Si la base est pleine ? Ces scénarios ne sont pas couverts.
