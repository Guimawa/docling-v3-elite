# test_constraints.py — Ce qu'on vérifie

**Fichier :** `tests/data_integrity/test_constraints.py`
**Catégorie :** data_integrity
**Ce qu'on teste :** Que la base de données n'accepte jamais deux fois le même produit du même fournisseur — et que si on renvoie le même produit avec un prix mis à jour, il est modifié en place (upsert) plutôt que dupliqué.

---

## Le code

```python
"""
Tests d'intégrité — contrainte UNIQUE(designation_raw, fournisseur).
"""

import uuid


def test_upsert_same_product_no_duplicate(
    authenticated_client,
    real_db_connection,
):
    """Deux batchs avec même (designation_raw, fournisseur) → upsert, pas de doublon."""
    client, _ = authenticated_client
    marker = f"uniq_{uuid.uuid4().hex[:8]}"
    product = {
        "fournisseur": f"{marker}_Fournisseur",
        "designation_raw": f"{marker}_CIMENT 42.5R",
        "designation_fr": "Ciment 42.5R",
        "famille": "Maçonnerie",
        "prix_brut_ht": 12.50,
        "remise_pct": 10.0,
        "prix_remise_ht": 11.25,
        "prix_ttc_iva21": 13.61,
        "confidence": "high",
    }

    resp1 = client.post("/api/v1/catalogue/batch", json={"produits": [product], "source": "pc"})
    assert resp1.status_code == 200
    assert resp1.json().get("saved", 0) >= 1

    product["prix_remise_ht"] = 11.50
    product["prix_ttc_iva21"] = 13.92
    resp2 = client.post("/api/v1/catalogue/batch", json={"produits": [product], "source": "pc"})
    assert resp2.status_code == 200

    if real_db_connection:
        cur = real_db_connection.cursor()
        cur.execute(
            "SELECT COUNT(*) FROM produits WHERE fournisseur = %s AND designation_raw = %s",
            (product["fournisseur"], product["designation_raw"]),
        )
        count = cur.fetchone()[0]
        assert count == 1, f"Doublon détecté : {count} enregistrements"
        cur.execute("DELETE FROM produits WHERE fournisseur = %s", (product["fournisseur"],))
        real_db_connection.commit()
        cur.close()
```

---

## Ce que ces tests vérifient — en clair

### `test_upsert_same_product_no_duplicate`

Ce test simule ce qui arrive quand une nouvelle facture arrive avec un produit déjà connu.

**Le contexte métier :** Un artisan reçoit deux factures du même fournisseur, à deux dates différentes. Le produit "CIMENT 42.5R" est présent sur les deux. Entre les deux factures, le fournisseur a légèrement changé son prix. Que se passe-t-il dans la base ?

**Ce que le test fait :**

**Premier envoi :** On crée un produit avec `prix_remise_ht = 11.25`. L'API répond 200 et confirme qu'au moins un produit a été sauvegardé.

**Deuxième envoi :** On renvoie exactement le même produit (même `fournisseur` et même `designation_raw`), mais avec `prix_remise_ht = 11.50`. C'est un prix mis à jour.

**Vérification en base :** On compte combien de lignes existent dans la table `produits` pour ce couple (fournisseur, designation_raw). La réponse doit être exactement **1**.

Si on obtient 2, c'est un doublon : le même produit existe en deux versions, et le catalogue devient incohérent. L'assertion échoue avec le message `"Doublon détecté : 2 enregistrements"`.

**Ce que "upsert" signifie :** C'est la contraction de "update or insert" — insérer si ça n'existe pas, mettre à jour si ça existe déjà. C'est le comportement attendu ici : la deuxième facture met à jour le prix, elle ne crée pas une deuxième entrée.

La contrainte en base de données qui rend cela possible s'appelle `UNIQUE(designation_raw, fournisseur)` — la combinaison des deux champs doit être unique dans toute la table.

---

## Pourquoi c'est important

Sans ce test, la base de données pourrait se remplir de doublons silencieusement. Chaque nouvelle facture du même fournisseur doublerait les entrées existantes.

Conséquences concrètes :
- **Le catalogue affiche le même produit deux fois** (ou dix fois après dix factures). L'artisan ne sait pas quel prix est le bon.
- **Les statistiques sont faussées** : si on compte les produits ou calcule des moyennes de prix, les doublons gonflent artificiellement les résultats.
- **Les exports CSV contiennent des lignes dupliquées**, ce qui perturbe les logiciels de comptabilité en aval.
- **La base grossit inutilement** : des milliers de lignes identiques consomment de l'espace et ralentissent les requêtes.

Ce test garantit que la contrainte d'unicité est bien respectée et que le mécanisme d'upsert fonctionne correctement.

---

## Peut-on améliorer ces tests ?

**Points forts actuels :**
- Le test couvre exactement le scénario métier réel (même produit, prix mis à jour).
- L'UUID dans le marqueur garantit qu'aucun test ne peut interférer avec un autre.
- Le message d'erreur `"Doublon détecté : {count} enregistrements"` est explicite.

**Améliorations possibles :**

1. **On ne vérifie pas que le prix a bien été mis à jour.** Le test confirme qu'il n'y a qu'une seule ligne, mais ne vérifie pas que c'est bien le nouveau prix `11.50` qui est stocké, et pas l'ancien `11.25`. Il faudrait ajouter : `assert float(row["prix_remise_ht"]) == 11.50`.

2. **Même problème de nettoyage non garanti.** Si l'assertion `count == 1` échoue, le `DELETE` final ne sera jamais exécuté. Un `try/finally` serait plus robuste.

3. **Un seul scénario est testé.** On pourrait aussi tester : que se passe-t-il si on envoie le même produit 10 fois ? 100 fois ? Le comportement doit rester identique.

4. **La partie DB est conditionelle.** Si `real_db_connection` est absent, le test passe sans vérifier l'essentiel (le comptage en base). Le test pourrait être marqué `pytest.skip` explicitement dans ce cas, plutôt que de prétendre avoir tout vérifié.
