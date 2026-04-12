# test_db_manager.py — Ce qu'on vérifie

**Fichier :** `apps/api/core/test_db_manager.py`
**Catégorie :** unit
**Ce qu'on teste :** Les fonctions de conversion de dates (`_parse_date`) et de préparation des paramètres SQL pour l'insertion/mise à jour de produits en base (`_upsert_params`).

---

## Le code

```python
"""
Tests unitaires des validateurs db_manager — zéro mock.
_parse_date, _upsert_params.
"""

from datetime import date, datetime

from core.db_manager import _parse_date, _upsert_params


class TestParseDate:
    def test_none_returns_none(self):
        assert _parse_date(None) is None

    def test_empty_string_returns_none(self):
        assert _parse_date("") is None
        assert _parse_date("  ") is None

    def test_date_object_passthrough(self):
        d = date(2023, 10, 24)
        assert _parse_date(d) == d

    def test_datetime_object_returns_date(self):
        dt = datetime(2023, 10, 24, 15, 30)
        assert _parse_date(dt) == date(2023, 10, 24)

    def test_format_dd_mm_yyyy(self):
        assert _parse_date("24/10/2023") == date(2023, 10, 24)

    def test_format_yyyy_mm_dd(self):
        assert _parse_date("2023-10-24") == date(2023, 10, 24)

    def test_format_dd_mm_yyyy_dash(self):
        assert _parse_date("24-10-2023") == date(2023, 10, 24)

    def test_format_dd_mm_yyyy_dot(self):
        assert _parse_date("24.10.2023") == date(2023, 10, 24)

    def test_unparseable_returns_none(self):
        assert _parse_date("not a date") is None
        assert _parse_date("2023/10/24") is None
        assert _parse_date("Oct 24, 2023") is None


class TestUpsertParams:
    def test_basic_product(self):
        product = {
            "fournisseur": "BigMat",
            "designation_raw": "CIMENT 42.5R",
            "designation_fr": "Ciment 42.5R",
            "famille": "Maçonnerie",
            "unite": "sac",
            "prix_brut_ht": 12.50,
            "remise_pct": 10.0,
            "prix_remise_ht": 11.25,
            "prix_ttc_iva21": 13.61,
            "numero_facture": "F-001",
            "date_facture": "24/10/2023",
            "confidence": "high",
        }
        params = _upsert_params(product, "pc", user_id=1)
        assert params[0] == 1  # user_id
        assert params[1] == "BigMat"
        assert params[2] == "CIMENT 42.5R"
        assert params[6] == 12.50  # prix_brut_ht
        assert params[11] == date(2023, 10, 24)
        assert params[13] == "pc"

    def test_minimal_product_defaults(self):
        product = {}
        params = _upsert_params(product, "mobile", user_id=None)
        assert params[0] is None  # user_id
        assert params[1] == ""
        assert params[4] == "Autre"
        assert params[5] == "unité"
        assert params[6] == 0.0
        assert params[11] is None
        assert params[13] == "mobile"

    def test_none_values_handled(self):
        product = {
            "prix_brut_ht": None,
            "remise_pct": None,
            "date_facture": None,
        }
        params = _upsert_params(product, "watchdog", user_id=None)
        assert params[6] == 0.0  # prix_brut_ht
        assert params[7] == 0.0  # remise_pct
        assert params[11] is None  # date
```

---

## Ce que ces tests vérifient — en clair

### TestParseDate — parser de dates

Les factures arrivent de différents pays (France, Espagne, Catalogne) et l'OCR de Gemini peut retourner les dates dans des formats très variés. La fonction `_parse_date` doit toutes les comprendre.

**`test_none_returns_none`** et **`test_empty_string_returns_none`**
Si l'OCR n'a pas trouvé de date (valeur `None`) ou a retourné une chaîne vide, la fonction doit retourner `None` sans planter. C'est le cas où la facture n'a pas de date visible.

**`test_date_object_passthrough`**
Si on lui passe déjà un objet `date` Python, il doit le retourner tel quel sans transformation. Ça évite les bugs si la date est déjà convertie quelque part dans le pipeline.

**`test_datetime_object_returns_date`**
Si on passe un objet `datetime` (date + heure), il doit extraire et retourner seulement la partie date. En base de données, on stocke seulement la date de la facture, pas l'heure.

**`test_format_dd_mm_yyyy`**, **`test_format_yyyy_mm_dd`**, **`test_format_dd_mm_yyyy_dash`**, **`test_format_dd_mm_yyyy_dot`**
Ces quatre tests vérifient que les formats courants sont reconnus :
- `24/10/2023` (format français/espagnol)
- `2023-10-24` (format ISO, format informatique)
- `24-10-2023` (avec tirets)
- `24.10.2023` (avec points, courant en Allemagne et certaines régions)

**`test_unparseable_returns_none`**
Certains formats ne doivent pas être reconnus pour éviter les mauvaises interprétations :
- `"not a date"` : texte aléatoire
- `"2023/10/24"` : slash dans l'ordre inversé (non supporté)
- `"Oct 24, 2023"` : format anglais long

### TestUpsertParams — préparation des paramètres SQL

La fonction `_upsert_params` transforme un dictionnaire produit (tel que retourné par Gemini) en un tuple ordonné de paramètres prêts à être insérés dans une requête SQL PostgreSQL.

**`test_basic_product`**
Prend un produit complet (BigMat, Ciment 42.5R, prix 12.50€, remise 10%, date 24/10/2023) et vérifie que les valeurs se retrouvent aux bonnes positions dans le tuple. La position est critique car la requête SQL a des `$1`, `$2`, `$3`... qui correspondent à l'ordre du tuple.

**`test_minimal_product_defaults`**
Que se passe-t-il avec un produit vide (`{}`) ? La fonction doit remplir des valeurs par défaut sensées : famille `"Autre"`, unité `"unité"`, prix à `0.0`, etc. Cela évite des erreurs SQL de type "null constraint violation".

**`test_none_values_handled`**
Si des champs numériques sont `None` (l'OCR n'a pas trouvé de valeur), ils doivent devenir `0.0` et non rester `None` (ce qui pourrait provoquer une erreur si la colonne SQL n'accepte pas les nulls pour les prix).

---

## Pourquoi c'est important

Ces deux fonctions sont au cœur du pipeline de traitement des factures. Chaque fois qu'une facture est traitée par Gemini et que les produits sont sauvegardés en base, `_upsert_params` est appelée. Une erreur ici signifie des données corrompues en base ou des erreurs silencieuses qui font disparaître des factures.

Le parsing de dates est particulièrement critique : une date mal parsée dans un catalogue de prix peut fausser toutes les analyses de prix dans le temps.

---

## Peut-on améliorer ces tests ?

- **Les positions du tuple ne sont pas documentées dans les tests** : `params[6] == 12.50` — pourquoi 6 ? Il faudrait une constante nommée ou un commentaire expliquant l'ordre du tuple.
- **Pas de test de dépassement de longueur** : que se passe-t-il si `fournisseur` a plus de 50 caractères ? Est-il tronqué ou ça plante ?
- **Format `2023/10/24` rejeté** : c'est un choix délibéré, mais ce format est courant dans les exports Excel. Ça pourrait être un cas à supporter.
- **Pas de test de la source** : le paramètre `source` (2ème argument de `_upsert_params`) peut valoir `"pc"`, `"mobile"` ou `"watchdog"`. On ne teste pas qu'une valeur invalide est rejetée ou gérée.
