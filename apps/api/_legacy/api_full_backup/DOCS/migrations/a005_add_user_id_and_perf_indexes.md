# a005 — Attacher produits et factures aux utilisateurs, valider les prix, accélérer les recherches

**Fichier :** `migrations/versions/a005_add_user_id_and_perf_indexes.py`
**Dépend de :** a004
**Rôle :** Étendre l'isolation par utilisateur aux tables `produits` et `factures`, ajouter des règles de validation sur les prix, et créer des index pour que les recherches restent rapides même avec beaucoup de données.

---

## Le code

```python
"""Add user_id to produits/factures, CHECK constraints, and performance indexes

Revision ID: a005
Revises: a004
Create Date: 2026-02-26

- user_id on produits, factures (nullable, REFERENCES users(id))
- CHECK prix_brut_ht>=0, prix_remise_ht>=0, remise_pct BETWEEN 0 AND 100
- idx_produits_user_id, idx_produits_user_famille, idx_produits_user_fournisseur
- idx_factures_user_id, idx_factures_user_date
"""
from collections.abc import Sequence

from alembic import op

revision: str = "a005"
down_revision: str | None = "a004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # user_id sur produits/factures si absent (compatibilité schémas anciens)
    op.execute("""
        ALTER TABLE produits
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    """)
    op.execute("""
        ALTER TABLE factures
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_factures_user_id ON factures(user_id)")

    # Fix invalid data before adding CHECK constraints
    op.execute("UPDATE produits SET prix_brut_ht = 0 WHERE prix_brut_ht < 0")
    op.execute("UPDATE produits SET prix_remise_ht = 0 WHERE prix_remise_ht < 0")
    op.execute("""
        UPDATE produits SET remise_pct = GREATEST(0, LEAST(100, COALESCE(remise_pct, 0)))
        WHERE remise_pct < 0 OR remise_pct > 100
    """)
    op.execute("""
        ALTER TABLE produits ADD CONSTRAINT ck_produits_prix_brut_ht CHECK (prix_brut_ht >= 0)
    """)
    op.execute("""
        ALTER TABLE produits ADD CONSTRAINT ck_produits_prix_remise_ht CHECK (prix_remise_ht >= 0)
    """)
    op.execute("""
        ALTER TABLE produits ADD CONSTRAINT ck_produits_remise_pct CHECK (remise_pct BETWEEN 0 AND 100)
    """)

    # Indexes performance
    op.execute("CREATE INDEX IF NOT EXISTS idx_produits_user_id ON produits(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_produits_user_famille ON produits(user_id, famille)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_produits_user_fournisseur ON produits(user_id, fournisseur)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_factures_user_date ON factures(user_id, created_at DESC)")


def downgrade() -> None:
    op.execute("ALTER TABLE produits DROP CONSTRAINT IF EXISTS ck_produits_remise_pct")
    op.execute("ALTER TABLE produits DROP CONSTRAINT IF EXISTS ck_produits_prix_remise_ht")
    op.execute("ALTER TABLE produits DROP CONSTRAINT IF EXISTS ck_produits_prix_brut_ht")
    op.execute("DROP INDEX IF EXISTS idx_factures_user_date")
    op.execute("DROP INDEX IF EXISTS idx_factures_user_id")
    op.execute("DROP INDEX IF EXISTS idx_produits_user_fournisseur")
    op.execute("DROP INDEX IF EXISTS idx_produits_user_famille")
    op.execute("DROP INDEX IF EXISTS idx_produits_user_id")
```

---

## Ce que ce fichier fait — en clair

Cette migration fait trois choses distinctes dans l'ordre. Il est important de suivre cet ordre — l'une prépare le terrain pour la suivante.

---

### Partie 1 — Rattacher produits et factures à leur propriétaire

```python
ALTER TABLE produits ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
ALTER TABLE factures ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
```

Même logique qu'en a004 pour les jobs : on ajoute un `user_id` pour que chaque produit et chaque facture appartienne à un utilisateur. C'est comme écrire le nom du propriétaire sur chaque dossier dans un classeur partagé — ça permet ensuite à chacun de ne voir que ses propres dossiers.

---

### Partie 2 — Corriger les données invalides, puis poser des règles sur les prix

```python
UPDATE produits SET prix_brut_ht = 0 WHERE prix_brut_ht < 0
UPDATE produits SET prix_remise_ht = 0 WHERE prix_remise_ht < 0
UPDATE produits SET remise_pct = GREATEST(0, LEAST(100, COALESCE(remise_pct, 0)))
    WHERE remise_pct < 0 OR remise_pct > 100
```

Avant d'interdire les prix négatifs et les remises aberrantes, le code **nettoie d'abord les données existantes**. Si on posait la règle sans ce nettoyage, la migration échouerait sur les lignes déjà invalides.

C'est comme avant d'installer un filtre sur un robinet : on vide et nettoie d'abord le tuyau, sinon le filtre se bouche immédiatement.

- Les prix négatifs sont remis à zéro (un prix ne peut pas être négatif dans ce contexte).
- Les remises hors de la fourchette 0–100 % sont recadrées : `GREATEST(0, LEAST(100, valeur))` — si c'est en dessous de 0, on prend 0 ; si c'est au-dessus de 100, on prend 100. `COALESCE(..., 0)` remplace les valeurs vides (NULL) par 0.

Ensuite, les trois règles CHECK sont posées :

| Contrainte | Règle |
|---|---|
| `ck_produits_prix_brut_ht` | Le prix brut HT ne peut pas être négatif |
| `ck_produits_prix_remise_ht` | Le prix remisé HT ne peut pas être négatif |
| `ck_produits_remise_pct` | La remise doit être entre 0 et 100 % |

---

### Partie 3 — Créer des index pour aller vite

```python
CREATE INDEX IF NOT EXISTS idx_produits_user_id ON produits(user_id)
CREATE INDEX IF NOT EXISTS idx_produits_user_famille ON produits(user_id, famille)
CREATE INDEX IF NOT EXISTS idx_produits_user_fournisseur ON produits(user_id, fournisseur)
CREATE INDEX IF NOT EXISTS idx_factures_user_id ON factures(user_id)
CREATE INDEX IF NOT EXISTS idx_factures_user_date ON factures(user_id, created_at DESC)
```

Un **index** en base de données, c'est comme l'index alphabétique à la fin d'un livre. Sans index, pour trouver tous les produits de l'utilisateur 42, la base doit lire toutes les lignes une par une. Avec un index sur `user_id`, elle sait exactement où aller chercher — comme sauter directement à la page "U" dans le dictionnaire.

Les index combinés (comme `user_id, famille`) permettent d'accélérer les requêtes qui filtrent sur les deux colonnes à la fois : "tous les produits de l'utilisateur 42 dans la famille Plomberie".

`created_at DESC` dans `idx_factures_user_date` signifie que l'index est trié du plus récent au plus ancien — parfait pour afficher l'historique des factures d'un utilisateur, les plus récentes en premier.

---

### La fonction `downgrade()`

Le retour en arrière supprime les contraintes et les index. Notez que les colonnes `user_id` elles-mêmes ne sont pas supprimées dans ce `downgrade()` — c'est une légère incohérence (elles ont été ajoutées dans cet `upgrade()` mais ne sont pas retirées dans ce `downgrade()`). Ce n'est pas bloquant en pratique car le `downgrade()` est rarement utilisé en production.

---

## Peut-on optimiser ce fichier ?

**Ce fichier est dense mais bien structuré. Quelques observations :**

- **Le `downgrade()` est incomplet** : il ne supprime pas les colonnes `user_id` ajoutées dans l'`upgrade()`, ni les colonnes `user_id` de `factures`. C'est la seule vraie lacune — si on revient en arrière, on se retrouve avec des colonnes orphelines. Pas critique, mais à noter.

- **Les contraintes CHECK sur les prix** (`ck_produits_prix_brut_ht`, etc.) ne sont pas posées de façon idempotente (pas de `IF NOT EXISTS`). Si la migration est relancée sur une base où les contraintes existent déjà, elle plante. Les migrations a002 et a003 utilisaient le pattern `DO $$ IF NOT EXISTS $$` — ici ce n'est pas fait. C'est une inconsistance de style qui pourrait causer des problèmes si on rejoue les migrations.

- **L'ordre des opérations est correct et important** : nettoyer les données invalides AVANT de poser les contraintes. C'est une bonne pratique qui évite les échecs de migration sur des bases avec de l'historique.

- **Les index sont bien choisis** : les index composites `(user_id, famille)` et `(user_id, fournisseur)` correspondent exactement aux patterns de requêtes typiques de l'application (filtrer par utilisateur, puis par catégorie ou fournisseur).
