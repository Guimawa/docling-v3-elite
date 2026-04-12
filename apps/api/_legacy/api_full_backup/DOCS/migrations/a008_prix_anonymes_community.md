# a008 — Partage communautaire de prix anonymisés

**Fichier :** `migrations/versions/a008_prix_anonymes_community.py`
**Dépend de :** a007
**Rôle :** Créer la table `prix_anonymes` pour le partage de prix entre artisans, et ajouter deux colonnes dans `users` pour gérer le consentement et la localisation géographique.

---

## Le code

```python
"""Add prix_anonymes table and user community consent columns

Revision ID: a008
Revises: a007
Create Date: 2026-03-01

- Table prix_anonymes for anonymous price sharing
- users.community_consent, users.zone_geo
"""
from collections.abc import Sequence

from alembic import op

revision: str = "a008"
down_revision: str | None = "a007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS community_consent BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS zone_geo VARCHAR(10)")
    op.execute("""
        CREATE TABLE IF NOT EXISTS prix_anonymes (
            id           SERIAL PRIMARY KEY,
            produit_hash TEXT NOT NULL,
            fournisseur  VARCHAR(200) NOT NULL,
            zone_geo     VARCHAR(10) NOT NULL,
            pays         CHAR(2) NOT NULL,
            prix_ht      NUMERIC(10,4) NOT NULL,
            date_facture DATE,
            created_at   TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_prix_anonymes_hash_zone ON prix_anonymes(produit_hash, zone_geo)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_prix_anonymes_fournisseur ON prix_anonymes(fournisseur)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS prix_anonymes")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS community_consent")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS zone_geo")
```

---

## Ce que ce fichier fait — en clair

### L'idée derrière cette migration : comparer les prix entre artisans

L'application traite des factures pour des artisans BTP. Une fonctionnalité avancée consiste à permettre à ces artisans de **comparer leurs prix** avec ceux pratiqués dans leur région — sans jamais révéler qui a payé quoi. C'est le principe du partage communautaire anonyme.

Cette migration pose les fondations techniques de cette fonctionnalité.

---

### Partie 1 — Les nouvelles colonnes dans `users`

```python
op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS community_consent BOOLEAN DEFAULT FALSE")
op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS zone_geo VARCHAR(10)")
```

Deux ajouts sur la table des utilisateurs :

- **`community_consent`** : un interrupteur oui/non. `FALSE` par défaut — l'utilisateur ne partage rien tant qu'il n'a pas explicitement accepté. C'est conforme au RGPD : pas de partage de données sans consentement. C'est comme une case à cocher "J'accepte de partager mes prix de façon anonyme avec la communauté" — décochée par défaut.

- **`zone_geo`** : la zone géographique de l'utilisateur (par exemple "FR66" pour le département des Pyrénées-Orientales, ou "ESP-CAT" pour la Catalogne espagnole). Ce champ, combiné au consentement, permet de grouper les prix par région pour des comparaisons pertinentes. Un artisan à Perpignan ne comparerait pas ses prix avec ceux pratiqués à Paris.

---

### Partie 2 — La table `prix_anonymes`

```sql
CREATE TABLE IF NOT EXISTS prix_anonymes (
    id           SERIAL PRIMARY KEY,
    produit_hash TEXT NOT NULL,
    fournisseur  VARCHAR(200) NOT NULL,
    zone_geo     VARCHAR(10) NOT NULL,
    pays         CHAR(2) NOT NULL,
    prix_ht      NUMERIC(10,4) NOT NULL,
    date_facture DATE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
)
```

Voici la table qui stocke les prix partagés, colonne par colonne :

| Colonne | Ce que c'est |
|---|---|
| `id` | Un numéro unique pour chaque entrée |
| `produit_hash` | Une empreinte numérique du produit (pas son nom — voir ci-dessous) |
| `fournisseur` | Le nom du fournisseur (BIGMAT, etc.) |
| `zone_geo` | La région géographique |
| `pays` | Le code pays sur 2 lettres (FR, ES...) |
| `prix_ht` | Le prix hors taxes, avec 4 décimales (précision centimétrique pour les prix) |
| `date_facture` | La date de la facture d'origine (optionnel) |
| `created_at` | La date d'insertion automatique |

**Le `produit_hash`** est l'élément clé de l'anonymisation. Au lieu de stocker "Ciment Portland 25kg CEM II/B-M", on stocke son empreinte numérique — une sorte de code unique généré à partir du nom, mais qui ne permet pas de retrouver le nom original. C'est comme donner un numéro de dossier à chaque produit : deux produits identiques ont le même numéro, mais ce numéro ne dit pas ce qu'est le produit. Ainsi, le système peut comparer des prix pour le "produit #A3F7B2" sans jamais divulguer qu'il s'agit de ciment.

**`NUMERIC(10,4)`** : le prix est stocké avec exactement 4 décimales (par exemple `12.5000`). Ce type est plus précis que les nombres flottants pour les montants financiers — il n'a pas les erreurs d'arrondi des flottants (un problème classique en informatique avec les calculs d'argent).

---

### Partie 3 — Les index de recherche

```python
op.execute("CREATE INDEX IF NOT EXISTS idx_prix_anonymes_hash_zone ON prix_anonymes(produit_hash, zone_geo)")
op.execute("CREATE INDEX IF NOT EXISTS idx_prix_anonymes_fournisseur ON prix_anonymes(fournisseur)")
```

Deux index pour accélérer les requêtes typiques :

- **`(produit_hash, zone_geo)`** : "Donne-moi tous les prix du produit #A3F7B2 dans la zone FR66." C'est la requête principale pour afficher "voici ce que paient les autres artisans de ta région pour ce produit."

- **`(fournisseur)`** : "Donne-moi tous les prix enregistrés chez BIGMAT." Utile pour analyser les prix d'un fournisseur en particulier.

---

### La fonction `downgrade()`

```python
def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS prix_anonymes")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS community_consent")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS zone_geo")
```

Suppression propre et complète : la table et les deux colonnes disparaissent. Toutes les données de prix partagés sont perdues — c'est inévitable, c'est leur table qui est supprimée.

---

## Peut-on optimiser ce fichier ?

**Ce fichier est bien conçu. Quelques réflexions pour aller plus loin :**

- **Pas de contrainte CHECK sur `pays`** : la colonne `pays CHAR(2)` accepte n'importe quelle valeur de 2 caractères ("FR", "ES", "XX", "ZZ"...). Une contrainte `CHECK (pays IN ('FR', 'ES'))` ou une validation au niveau applicatif éviterait les incohérences. Pour l'instant, la validation se fait côté code Python uniquement.

- **Pas de lien vers l'utilisateur** dans `prix_anonymes` : c'est voulu pour l'anonymat — on ne peut pas remonter de la table `prix_anonymes` à l'utilisateur qui a contribué ce prix. C'est une bonne chose du point de vue RGPD. En revanche, si on voulait permettre à un utilisateur de retirer ses contributions (droit à l'effacement RGPD), ce serait impossible sans ce lien. C'est un compromis à documenter.

- **`NUMERIC(10,4)` pour les prix** : bon choix pour éviter les erreurs d'arrondi. La précision de 4 décimales est suffisante (même les prix au millième de centime sont couverts).

- **`zone_geo VARCHAR(10)`** : format non standardisé. Une table de référence des zones géographiques autorisées (ou au moins une contrainte CHECK sur les formats valides) renforcerait l'intégrité des données.
