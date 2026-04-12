# a002 — Ajouter des règles de validation sur les colonnes texte

**Fichier :** `migrations/versions/a002_add_check_constraints.py`
**Dépend de :** a001
**Rôle :** Empêcher la base de données d'accepter des valeurs interdites dans quatre colonnes importantes : le statut des jobs, le rôle des utilisateurs, le niveau de confiance et la source d'un produit.

---

## Le code

```python
"""Add CHECK constraints on status/role/confidence/source columns

Revision ID: a002
Revises: a001
Create Date: 2026-02-25

Constraints added:
  - jobs.status       IN ('processing', 'completed', 'error')
  - users.role        IN ('user', 'admin')
  - produits.confidence IN ('high', 'low')
  - produits.source   IN ('pc', 'mobile', 'watchdog')
"""
from collections.abc import Sequence

from alembic import op

revision: str = "a002"
down_revision: str | None = "a001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Idempotent: skip if constraint already exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_jobs_status') THEN
                ALTER TABLE jobs ADD CONSTRAINT ck_jobs_status
                CHECK (status IN ('processing', 'completed', 'error'));
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_role') THEN
                ALTER TABLE users ADD CONSTRAINT ck_users_role
                CHECK (role IN ('user', 'admin'));
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_produits_confidence') THEN
                ALTER TABLE produits ADD CONSTRAINT ck_produits_confidence
                CHECK (confidence IN ('high', 'low'));
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_produits_source') THEN
                ALTER TABLE produits ADD CONSTRAINT ck_produits_source
                CHECK (source IN ('pc', 'mobile', 'watchdog'));
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE produits DROP CONSTRAINT IF EXISTS ck_produits_source")
    op.execute("ALTER TABLE produits DROP CONSTRAINT IF EXISTS ck_produits_confidence")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_role")
    op.execute("ALTER TABLE jobs DROP CONSTRAINT IF EXISTS ck_jobs_status")
```

---

## Ce que ce fichier fait — en clair

### L'idée principale : poser des panneaux "Accès interdit"

Imagine une colonne `status` dans la table `jobs`. Sans règle, n'importe quelle valeur peut y être enregistrée : `"processing"`, `"completed"`, `"error"`, mais aussi `"pouet"`, `"12345"` ou même une chaîne vide. Une faute de frappe dans le code applicatif, et des données invalides entrent silencieusement dans la base.

Une contrainte CHECK, c'est comme poser un panneau devant cette colonne : **"Seules ces valeurs précises sont autorisées. Le reste est refusé."** La base de données elle-même fait le contrôle — même si le code Python fait une erreur, la base rejette la donnée incorrecte.

---

### Les quatre contraintes posées

| Table | Colonne | Valeurs autorisées |
|---|---|---|
| `jobs` | `status` | `processing`, `completed`, `error` |
| `users` | `role` | `user`, `admin` |
| `produits` | `confidence` | `high`, `low` |
| `produits` | `source` | `pc`, `mobile`, `watchdog` |

C'est un peu comme les cases à cocher d'un formulaire papier : on ne peut pas écrire ce qu'on veut, on choisit parmi une liste fixe.

---

### La sécurité "si déjà fait, ne pas refaire"

Chaque bloc SQL est enveloppé dans un `DO $$ BEGIN ... END $$` qui vérifie d'abord si la contrainte existe déjà :

```sql
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_jobs_status') THEN
    ...
END IF;
```

C'est ce qu'on appelle être **idempotent** : si tu appliques cette migration deux fois de suite (par accident ou après une erreur), la deuxième fois ne plante pas — elle vérifie, voit que le travail est déjà fait, et passe son chemin. C'est comme une check-list : si tu as déjà coché la case, tu ne la recoches pas.

---

### La fonction `downgrade()` — le bouton "annuler"

```python
def downgrade() -> None:
    op.execute("ALTER TABLE produits DROP CONSTRAINT IF EXISTS ck_produits_source")
    ...
```

Si on a besoin de revenir en arrière (retourner à la version a001), cette fonction supprime toutes les contraintes ajoutées. Le `IF EXISTS` évite une erreur si une contrainte n'existe pas — même prudence qu'à l'aller. C'est comme un plan de démontage pour chaque plan de montage.

---

## Peut-on optimiser ce fichier ?

**Ce fichier est solide, mais une amélioration est envisageable :**

- **L'approche idempotente est correcte**, mais elle utilise du SQL PostgreSQL brut (`DO $$ ... $$`) au lieu des fonctions Alembic natives (`op.create_check_constraint`). Ce n'est pas un problème en pratique — le résultat est identique — mais les fonctions Alembic seraient plus lisibles et plus portables si on changeait un jour de base de données (peu probable, mais bon).

- **Le `downgrade()` n'est pas symétrique** avec l'`upgrade()` : il supprime directement sans vérifier si la contrainte existe, en utilisant `IF EXISTS` côté SQL. C'est correct, mais légèrement différent de style par rapport à l'`upgrade()`. Cohérence cosmétique uniquement.

- **Pas de migration des données existantes invalides** avant d'ajouter les contraintes. Si la base contenait déjà des valeurs interdites dans ces colonnes au moment d'appliquer a002, la migration aurait échoué. En pratique c'est géré en a005 (nettoyage des données avant contraintes), mais c'est une fragilité potentielle à documenter.

Dans l'ensemble, ce fichier fait exactement ce qu'il doit faire, de façon sûre et réversible.
