# a006 — Rendre l'unicité des produits propre à chaque utilisateur

**Fichier :** `migrations/versions/a006_unique_produits_user_id.py`
**Dépend de :** a005
**Rôle :** Remplacer l'ancienne règle "deux produits ne peuvent pas avoir la même désignation et le même fournisseur" par une règle plus fine : "deux produits du *même utilisateur* ne peuvent pas avoir la même désignation et le même fournisseur".

---

## Le code

```python
"""Update produits unique constraint to include user_id for multi-tenant

Revision ID: a006
Revises: a005
Create Date: 2026-02-26

- Drop old UNIQUE(designation_raw, fournisseur)
- Add UNIQUE NULLS NOT DISTINCT (designation_raw, fournisseur, user_id)
  (PostgreSQL 15+)
"""
from collections.abc import Sequence

from alembic import op

revision: str = "a006"
down_revision: str | None = "a005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Drop old unique constraint (designation_raw, fournisseur) - common PostgreSQL names
    op.execute("ALTER TABLE produits DROP CONSTRAINT IF EXISTS produits_designation_raw_fournisseur_key")
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_produits_unique_designation_fournisseur_user
        ON produits (designation_raw, fournisseur, user_id) NULLS NOT DISTINCT
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_produits_unique_designation_fournisseur_user")
    op.execute("""
        ALTER TABLE produits
        ADD CONSTRAINT produits_designation_raw_fournisseur_key
        UNIQUE (designation_raw, fournisseur)
    """)
```

---

## Ce que ce fichier fait — en clair

### Le problème que cette migration résout

Imaginons deux artisans utilisent l'application : Alice et Bob. Alice a un produit "Ciment Portland 25kg" chez BIGMAT. Bob aussi a "Ciment Portland 25kg" chez BIGMAT dans son catalogue.

Avec l'ancienne règle d'unicité `UNIQUE(designation_raw, fournisseur)`, la base de données refuserait d'enregistrer le produit de Bob en disant : "Ce couple désignation+fournisseur existe déjà !" — parce que la règle était globale, pour tous les utilisateurs confondus.

C'est comme si deux voisins ne pouvaient pas avoir le même prénom parce qu'une règle de l'immeuble interdit les doublons de prénoms — absurde.

---

### Étape 1 — Supprimer l'ancienne règle

```python
op.execute("ALTER TABLE produits DROP CONSTRAINT IF EXISTS produits_designation_raw_fournisseur_key")
```

On retire la règle d'unicité globale. Le nom `produits_designation_raw_fournisseur_key` est le nom automatique que PostgreSQL donne à une contrainte `UNIQUE` créée sans nom explicite — c'est la convention PostgreSQL : `nomtable_colonne1_colonne2_key`.

---

### Étape 2 — Créer une règle plus fine

```python
CREATE UNIQUE INDEX IF NOT EXISTS idx_produits_unique_designation_fournisseur_user
ON produits (designation_raw, fournisseur, user_id) NULLS NOT DISTINCT
```

La nouvelle règle dit : "La combinaison `(désignation, fournisseur, utilisateur)` doit être unique." Maintenant Alice et Bob peuvent chacun avoir leur "Ciment Portland 25kg" chez BIGMAT — car ils ont des `user_id` différents.

**`NULLS NOT DISTINCT`** est une subtilité de PostgreSQL 15 (sortie en 2022). Normalement, PostgreSQL considère que deux valeurs `NULL` sont différentes (parce que `NULL` signifie "inconnu", et deux inconnues ne sont pas forcément identiques). Donc sans `NULLS NOT DISTINCT`, on pourrait avoir un million de produits avec `user_id = NULL` et la même désignation — ce qui serait absurde.

Avec `NULLS NOT DISTINCT`, la base traite les `NULL` comme égaux dans le contexte de l'unicité : deux produits sans utilisateur (user_id NULL) avec la même désignation et le même fournisseur sont considérés comme des doublons, et refusés.

C'est une règle dite "multi-tenant" — un terme qui signifie simplement "plusieurs locataires dans le même immeuble", chacun avec ses propres affaires séparées.

---

### Pourquoi un `UNIQUE INDEX` plutôt qu'une `UNIQUE CONSTRAINT` ?

La syntaxe `CREATE UNIQUE INDEX` et `ADD CONSTRAINT UNIQUE` produisent le même effet en pratique sur PostgreSQL. Utiliser `CREATE UNIQUE INDEX` avec `IF NOT EXISTS` permet d'être idempotent facilement (on ne peut pas faire `ADD CONSTRAINT IF NOT EXISTS` en SQL standard). C'est un choix pragmatique.

---

### La fonction `downgrade()`

```python
def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_produits_unique_designation_fournisseur_user")
    op.execute("""
        ALTER TABLE produits
        ADD CONSTRAINT produits_designation_raw_fournisseur_key
        UNIQUE (designation_raw, fournisseur)
    """)
```

On supprime le nouvel index et on remet l'ancienne contrainte globale. Attention : si plusieurs utilisateurs avaient enregistré le même produit entre a006 et ce downgrade, la remise de l'ancienne contrainte échouerait à cause des doublons maintenant présents. C'est une vraie limitation du retour en arrière.

---

## Peut-on optimiser ce fichier ?

**Ce fichier est bien conçu pour ce qu'il fait, avec une subtilité importante (`NULLS NOT DISTINCT`) gérée correctement.**

Deux points à noter :

- **`NULLS NOT DISTINCT` requiert PostgreSQL 15+**. Le commentaire le mentionne, ce qui est bien. Si on devait un jour utiliser PostgreSQL 14 ou moins (peu probable avec Neon), cette migration échouerait. Il faudrait alors remplacer par une solution de contournement (`COALESCE(user_id, -1)` par exemple). Ce n'est pas un problème aujourd'hui.

- **Le `downgrade()` peut échouer** si des doublons inter-utilisateurs existent au moment du retour en arrière (voir ci-dessus). On pourrait ajouter un `DELETE` de dédoublonnage préventif avant de recréer la contrainte, mais ça risque de supprimer des données — donc ce n'est pas forcément mieux. C'est un cas limite acceptable pour une opération de retour en arrière (qui n'arrive que dans des contextes contrôlés).

- **Le fichier est court et lisible** — c'est une qualité en soi. Une migration qui fait une seule chose clairement est plus facile à comprendre, tester et annuler qu'une migration fourre-tout.
