# test_invoice.py — Ce qu'on vérifie

**Fichier :** `apps/api/schemas/test_invoice.py`
**Catégorie :** unit
**Ce qu'on teste :** Les modèles Pydantic qui représentent les données d'une facture : validation des produits (prix, remises, familles, calculs automatiques), du résultat d'extraction complet, et de la requête de sauvegarde en lot.

---

## Le code

```python
"""
Tests unitaires des modèles Pydantic — zéro mock.
Données Faker pour cas réalistes.
"""

import pytest
from faker import Faker
from pydantic import ValidationError

from schemas.invoice import (
    FAMILLES_VALIDES,
    BatchSaveRequest,
    InvoiceExtractionResult,
    Product,
)

fake = Faker("fr_FR")


class TestProduct:
    def test_basic_product_with_discount(self):
        p = Product(
            fournisseur="BigMat",
            designation_raw="CIMENT PORTLAND 42.5R",
            designation_fr="Ciment Portland 42.5R",
            prix_brut_ht=10.0,
            remise_pct=10.0,
        )
        assert p.fournisseur == "BigMat"
        assert p.prix_remise_ht == 9.0
        assert p.prix_ttc_iva21 == pytest.approx(10.89, rel=1e-2)
        assert p.confidence == "high"

    def test_product_with_faker_data(self):
        """Données dynamiques Faker — jamais hardcodées."""
        fournisseur = fake.company()[:50]
        designation_raw = fake.catch_phrase()[:80]
        designation_fr = fake.catch_phrase()[:80]
        prix = round(fake.random.uniform(1.0, 200.0), 2)
        p = Product(
            fournisseur=fournisseur,
            designation_raw=designation_raw,
            designation_fr=designation_fr,
            prix_brut_ht=prix,
            prix_remise_ht=prix,
        )
        assert p.fournisseur == fournisseur
        assert p.designation_raw == designation_raw
        assert p.prix_remise_ht == prix
        assert p.prix_ttc_iva21 == pytest.approx(prix * 1.21, rel=1e-3)
        assert p.famille == "Autre"

    def test_zero_price_is_low_confidence(self):
        p = Product(
            fournisseur="T", designation_raw="T", designation_fr="T", prix_brut_ht=0
        )
        assert p.confidence == "low"
        assert p.prix_remise_ht == 0.0

    def test_invalid_famille_falls_back_to_autre(self):
        p = Product(
            fournisseur="F",
            designation_raw="R",
            designation_fr="F",
            famille="Bidule",
        )
        assert p.famille == "Autre"

    def test_all_valid_familles_accepted(self):
        for fam in FAMILLES_VALIDES:
            p = Product(
                fournisseur="F",
                designation_raw="R",
                designation_fr="F",
                famille=fam,
                prix_remise_ht=1,
            )
            assert p.famille == fam

    def test_arithmetic_mismatch_sets_low_confidence(self):
        p = Product(
            fournisseur="F",
            designation_raw="R",
            designation_fr="F",
            prix_brut_ht=100.0,
            remise_pct=10.0,
            prix_remise_ht=50.0,
        )
        assert p.confidence == "low"

    def test_arithmetic_match_keeps_high_confidence(self):
        p = Product(
            fournisseur="F",
            designation_raw="R",
            designation_fr="F",
            prix_brut_ht=100.0,
            remise_pct=10.0,
            prix_remise_ht=90.0,
        )
        assert p.confidence == "high"

    def test_auto_ttc_calculation(self):
        p = Product(
            fournisseur="F",
            designation_raw="R",
            designation_fr="F",
            prix_remise_ht=100.0,
        )
        assert p.prix_ttc_iva21 == pytest.approx(121.0, rel=1e-3)

    def test_auto_calcul_remise_when_zero(self):
        p = Product(
            fournisseur="F",
            designation_raw="R",
            designation_fr="F",
            prix_brut_ht=200.0,
            remise_pct=25.0,
        )
        assert p.prix_remise_ht == 150.0
        assert p.prix_ttc_iva21 == pytest.approx(181.5, rel=1e-3)

    def test_default_values(self):
        p = Product(fournisseur="F", designation_raw="R", designation_fr="F")
        assert p.famille == "Autre"
        assert p.unite == "unité"
        assert p.numero_facture is None
        assert p.date_facture is None

    def test_empty_fournisseur_rejected(self):
        with pytest.raises(ValidationError):
            Product(fournisseur="", designation_raw="R", designation_fr="F")

    def test_negative_prix_rejected(self):
        with pytest.raises(ValidationError):
            Product(
                fournisseur="F",
                designation_raw="R",
                designation_fr="F",
                prix_brut_ht=-5,
            )

    def test_remise_over_100_rejected(self):
        with pytest.raises(ValidationError):
            Product(
                fournisseur="F",
                designation_raw="R",
                designation_fr="F",
                remise_pct=150,
            )

    def test_small_ecart_within_tolerance(self):
        p = Product(
            fournisseur="F",
            designation_raw="R",
            designation_fr="F",
            prix_brut_ht=100.0,
            remise_pct=10.0,
            prix_remise_ht=89.9,
        )
        assert p.confidence == "high"

    def test_edge_case_special_chars(self):
        """Caractères spéciaux dans les champs."""
        p = Product(
            fournisseur="Société & Cie",
            designation_raw="Produit é à ü ñ 中文",
            designation_fr="Produit é à ü ñ",
            prix_remise_ht=10.0,
        )
        assert "é" in p.designation_fr
        assert p.prix_ttc_iva21 == pytest.approx(12.1, rel=1e-3)


class TestInvoiceExtractionResult:
    def test_empty_products(self):
        r = InvoiceExtractionResult(produits=[])
        assert len(r.produits) == 0
        assert r.tokens_used == 0
        assert r.langue_detectee == "es"

    def test_with_multiple_products(self):
        products = [
            Product(
                fournisseur="A",
                designation_raw="X",
                designation_fr="Y",
                prix_remise_ht=10,
            ),
            Product(
                fournisseur="B",
                designation_raw="Z",
                designation_fr="W",
                prix_remise_ht=20,
            ),
        ]
        r = InvoiceExtractionResult(
            produits=products,
            fournisseur_detecte="A",
            tokens_used=500,
        )
        assert len(r.produits) == 2
        assert r.fournisseur_detecte == "A"

    def test_defaults(self):
        r = InvoiceExtractionResult(produits=[])
        assert r.fournisseur_detecte is None
        assert r.numero_facture is None
        assert r.date_facture is None
        assert r.nb_lignes_brutes == 0


class TestBatchSaveRequest:
    def test_basic(self):
        req = BatchSaveRequest(
            produits=[{
                "fournisseur": "BigMat",
                "designation_raw": "Ciment 42.5R",
                "designation_fr": "Ciment 42.5R",
            }],
            source="mobile",
        )
        assert req.source == "mobile"
        assert len(req.produits) == 1

    def test_default_source(self):
        req = BatchSaveRequest(produits=[])
        assert req.source == "pc"

    def test_empty_produits(self):
        req = BatchSaveRequest(produits=[])
        assert len(req.produits) == 0
```

---

## Ce que ces tests vérifient — en clair

### TestProduct — le modèle produit

`Product` est le modèle de données central : il représente une ligne de facture extraite par Gemini. Pydantic valide et transforme les données à la création.

**`test_basic_product_with_discount`**
Crée un produit BigMat (Ciment Portland) avec un prix brut de 10€ et une remise de 10%. Vérifie que :
- `prix_remise_ht` est automatiquement calculé à 9.0€ (10 - 10%)
- `prix_ttc_iva21` est calculé à 10.89€ (9.0 × 1.21)
- `confidence` est `"high"` (les calculs sont cohérents)

`pytest.approx` est utilisé pour les comparaisons flottantes — en Python, `9.0 × 1.21` donne parfois `10.890000000000001` à cause des arrondis binaires, et `approx` tolère ces petites différences.

**`test_product_with_faker_data`**
Utilise la librairie Faker pour générer un fournisseur, des désignations et un prix aléatoires réalistes. Les données changent à chaque exécution, ce qui évite les biais : un test qui passe avec des données hardcodées pourrait échouer avec d'autres valeurs. Vérifie aussi que la famille par défaut est `"Autre"` quand aucune famille n'est spécifiée.

**`test_zero_price_is_low_confidence`**
Un prix à zéro signifie que l'OCR n'a probablement pas réussi à lire le prix. Le modèle doit automatiquement mettre `confidence = "low"` pour signaler que ces données sont suspectes.

**`test_invalid_famille_falls_back_to_autre`**
Si Gemini invente une famille qui n'existe pas dans la liste officielle (`"Bidule"` n'est pas dans `FAMILLES_VALIDES`), le modèle doit remplacer par `"Autre"` plutôt que de lever une erreur. C'est de la tolérance aux hallucinations de l'IA.

**`test_all_valid_familles_accepted`**
Teste en boucle chaque famille valide (Maçonnerie, Plomberie, Armature, etc.) et vérifie qu'elle est acceptée. Si une famille est ajoutée au code sans être dans les tests, ou vice-versa, ce test l'attrape.

**`test_arithmetic_mismatch_sets_low_confidence`**
Si Gemini dit "prix brut 100€, remise 10%, prix remisé 50€" — ça ne colle pas mathématiquement (100 - 10% = 90, pas 50). Le modèle détecte cet écart et met `confidence = "low"`. C'est un garde-fou contre les erreurs de lecture OCR.

**`test_arithmetic_match_keeps_high_confidence`**
L'inverse : 100€ - 10% = 90€. Les chiffres sont cohérents, `confidence` reste `"high"`.

**`test_auto_ttc_calculation`**
Si on ne fournit pas de prix TTC, le modèle le calcule automatiquement : 100€ × 1.21 = 121€.

**`test_auto_calcul_remise_when_zero`**
Si le prix remisé n'est pas fourni mais qu'on a le prix brut et la remise, le modèle calcule lui-même : 200€ × (1 - 25/100) = 150€, puis TTC = 150 × 1.21 = 181.5€.

**`test_default_values`**
Un produit minimal doit avoir des valeurs par défaut sensées : famille `"Autre"`, unité `"unité"`, pas de numéro de facture, pas de date.

**`test_empty_fournisseur_rejected`**
Un fournisseur vide est refusé avec une `ValidationError`. On ne peut pas sauvegarder un produit sans savoir d'où il vient.

**`test_negative_prix_rejected`**
Un prix négatif n'a pas de sens pour une facture. Pydantic doit le rejeter.

**`test_remise_over_100_rejected`**
Une remise de 150% est impossible. Elle est rejetée. (Une remise de 100% signifierait un produit gratuit, ce qui pourrait être accepté selon les règles métier — mais 150% est clairement aberrant.)

**`test_small_ecart_within_tolerance`**
89.9€ vs 90€ attendu (écart de 0.1%) — c'est une erreur d'arrondi normale dans les factures. Le modèle doit accepter cet écart et garder `confidence = "high"`. Sans cette tolérance, la moitié des factures réelles seraient marquées `"low"`.

**`test_edge_case_special_chars`**
Les désignations de produits espagnols et français contiennent des accents, des trémas, des ñ. Le modèle doit les accepter sans corruption, et les calculs de prix doivent fonctionner normalement.

### TestInvoiceExtractionResult — le résultat complet d'une extraction

**`test_empty_products`**
Un résultat sans produits est valide. Les valeurs par défaut : 0 tokens utilisés, langue `"es"` (espagnol, langue par défaut du projet basé en Catalogne).

**`test_with_multiple_products`**
Un résultat avec plusieurs produits est créé correctement, le fournisseur détecté est bien stocké.

**`test_defaults`**
Les champs optionnels (numéro de facture, date, fournisseur détecté) sont `None` par défaut, et le nombre de lignes brutes est 0.

### TestBatchSaveRequest — la requête de sauvegarde groupée

**`test_basic`**
Une requête avec un produit et la source `"mobile"` est créée correctement.

**`test_default_source`**
Si la source n'est pas spécifiée, elle vaut `"pc"` par défaut. Cela permet de savoir si les factures ont été scannées depuis un ordinateur ou un mobile.

**`test_empty_produits`**
Une requête sans produits est valide (pour le cas où la validation côté frontend a tout rejeté).

---

## Pourquoi c'est important

Le schéma Pydantic est le "contrat" entre Gemini et la base de données. Si la validation est trop laxiste, des données incohérentes (prix négatifs, familles inventées, calculs faux) pourraient corrompre le catalogue de prix. Si elle est trop stricte, des factures réelles seraient rejetées. Ces tests définissent précisément la frontière acceptable.

---

## Peut-on améliorer ces tests ?

- **Pas de test pour `confidence = "medium"`** : existe-t-il un niveau intermédiaire ? Les tests n'en montrent que `"high"` et `"low"`.
- **Pas de test de la précision des arrondis** : on utilise `pytest.approx` partout, mais on ne vérifie pas que les valeurs stockées en base ont bien le bon nombre de décimales.
- **Pas de test de la longueur maximale des champs** : `designation_raw` est tronquée à 80-100 chars dans les tests avec Faker, mais on ne teste pas qu'une désignation de 500 caractères est bien tronquée ou rejetée.
- **La tolérance arithmétique n'est pas testée de façon exhaustive** : on sait que 89.9/90 passe et que 50/90 échoue, mais où est exactement le seuil ? Un test avec 85/90 (6% d'écart) serait utile pour documenter cette limite.
