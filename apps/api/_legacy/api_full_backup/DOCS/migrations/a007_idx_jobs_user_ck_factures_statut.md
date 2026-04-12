# a007 — Index sur les jobs par utilisateur et règle de statut sur les factures

**Fichier :** `migrations/versions/a007_idx_jobs_user_ck_factures_statut.py`
**Dépend de :** a006
**Rôle :** Accélérer les recherches de jobs par utilisateur avec un index, et interdire les statuts invalides dans la table `factures`.

---

## Le code

```python
"""Add idx_jobs_user_id and ck_factures_statut

Revision ID: a007
Revises: a006
Create Date: 2026-03-01

- idx_jobs_user_id: index for filtering jobs by user (multi-tenant)
- ck_factures_statut: CHECK constraint on factures.statut
"""
from collections.abc import Sequence

from alembic import op

revision: str = "a007"
down_revision: str | None = "a006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id)")
    op.execute("""
        DO $$
        BEGIN
            ALTER TABLE factures
            ADD CONSTRAINT ck_factures_statut
            CHECK (statut IN ('traite', 'erreur', 'en_attente'));
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_jobs_user_id")
    op.execute("ALTER TABLE factures DROP CONSTRAINT IF EXISTS ck_factures_statut")
```

---

## Ce que ce fichier fait — en clair

### Partie 1 — Un index sur les jobs par utilisateur

```python
op.execute("CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id)")
```

En a004, on a ajouté la colonne `user_id` dans `jobs`. Mais avoir la colonne ne suffit pas pour des recherches rapides. Sans index, pour répondre à "donne-moi tous les jobs de l'utilisateur 42", la base de données doit lire **toutes** les lignes de `jobs` et vérifier une par une.

Avec cet index, c'est comme si on avait un fichier trié par numéro d'utilisateur à côté de la table. La base peut sauter directement aux jobs de l'utilisateur 42 sans lire tout le reste.

C'est un oubli corrigé par rapport à a004 : la colonne avait été créée, mais l'index était manquant. a007 le complète.

---

### Partie 2 — Interdire les statuts invalides dans les factures

```python
DO $$
BEGIN
    ALTER TABLE factures
    ADD CONSTRAINT ck_factures_statut
    CHECK (statut IN ('traite', 'erreur', 'en_attente'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
```

Même principe qu'en a002 pour les jobs et les utilisateurs : on pose un panneau sur la colonne `statut` des factures. Les seules valeurs autorisées sont :
- `'traite'` — la facture a été traitée avec succès
- `'erreur'` — le traitement a échoué
- `'en_attente'` — la facture attend d'être traitée

Toute autre valeur (faute de frappe, état inventé) sera refusée par la base.

---

### La gestion d'erreur "si la contrainte existe déjà"

Le bloc SQL utilise ici une approche différente des migrations précédentes pour gérer l'idempotence :

```sql
EXCEPTION
    WHEN duplicate_object THEN NULL;
```

Au lieu de vérifier en amont si la contrainte existe (`IF NOT EXISTS`), ce code tente directement de la créer. Si PostgreSQL répond "cette contrainte existe déjà" (erreur `duplicate_object`), l'exception est attrapée et ignorée silencieusement (`THEN NULL` — ne rien faire).

C'est une approche différente de a002 et a003 qui utilisaient `IF NOT EXISTS (SELECT 1 FROM pg_constraint ...)`. Le résultat est le même : la migration peut être relancée sans planter. La différence est de style — "tente et rattrape l'erreur" vs "vérifie d'abord". Les deux fonctionnent.

---

### La fonction `downgrade()`

```python
def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_jobs_user_id")
    op.execute("ALTER TABLE factures DROP CONSTRAINT IF EXISTS ck_factures_statut")
```

Court et direct : on supprime l'index et la contrainte. Le `IF EXISTS` évite les erreurs si ces éléments n'existent pas.

---

## Peut-on optimiser ce fichier ?

**Ce fichier est propre et minimal. Un seul point mérite attention :**

- **Inconsistance dans la méthode d'idempotence** : a002 utilise `IF NOT EXISTS (SELECT 1 FROM pg_constraint ...)`, a007 utilise `EXCEPTION WHEN duplicate_object THEN NULL`. Les deux fonctionnent, mais utiliser deux styles différents dans le même projet peut dérouter. Ce n'est pas un bug, c'est une question de cohérence de style entre les migrations. Si le projet évolue, il serait bien de choisir un seul pattern et de s'y tenir.

- **L'index `idx_jobs_user_id` aurait pu être créé en a004** quand la colonne `user_id` a été ajoutée aux jobs. Le séparer en a007 n'est pas problématique, mais crée une fenêtre temporelle (entre a004 et a007) où la colonne existe sans index — ce qui peut poser des problèmes de performance si des données ont été insérées entre les deux migrations.

- **Deux choses sans lien réel** dans la même migration : l'index sur les jobs et la contrainte sur les factures n'ont pas de rapport logique entre eux. Avoir deux migrations distinctes (a007a et a007b) aurait été plus lisible, mais en pratique ce n'est pas un problème — les migrations sont atomiques (tout ou rien).
