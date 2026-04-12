# test_gemini_service.py — Ce qu'on vérifie

**Fichier :** `apps/api/services/test_gemini_service.py`
**Catégorie :** unit
**Ce qu'on teste :** La structure du schéma JSON envoyé à Gemini, le contenu du prompt système, et la capacité à parser la réponse JSON de Gemini en objets Python Pydantic — sans faire aucun appel à l'API Gemini.

---

## Le code

```python
"""Tests pour GeminiService (parsing, schema) — zéro mock, pas d'appel API."""
import json

from schemas.invoice import InvoiceExtractionResult, Product
from services.gemini_service import RESPONSE_SCHEMA, SYSTEM_PROMPT


class TestResponseSchema:
    def test_schema_has_produits(self):
        assert "produits" in RESPONSE_SCHEMA["properties"]
        assert "produits" in RESPONSE_SCHEMA["required"]

    def test_schema_produit_required_fields(self):
        item_schema = RESPONSE_SCHEMA["properties"]["produits"]["items"]
        required = item_schema["required"]
        assert "fournisseur" in required
        assert "designation_raw" in required
        assert "designation_fr" in required
        assert "prix_brut_ht" in required
        assert "prix_remise_ht" in required

    def test_schema_is_valid_json_schema(self):
        serialized = json.dumps(RESPONSE_SCHEMA)
        parsed = json.loads(serialized)
        assert parsed["type"] == "object"


class TestSystemPrompt:
    def test_prompt_mentions_btp(self):
        assert "BTP" in SYSTEM_PROMPT

    def test_prompt_mentions_familles(self):
        assert "Armature" in SYSTEM_PROMPT
        assert "Plomberie" in SYSTEM_PROMPT

    def test_prompt_mentions_arithmetic(self):
        assert "prix_remise_ht" in SYSTEM_PROMPT
        assert "1.21" in SYSTEM_PROMPT

    def test_prompt_mentions_confidence(self):
        assert "confidence" in SYSTEM_PROMPT
        assert "low" in SYSTEM_PROMPT


class TestGeminiJsonParsing:
    def test_parse_structured_response(self):
        raw = json.dumps({
            "fournisseur_detecte": "BigMat",
            "numero_facture": "F-2023-001",
            "date_facture": "15/10/2023",
            "langue_detectee": "ca",
            "nb_lignes_brutes": 2,
            "produits": [
                {
                    "fournisseur": "BigMat",
                    "designation_raw": "CIMENT PORTLAND 42.5R 25KG",
                    "designation_fr": "Ciment Portland 42.5R 25kg",
                    "famille": "Maçonnerie",
                    "unite": "sac",
                    "prix_brut_ht": 5.80,
                    "remise_pct": 15.0,
                    "prix_remise_ht": 4.93,
                    "prix_ttc_iva21": 5.97,
                    "confidence": "high"
                },
                {
                    "fournisseur": "BigMat",
                    "designation_raw": "ARENA FINA 0/2 25KG",
                    "designation_fr": "Sable fin 0/2 25kg",
                    "famille": "Maçonnerie",
                    "unite": "sac",
                    "prix_brut_ht": 2.40,
                    "remise_pct": 0,
                    "prix_remise_ht": 2.40,
                    "prix_ttc_iva21": 2.90,
                    "confidence": "high"
                }
            ]
        })
        data = json.loads(raw)
        produits_valides = []
        for p in data["produits"]:
            p["fournisseur"] = p.get("fournisseur") or data.get("fournisseur_detecte", "Inconnu")
            produits_valides.append(Product(**p))

        result = InvoiceExtractionResult(
            produits=produits_valides,
            fournisseur_detecte=data["fournisseur_detecte"],
            tokens_used=1500,
        )
        assert len(result.produits) == 2
        assert result.produits[0].designation_fr == "Ciment Portland 42.5R 25kg"
        assert result.fournisseur_detecte == "BigMat"

    def test_parse_empty_produits(self):
        result = InvoiceExtractionResult(produits=[], fournisseur_detecte="Unknown")
        assert len(result.produits) == 0

    def test_invalid_product_skipped(self):
        data = {
            "produits": [
                {"fournisseur": "", "designation_raw": "", "designation_fr": "", "prix_brut_ht": 0, "prix_remise_ht": 0},
                {"fournisseur": "OK", "designation_raw": "X", "designation_fr": "Y", "prix_brut_ht": 10, "prix_remise_ht": 10},
            ]
        }
        produits = []
        for p in data["produits"]:
            try:
                produits.append(Product(**p))
            except Exception:
                pass
        assert len(produits) == 1
        assert produits[0].fournisseur == "OK"
```

---

## Ce que ces tests vérifient — en clair

### TestResponseSchema — le contrat avec Gemini

Quand on demande à Gemini d'extraire une facture, on lui envoie un `RESPONSE_SCHEMA` : c'est un document JSON qui dit à Gemini "je veux que tu me retournes les données dans ce format précis". Ces tests vérifient que ce schéma est correct.

**`test_schema_has_produits`**
Le schéma doit avoir un champ `produits` dans ses propriétés ET dans sa liste de champs obligatoires. Si `produits` n'est pas obligatoire, Gemini pourrait retourner une réponse sans produits et l'application ne signalerait pas d'erreur.

**`test_schema_produit_required_fields`**
Dans la liste des produits, les champs essentiels doivent être marqués comme obligatoires : `fournisseur`, `designation_raw` (la désignation telle qu'elle apparaît sur la facture), `designation_fr` (traduite en français), `prix_brut_ht`, et `prix_remise_ht`. Sans ces champs obligatoires, Gemini pourrait omettre des prix et l'application accepterait silencieusement des données incomplètes.

**`test_schema_is_valid_json_schema`**
On sérialise le schéma en JSON puis on le relit. Si ça ne plante pas et que le type est `"object"`, le schéma est structurellement valide. Cela détecte les erreurs Python (types non sérialisables) qui empêcheraient l'envoi du schéma à Gemini.

### TestSystemPrompt — les instructions données à Gemini

Le `SYSTEM_PROMPT` est le long texte d'instructions qui configure le comportement de Gemini. Ces tests vérifient que des éléments critiques sont bien présents dans ce prompt.

**`test_prompt_mentions_btp`**
Le prompt doit mentionner "BTP" (Bâtiment et Travaux Publics). Sans ce contexte, Gemini ne saurait pas qu'il analyse des factures de matériaux de construction et pourrait mal classer les produits.

**`test_prompt_mentions_familles`**
Le prompt doit mentionner les familles de produits BTP comme "Armature" et "Plomberie". Ces familles permettent à Gemini de classifier les produits dans les bonnes catégories du catalogue.

**`test_prompt_mentions_arithmetic`**
Le prompt doit mentionner `prix_remise_ht` et le coefficient TVA `1.21`. Cela garantit que les instructions de calcul sont dans le prompt — si elles sont absentes, Gemini pourrait retourner des prix TTC calculés incorrectement.

**`test_prompt_mentions_confidence`**
Le prompt doit expliquer à Gemini comment utiliser le niveau de confiance `confidence`, notamment la valeur `"low"` pour signaler les données douteuses.

### TestGeminiJsonParsing — le traitement de la réponse de Gemini

**`test_parse_structured_response`**
On simule une vraie réponse JSON de Gemini (une facture BigMat avec deux produits : du ciment et du sable). On reproduit le traitement que fait le code réel :
1. Parser le JSON.
2. Fallback : si un produit n'a pas de `fournisseur`, utiliser `fournisseur_detecte` de l'entête.
3. Créer des objets `Product` Pydantic.
4. Créer un `InvoiceExtractionResult`.

On vérifie que les 2 produits sont bien créés et que le nom du fournisseur est correct.

**`test_parse_empty_produits`**
Une facture vide (pas de produits extraits) doit être acceptée sans erreur. Cela peut arriver si Gemini ne trouve aucun produit lisible sur la facture.

**`test_invalid_product_skipped`**
Si Gemini retourne un produit invalide (fournisseur vide, qui viole la règle de validation Pydantic) et un produit valide, seul le produit valide doit être conservé. Le produit invalide est ignoré (le `try/except` l'avale). Ce test vérifie que l'application est robuste face à des réponses partiellement incorrectes de Gemini.

---

## Pourquoi c'est important

Le service Gemini est la pièce centrale de l'application — c'est lui qui transforme une photo de facture en données structurées. Ces tests vérifient toute la logique autour des appels à l'API, sans dépenser un centime en tokens (aucun appel réseau). Si le schéma change, si le prompt perd un élément critique, ou si le parsing est cassé, ces tests l'attrapent immédiatement.

---

## Peut-on améliorer ces tests ?

- **Le test de parsing reproduit la logique applicative** : `test_parse_structured_response` réimplémente dans le test la même logique que le code source. Si la logique change dans le code, il faut aussi changer le test. Mieux vaudrait tester directement la méthode de parsing du service.
- **Pas de test des langues** : Gemini doit gérer le français, l'espagnol et le catalan. On ne teste pas que des désignations en espagnol ou catalan sont bien acceptées dans le schéma.
- **La valeur `"ca"` pour catalan n'est pas vérifiée** : `langue_detectee: "ca"` est dans le JSON de test, mais on ne vérifie pas que cette valeur est bien stockée dans le résultat final.
- **Pas de test de la gestion des erreurs Gemini** : que se passe-t-il si Gemini retourne un JSON mal formé, ou une réponse vide ? Ces cas d'erreur ne sont pas couverts ici.
