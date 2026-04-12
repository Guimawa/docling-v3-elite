# invoice.py — Le formulaire officiel que toute facture doit remplir

**Fichier :** `apps/api/schemas/invoice.py`
**Rôle :** Définir la forme exacte que doivent avoir les données d'une facture dans l'application — et rejeter automatiquement tout ce qui ne respecte pas ces règles.

> **À jour 2026-04-04** : le bloc Python ci-dessous est un extrait pédagogique ; la **source de vérité** est le fichier `invoice.py` dans le repo. Champs produit enrichis : **`prix_ttc_remise`**, **`prix_ttc_non_remise`** (TTC lus sur la facture), **`prix_conseille_vente`** (optionnel, typiquement saisi au catalogue). Le modèle garde **`prix_ttc_iva21`** (souvent aligné sur le TTC remisé pour rétrocompatibilité).

---

## Le code

```python
"""
Schémas Pydantic v2 — Docling Agent v3
Validation stricte des données extraites par Gemini.
Auto-calcul TVA, confidence score, normalisation multilingue.
"""


from pydantic import BaseModel, Field, model_validator

FAMILLES_VALIDES = {
    "Armature", "Cloison", "Climatisation", "Plomberie", "Électricité",
    "Menuiserie", "Couverture", "Carrelage", "Isolation", "Peinture",
    "Outillage", "Consommable", "Maçonnerie", "Terrassement", "Autre"
}


class Product(BaseModel):
    fournisseur:      str            = Field(..., min_length=1)
    designation_raw:  str            = Field(..., min_length=1)   # Original CA/ES
    designation_fr:   str            = Field(..., min_length=1)   # Traduit FR
    famille:          str            = Field(default="Autre")
    unite:            str            = Field(default="unité")
    prix_brut_ht:     float          = Field(default=0.0, ge=0)
    remise_pct:       float          = Field(default=0.0, ge=0, le=100)
    prix_remise_ht:   float          = Field(default=0.0, ge=0)
    prix_ttc_iva21:   float          = Field(default=0.0, ge=0)
    numero_facture:   str | None  = None
    date_facture:     str | None  = None
    confidence:       str            = Field(default="high")      # high | low

    @model_validator(mode="after")
    def validate_and_compute(self) -> "Product":
        # ── Normaliser famille ──────────────────────────────────
        if self.famille not in FAMILLES_VALIDES:
            self.famille = "Autre"

        # ── Auto-calcul prix_remise_ht ──────────────────────────
        if self.prix_brut_ht > 0 and self.remise_pct > 0:
            computed = round(self.prix_brut_ht * (1 - self.remise_pct / 100), 4)
            if self.prix_remise_ht == 0:
                self.prix_remise_ht = computed
            elif computed > 0:
                ecart = abs(self.prix_remise_ht - computed) / computed
                if ecart > 0.02:
                    self.confidence = "low"
            else:
                self.confidence = "low"

        # ── Auto-calcul TVA IVA 21% ─────────────────────────────
        if self.prix_remise_ht > 0:
            self.prix_ttc_iva21 = round(self.prix_remise_ht * 1.21, 4)

        # ── Confidence low si prix = 0 ──────────────────────────
        if self.prix_remise_ht == 0:
            self.confidence = "low"

        return self


class InvoiceExtractionResult(BaseModel):
    produits:         list[Product]
    fournisseur_detecte: str | None = None
    numero_facture:   str | None    = None
    date_facture:     str | None    = None
    langue_detectee:  str              = "es"   # es | ca | fr
    nb_lignes_brutes: int              = 0
    tokens_used:      int              = 0


class BatchSaveRequest(BaseModel):
    produits: list[dict]
    source:   str = "pc"

    @model_validator(mode="after")
    def validate_produits(self) -> "BatchSaveRequest":
        """Valide que chaque produit a les champs requis. Limite 500 anti-DoS."""
        max_produits = 500
        if len(self.produits) > max_produits:
            raise ValueError(f"Maximum {max_produits} produits par requête")
        for i, p in enumerate(self.produits):
            if not isinstance(p, dict):
                raise ValueError(f"produits[{i}] doit être un dict")
            if not p.get("fournisseur") or not p.get("designation_raw") or not p.get("designation_fr"):
                raise ValueError(
                    f"produits[{i}] doit contenir fournisseur, designation_raw, designation_fr"
                )
        return self
```

---

## Ce que ce fichier fait — en clair

### L'analogie du formulaire d'imprimerie

Imagine que tu dois remplir un formulaire officiel pour déclarer un produit BTP. Ce formulaire a des cases obligatoires (le fournisseur, le nom du produit), des cases optionnelles (la date de facture), et des règles automatiques (si tu indiques un prix brut et une remise, le prix net sera calculé tout seul). Si tu essaies de soumettre le formulaire avec une case obligatoire vide, il te sera immédiatement retourné avec une erreur explicite.

Ce fichier définit exactement ces formulaires — en langage informatique, on les appelle des "schémas Pydantic". Pydantic est une bibliothèque Python qui transforme automatiquement les données reçues (par exemple, depuis Gemini ou depuis le frontend) en objets Python validés.

### `FAMILLES_VALIDES` — La liste des catégories autorisées

```python
FAMILLES_VALIDES = {
    "Armature", "Cloison", "Climatisation", "Plomberie", "Électricité", ...
}
```

C'est la liste fermée des catégories de matériaux BTP reconnues par l'application. Si Gemini retourne une famille inconnue comme "Béton" ou "Isolation thermique", elle sera automatiquement remplacée par "Autre". Cela garantit que la base de données ne contiendra jamais de catégories fantaisistes.

### `class Product` — La fiche d'un produit

C'est le schéma principal. Chaque ligne de facture devient un objet `Product`. Voici ses champs en langage courant :

| Champ | Ce que c'est | Obligatoire ? |
|---|---|---|
| `fournisseur` | Nom du vendeur (ex: "BIGMAT") | Oui |
| `designation_raw` | Nom original du produit (en catalan ou espagnol si nécessaire) | Oui |
| `designation_fr` | Nom traduit en français | Oui |
| `famille` | Catégorie BTP (voir liste ci-dessus) | Non (défaut: "Autre") |
| `unite` | Unité de mesure (m², kg, unité...) | Non (défaut: "unité") |
| `prix_brut_ht` | Prix avant remise, hors taxes | Non (défaut: 0) |
| `remise_pct` | Remise en pourcentage (0 à 100) | Non (défaut: 0) |
| `prix_remise_ht` | Prix après remise, hors taxes | Non (défaut: 0) |
| `prix_ttc_iva21` | Prix TTC avec TVA à 21% (taux espagnol) | Non (défaut: 0) |
| `numero_facture` | Numéro de la facture | Non |
| `date_facture` | Date de la facture | Non |
| `confidence` | Fiabilité de l'extraction (high ou low) | Non (défaut: "high") |

Les contraintes `ge=0` (greater or equal) et `le=100` signifient que les prix ne peuvent pas être négatifs, et le pourcentage de remise ne peut pas dépasser 100%.

### `validate_and_compute()` — Le calculateur automatique

```python
@model_validator(mode="after")
def validate_and_compute(self) -> "Product":
```

Ce décorateur `@model_validator(mode="after")` indique que cette méthode s'exécute automatiquement juste après la création de l'objet, une fois que tous les champs ont été initialisés. C'est une sorte de "vérification finale" du formulaire.

Elle fait quatre choses :

**1. Correction de la famille** : si la famille fournie n'est pas dans la liste officielle, elle est remplacée par "Autre". Pas d'erreur, juste une correction silencieuse.

**2. Calcul automatique du prix avec remise** : si on a un `prix_brut_ht` et un `remise_pct`, le prix net est calculé automatiquement. Mais s'il y avait déjà un `prix_remise_ht` fourni, le code vérifie que les deux sont cohérents. Un écart de plus de 2% entre le prix calculé et le prix fourni déclenche `confidence = "low"` — cela signale que quelque chose cloche dans les données de l'IA.

**3. Calcul de la TVA à 21%** : le prix TTC est toujours recalculé depuis le `prix_remise_ht`, quelle que soit la valeur fournie. Le taux de 21% est le taux d'IVA (TVA espagnole) standard.

**4. Confidence basse si prix nul** : un produit avec un prix à 0 est probablement une erreur d'extraction — on le signale avec `confidence = "low"` pour que l'utilisateur puisse le vérifier.

### `class InvoiceExtractionResult` — Le résumé complet d'une facture

Quand une facture est analysée (par Gemini, avec fallback Bytez si besoin), le résultat est toujours retourné dans cet objet. Il contient :
- La liste de tous les `Product` extraits.
- Des métadonnées sur la facture : fournisseur, numéro, date, langue.
- Des informations de suivi : nombre de lignes brutes lues, nombre de tokens utilisés par l'IA (pour gérer les coûts).

`langue_detectee` vaut `"es"` par défaut car la plupart des factures traitées sont espagnoles (zone Catalogne). Les valeurs possibles sont `es`, `ca` (catalan), et `fr`.

### `class BatchSaveRequest` — La requête de sauvegarde en masse

Quand l'utilisateur valide les produits extraits depuis l'interface web et les envoie pour sauvegarde, ils arrivent dans cet objet. Il contient deux champs :
- `produits` : la liste des produits à sauvegarder.
- `source` : d'où vient la demande (`"pc"` pour le navigateur, `"watchdog"` pour le dossier surveillé...).

Le validateur `validate_produits()` protège contre deux risques :

**Anti-DoS** : la limite de 500 produits par requête empêche un utilisateur mal intentionné d'envoyer des milliers de produits d'un coup pour saturer le serveur.

**Vérification des champs obligatoires** : chaque produit doit avoir au minimum `fournisseur`, `designation_raw` et `designation_fr`. Sans ces trois champs, l'enregistrement en base de données serait inutilisable.

---

## Peut-on optimiser ce fichier ?

**Ce qui est bien fait :**
- La validation automatique avec Pydantic est une excellente pratique : les données invalides sont rejetées à l'entrée, jamais en base de données.
- Les calculs automatiques de prix dans `validate_and_compute` évitent les incohérences entre les champs.
- La détection de cohérence à 2% est un choix pragmatique — les arrondis des IA peuvent créer de légères différences acceptables.
- La protection anti-DoS à 500 produits est simple et efficace.
- Le taux IVA 21% est fixe et clairement nommé, adapté au contexte espagnol.

**Ce qui pourrait être amélioré :**

1. **`confidence` accepte n'importe quelle chaîne** : le champ est défini comme `str` avec un commentaire `# high | low`, mais rien n'empêche de mettre `"medium"` ou `"excellent"`. Utiliser un `Literal["high", "low"]` ou une `Enum` rendrait cette contrainte explicite et vérifiée par Pydantic.

2. **`langue_detectee` n'est pas contrainte** : même remarque — le commentaire dit `# es | ca | fr` mais n'importe quelle valeur est acceptée. Un `Literal["es", "ca", "fr"]` serait plus strict.

3. **`date_facture` est une chaîne libre** : la date peut être au format `"20240115"`, `"15/01/2024"`, `"2024-01-15"`, et tout passera. Utiliser un type `date` de Python ou une validation par regex garantirait un format cohérent en base de données.

4. **`BatchSaveRequest` utilise `list[dict]` sans typage fort** : les produits dans `BatchSaveRequest` sont des dictionnaires libres, pas des objets `Product` validés. La validation se fait manuellement dans `validate_produits()` avec seulement 3 champs vérifiés. Il serait plus robuste d'utiliser `list[Product]` directement, ce qui déplacerait la validation complète vers Pydantic.

5. **Le taux TVA `1.21` est en dur dans le code** : si le taux change (ce qui est rare mais possible), il faut chercher ce `1.21` dans le code. Une constante nommée `TVA_IVA = 0.21` en haut du fichier serait plus lisible et maintenable.

6. **`nb_lignes_brutes` vs `len(produits)` — redondance possible** : `InvoiceExtractionResult` a un champ `nb_lignes_brutes` qui peut être différent de `len(produits)`. L'intention est probablement de garder une trace du nombre de lignes brutes avant filtrage (certaines lignes sans désignation sont ignorées), mais ce n'est pas documenté et rien n'empêche d'y mettre n'importe quelle valeur.
