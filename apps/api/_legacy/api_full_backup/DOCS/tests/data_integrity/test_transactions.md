# test_transactions.py — Ce qu'on vérifie

**Fichier :** `tests/data_integrity/test_transactions.py`
**Catégorie :** data_integrity
**Ce qu'on teste :** Qu'un envoi en lot contenant des produits valides et un produit invalide ne corrompt pas la base de données — les données restent dans un état cohérent, quoi qu'il arrive.

---

## Le code

```python
"""
Tests d'intégrité — atomicité des transactions.
"""

import uuid


def test_batch_partial_invalid_does_not_corrupt(
    authenticated_client,
    real_db_connection,
):
    """
    Batch avec un produit invalide (fournisseur vide) :
    les produits valides peuvent être insérés (comportement actuel)
    ou aucun (atomicité stricte). On vérifie qu'on n'a pas de corruption.
    """
    client, _ = authenticated_client
    marker = f"tx_test_{uuid.uuid4().hex[:8]}"
    products = [
        {
            "fournisseur": f"{marker}_Valid",
            "designation_raw": f"{marker}_Produit valide",
            "designation_fr": "Produit valide",
            "famille": "Maçonnerie",
            "prix_brut_ht": 10.0,
            "prix_remise_ht": 10.0,
            "prix_ttc_iva21": 12.1,
            "confidence": "high",
        },
        {
            "fournisseur": "",
            "designation_raw": f"{marker}_Invalide",
            "designation_fr": "Invalide",
            "famille": "Autre",
            "prix_brut_ht": 5.0,
            "prix_remise_ht": 5.0,
            "prix_ttc_iva21": 6.05,
            "confidence": "high",
        },
    ]
    resp = client.post(
        "/api/v1/catalogue/batch",
        json={"produits": products, "source": "pc"},
    )
    assert resp.status_code == 200
    saved = resp.json().get("saved", 0)
    assert saved >= 1

    if real_db_connection:
        cur = real_db_connection.cursor()
        cur.execute("SELECT COUNT(*) FROM produits WHERE designation_raw LIKE %s", (f"{marker}%",))
        cur.fetchone()
        cur.execute("DELETE FROM produits WHERE designation_raw LIKE %s", (f"{marker}%",))
        cur.execute("DELETE FROM produits WHERE fournisseur = '' AND designation_raw LIKE %s", (f"%{marker}%",))
        real_db_connection.commit()
        cur.close()
```

---

## Ce que ces tests vérifient — en clair

### `test_batch_partial_invalid_does_not_corrupt`

Ce test simule un cas d'erreur partielle : on envoie deux produits en même temps, dont l'un est clairement invalide (son champ `fournisseur` est une chaîne vide).

**L'analogie :** Imaginez un formulaire de commande où vous ajoutez 5 articles à votre panier. L'un d'eux n'a pas de référence fournisseur. Est-ce que toute la commande est annulée ? Ou les 4 articles valides sont-ils quand même traités ?

**Ce que le test vérifie :**

Le test n'impose pas un comportement unique — il accepte deux comportements légitimes :
- **Comportement "permissif"** : les produits valides sont enregistrés, le produit invalide est ignoré ou mis de côté. C'est le comportement actuel de l'application (`saved >= 1`).
- **Comportement "strict" (atomicité)** : si un seul produit est invalide, rien n'est enregistré — tout ou rien. C'est ce qu'on appelle une transaction atomique.

**Ce que le test ne tolère pas :** une corruption. C'est-à-dire un état intermédiaire incohérent, comme une ligne partiellement écrite, ou un produit invalide (fournisseur vide `""`) qui se retrouverait quand même en base.

**Le nettoyage est doublement prudent :** il supprime à la fois les lignes trouvées via le marqueur, ET les lignes avec `fournisseur = ''` qui pourraient s'être glissées en base malgré l'invalidité.

---

## Pourquoi c'est important

Le mot clé ici est **atomicité** — un concept fondamental des bases de données. Une transaction atomique, c'est comme un interrupteur : soit tout s'allume, soit tout reste éteint. Il n'y a pas d'état où "la moitié des ampoules s'allument".

Sans ce test, on pourrait se retrouver dans des situations dangereuses :

- **Un produit avec `fournisseur = ""`** se retrouve en base. Toutes les requêtes qui filtrent par fournisseur ne le trouveront jamais. Il est "fantôme" — il existe, mais il est invisible pour l'application.
- **Une erreur en milieu de lot** laisse la base dans un état à moitié écrit. Les premiers produits sont enregistrés, les suivants non. L'utilisateur ne sait pas lesquels ont réussi.
- **Les statistiques deviennent fausses** si des produits sans fournisseur s'accumulent en base au fil du temps.

Ce test documente aussi une décision de conception importante : le comportement choisi (permissif ou strict) doit être conscient et testé, pas accidentel.

---

## Peut-on améliorer ces tests ?

**Points forts actuels :**
- Le test est honnête : il documente l'ambiguïté du comportement (`saved >= 1` accepte les deux cas).
- Le nettoyage double est prudent et couvre le cas du produit invalide qui passerait quand même.
- L'UUID garantit l'isolation entre les exécutions.

**Améliorations possibles :**

1. **Le test ne tranche pas.** `saved >= 1` accepte à la fois 1 et 2 comme valeur correcte. Le comportement attendu devrait être documenté et affirmé clairement. Si le choix est "les valides passent, les invalides sont ignorés", alors `saved == 1` serait plus précis. Si c'est "tout ou rien", alors `saved == 0` ou `saved == 2` (avec rejet de l'invalide en amont).

2. **La vérification en base ne fait rien d'utile.** Le résultat du `COUNT(*)` est récupéré (`cur.fetchone()`) mais n'est jamais utilisé dans une assertion. C'est du code mort — on compte mais on ne vérifie pas le résultat du comptage.

3. **On ne vérifie pas que le produit invalide n'est PAS en base.** C'est pourtant l'objectif principal du test. Une assertion `assert invalid_count == 0` renforcerait la valeur du test.

4. **Même problème de nettoyage non garanti** en cas d'échec d'assertion.

5. **D'autres cas d'invalidité mériteraient d'être testés** : `designation_raw` vide, `prix_remise_ht` négatif, `famille` inconnue. Chacun de ces cas peut avoir un comportement différent.
