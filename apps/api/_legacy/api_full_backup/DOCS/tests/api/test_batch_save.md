# test_batch_save.py — Ce qu'on vérifie

**Fichier :** `tests/api/test_batch_save.py`
**Catégorie :** api
**Ce qu'on teste :** La validation des données lors de l'enregistrement en lot de produits dans le catalogue (trop de produits, champs manquants, prix invalide).

---

## Le code

```python
"""
Tests API — validation batch save (limite produits, prix négatif).
"""


def test_batch_save_too_many_products_422(authenticated_client):
    """BatchSave avec trop de produits (> 500) → 422 avec message clair."""
    client, _ = authenticated_client
    products = [
        {
            "fournisseur": f"Fournisseur_{i}",
            "designation_raw": f"Prod {i}",
            "designation_fr": f"Produit {i}",
        }
        for i in range(501)
    ]
    resp = client.post(
        "/api/v1/catalogue/batch",
        json={"produits": products, "source": "pc"},
    )
    assert resp.status_code == 422


def test_batch_save_missing_required_fields_422(authenticated_client):
    """BatchSave avec champs requis manquants → 422."""
    client, _ = authenticated_client
    products = [
        {
            "fournisseur": "TestFournisseur",
            "designation_raw": "CIMENT 42.5R",
            # designation_fr manquant
        }
    ]
    resp = client.post(
        "/api/v1/catalogue/batch",
        json={"produits": products, "source": "pc"},
    )
    assert resp.status_code == 422


def test_batch_save_negative_price_422(authenticated_client):
    """BatchSave avec prix négatif → 422 (validation Pydantic ge=0)."""
    client, _ = authenticated_client
    products = [
        {
            "fournisseur": "TestFournisseur",
            "designation_raw": "Produit test",
            "designation_fr": "Produit test",
            "famille": "Maçonnerie",
            "prix_brut_ht": -50.0,
            "prix_remise_ht": -50.0,
            "prix_ttc_iva21": -60.5,
            "confidence": "high",
        }
    ]
    resp = client.post(
        "/api/v1/catalogue/batch",
        json={"produits": products, "source": "pc"},
    )
    assert resp.status_code == 422
```

---

## Ce que ces tests vérifient — en clair

**`test_batch_save_too_many_products_422`**
C'est comme limiter le nombre de produits qu'on peut déposer en une seule fois sur un tapis roulant de supermarché : si quelqu'un arrive avec 501 articles en une seule opération (alors que la limite est 500), la caisse refuse l'envoi. Le test vérifie que l'API renvoie bien une erreur 422 (données non valides) et ne tente pas de tout enregistrer.

**`test_batch_save_missing_required_fields_422`**
C'est comme remplir une fiche produit en oubliant le nom en français (champ `designation_fr`) : la fiche est incomplète et doit être refusée. Le test vérifie que le serveur refuse bien (422) plutôt que de créer une entrée avec des données manquantes.

**`test_batch_save_negative_price_422`**
C'est comme essayer de créer une facture avec un prix de -50 euros : ça n'a pas de sens métier. Le test vérifie que la validation Pydantic (la couche qui contrôle les données à l'entrée) bloque bien les prix négatifs et retourne 422.

---

## Pourquoi c'est important

Sans ces tests, on risque :
- **Surcharge base de données** : sans limite, une seule requête pourrait insérer des dizaines de milliers de lignes et bloquer la base.
- **Données corrompues** : des produits sans désignation française rendraient le catalogue inutilisable (l'interface cherche ce champ).
- **Incohérences métier** : des prix négatifs dans le catalogue produiraient des calculs faux dans les devis et les comparatifs.

La validation à l'entrée est la première ligne de défense avant que les données ne touchent la base de données.

---

## Peut-on améliorer ces tests ?

**Cas non couverts :**
- La limite exacte : que se passe-t-il avec exactement 500 produits (la limite) ? Le test ne vérifie que 501. Il faudrait aussi tester que 500 est accepté (cas limite valide).
- Les prix à zéro : `prix_brut_ht: 0.0` est-il accepté ou refusé ? (Le contrainte `ge=0` l'autorise, mais c'est à confirmer.)
- Les chaînes trop longues : un `fournisseur` de 10 000 caractères est-il rejeté ?
- La liste vide : envoyer `{"produits": [], "source": "pc"}` — est-ce accepté ou refusé ?
- Le champ `source` manquant : que se passe-t-il sans ce champ ?

**Tests fragiles :**
- Aucun des trois tests ne vérifie le contenu du message d'erreur 422 — on sait qu'il y a une erreur mais pas si le message est compréhensible pour le client de l'API.

**Manques évidents :**
- Pas de test du cas "nominal avec 1 produit valide" dans ce fichier (il existe dans `test_catalogue.py`, mais l'isolation serait meilleure ici).
- Pas de test pour des types de données incorrects (ex: `prix_brut_ht: "abc"`).
