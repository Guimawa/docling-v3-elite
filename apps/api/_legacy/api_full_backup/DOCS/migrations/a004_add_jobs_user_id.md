# a004 — Attacher chaque job à son utilisateur

**Fichier :** `migrations/versions/a004_add_jobs_user_id.py`
**Dépend de :** a003
**Rôle :** Ajouter une colonne `user_id` dans la table `jobs` pour que chaque traitement de facture soit rattaché à l'utilisateur qui l'a lancé, et qu'un utilisateur ne puisse pas voir les jobs d'un autre.

---

## Le code

```python
"""Add user_id to jobs for multi-tenant isolation

Revision ID: a004
Revises: a003
Create Date: 2026-02-26

Jobs are now scoped by user. get_job_status filters WHERE job_id=$1 AND user_id=$2.
Existing jobs have user_id=NULL and return 404 for all users.
"""
from collections.abc import Sequence

from alembic import op

revision: str = "a004"
down_revision: str | None = "a003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE jobs DROP COLUMN IF EXISTS user_id")
```

---

## Ce que ce fichier fait — en clair

### L'idée principale : chaque job a un propriétaire

Avant cette migration, la table `jobs` n'avait aucun lien avec les utilisateurs. Un "job", c'est une tâche de traitement lancée quand quelqu'un envoie une facture à analyser. Mais le système ne savait pas *qui* avait lancé quel job.

C'est comme une salle d'attente sans tickets numérotés : n'importe qui pouvait théoriquement récupérer n'importe quelle commande.

Cette migration ajoute un **ticket numéroté** : la colonne `user_id` dans `jobs`. Désormais, chaque job sait à quel utilisateur il appartient. Le code de l'API peut ensuite filtrer : "montre-moi seulement les jobs de l'utilisateur n°42" — et pas ceux des autres.

---

### La colonne ajoutée en détail

```sql
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
```

- **`INTEGER`** : un numéro, l'identifiant de l'utilisateur dans la table `users`.
- **`REFERENCES users(id)`** : c'est un lien vers la table des utilisateurs — exactement comme a003 liait `produits` à `fournisseurs`. Si l'utilisateur n°42 existe dans la table `users`, le job peut lui appartenir.
- **`ON DELETE SET NULL`** : si l'utilisateur est supprimé, le job ne disparaît pas — il reste, mais sa colonne `user_id` passe à `NULL` (valeur vide). C'est un choix prudent : mieux vaut garder l'historique des jobs orphelins que les perdre définitivement.
- **`IF NOT EXISTS`** : si la colonne existe déjà (migration relancée par erreur), rien ne se passe. Prudence habituelle.

---

### Que se passe-t-il pour les jobs déjà existants ?

Le commentaire du fichier est explicite :

> Existing jobs have user_id=NULL and return 404 for all users.

Les anciens jobs (créés avant cette migration) auront `user_id = NULL`. Comme le filtre API cherche `WHERE job_id = X AND user_id = Y`, aucun utilisateur ne pourra les récupérer — ils retournent une erreur 404 ("introuvable"). Ce n'est pas un bug, c'est un choix de sécurité : les anciens jobs anonymes sont inaccessibles plutôt que visibles par tout le monde.

---

### La fonction `downgrade()`

```python
def downgrade() -> None:
    op.execute("ALTER TABLE jobs DROP COLUMN IF EXISTS user_id")
```

Retour en arrière : on supprime simplement la colonne. Toutes les données `user_id` stockées dans les jobs sont perdues à ce moment-là — c'est inévitable quand on supprime une colonne. Le `IF EXISTS` évite une erreur si la colonne n'existe pas.

---

## Peut-on optimiser ce fichier ?

**Ce fichier est minimal et fait exactement ce qu'il doit. C'est une bonne chose — les migrations courtes sont plus faciles à relire et déboguer.**

Deux observations mineures :

- **Pas d'index sur `user_id`** dans cette migration. Dès qu'on filtre des requêtes par `user_id` ("tous les jobs de l'utilisateur X"), un index accélère la recherche. Cet index est ajouté plus tard en a007 — le travail est donc fait, juste dans deux fichiers différents. On aurait pu tout mettre ici, mais le découper est aussi une approche valide.

- **`ON DELETE SET NULL`** est un choix pragmatique. L'alternative serait `ON DELETE CASCADE` (supprimer le job si l'utilisateur est supprimé) ou `ON DELETE RESTRICT` (interdire la suppression d'un utilisateur qui a des jobs). `SET NULL` est le plus souple, mais cela signifie que des jobs sans propriétaire peuvent s'accumuler. Un nettoyage périodique des jobs avec `user_id IS NULL` serait utile à long terme.
