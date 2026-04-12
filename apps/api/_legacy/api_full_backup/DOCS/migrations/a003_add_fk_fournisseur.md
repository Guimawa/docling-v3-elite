# a003 — Lier les produits à leurs fournisseurs officiels

**Fichier :** `migrations/versions/a003_add_fk_fournisseur.py`
**Dépend de :** a002
**Rôle :** Créer un lien officiel (clé étrangère) entre la table `produits` et la table `fournisseurs`, pour garantir qu'un produit ne peut être associé qu'à un fournisseur qui existe vraiment.

---

## Le code

```python
"""Add FK produits.fournisseur -> fournisseurs(nom)

Revision ID: a003
Revises: a002
Create Date: 2026-02-25

IMPORTANT — Run this verification query on staging BEFORE upgrade:

    SELECT DISTINCT p.fournisseur
    FROM produits p
    LEFT JOIN fournisseurs f ON p.fournisseur = f.nom
    WHERE f.nom IS NULL;

    -- If non-empty: the upgrade() auto-inserts missing fournisseurs.
    -- Review the list to confirm they are real suppliers, not data errors.

FK: produits.fournisseur -> fournisseurs(nom)
    ON UPDATE CASCADE  (name change propagates)
    ON DELETE RESTRICT (can't delete supplier with products)
"""
from collections.abc import Sequence

from alembic import op

revision: str = "a003"
down_revision: str | None = "a002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Auto-insert fournisseurs referenced by produits but missing from fournisseurs table
    op.execute("""
        INSERT INTO fournisseurs (nom)
        SELECT DISTINCT p.fournisseur
        FROM produits p
        LEFT JOIN fournisseurs f ON p.fournisseur = f.nom
        WHERE f.nom IS NULL
          AND p.fournisseur IS NOT NULL
          AND p.fournisseur <> ''
        ON CONFLICT (nom) DO NOTHING
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_produits_fournisseur') THEN
                ALTER TABLE produits
                ADD CONSTRAINT fk_produits_fournisseur
                FOREIGN KEY (fournisseur) REFERENCES fournisseurs(nom)
                ON UPDATE CASCADE
                ON DELETE RESTRICT;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE produits DROP CONSTRAINT IF EXISTS fk_produits_fournisseur")
```

---

## Ce que ce fichier fait — en clair

### L'idée principale : obliger les produits à avoir un fournisseur qui existe

Avant cette migration, la colonne `fournisseur` dans la table `produits` était juste un champ texte libre. On pouvait y écrire n'importe quoi : `"BIGMAT"`, `"bigmat"`, `"Bigmat BTP 66"`, ou même `"azerty"`. Aucun lien officiel n'existait avec la table `fournisseurs`.

Cette migration crée une **clé étrangère** (Foreign Key, FK). C'est comme un lien physique entre deux fichiers. Si la table `produits` dit que l'article vient de "BIGMAT", la clé étrangère exige que "BIGMAT" existe bien dans la table `fournisseurs`. Sinon, l'enregistrement est refusé.

Analogie concrète : c'est comme remplir un bon de commande où la case "Fournisseur" est une liste déroulante — on ne peut pas taper un nom inventé, on choisit parmi les fournisseurs référencés.

---

### Bloc 1 — Nettoyer avant de verrouiller

```python
op.execute("""
    INSERT INTO fournisseurs (nom)
    SELECT DISTINCT p.fournisseur
    FROM produits p
    LEFT JOIN fournisseurs f ON p.fournisseur = f.nom
    WHERE f.nom IS NULL
      AND p.fournisseur IS NOT NULL
      AND p.fournisseur <> ''
    ON CONFLICT (nom) DO NOTHING
""")
```

Avant de poser le verrou (la clé étrangère), il faut que la base soit cohérente. Si certains produits mentionnent un fournisseur qui n'existe pas encore dans la table `fournisseurs`, la création du lien échouerait.

Ce bloc SQL fait le tour des produits, repère les fournisseurs mentionnés mais absents de la table officielle, et les insère automatiquement. `ON CONFLICT DO NOTHING` évite les doublons si jamais un nom existe déjà.

C'est comme, avant de coller une étiquette "référencé au catalogue" sur chaque boîte, vérifier qu'on a bien créé une fiche catalogue pour chaque fournisseur mentionné — et créer les fiches manquantes si besoin.

---

### Bloc 2 — Poser le lien officiel

```python
FOREIGN KEY (fournisseur) REFERENCES fournisseurs(nom)
ON UPDATE CASCADE
ON DELETE RESTRICT
```

Deux règles importantes dans ce lien :

- **`ON UPDATE CASCADE`** : Si on renomme un fournisseur dans la table `fournisseurs` (par exemple "BIGMAT" devient "BIGMAT France"), tous les produits qui le référencent sont mis à jour automatiquement. Le changement se propage comme une vague.

- **`ON DELETE RESTRICT`** : Si on essaie de supprimer un fournisseur qui a encore des produits associés, la base l'interdit. On ne peut pas effacer le fournisseur "BIGMAT" si des centaines de produits lui sont rattachés. Il faut d'abord traiter les produits. C'est une protection contre la suppression accidentelle de données.

---

### La vérification recommandée avant de lancer

Le commentaire en haut du fichier recommande de lancer une requête SQL sur l'environnement de test **avant** d'appliquer la migration en production :

```sql
SELECT DISTINCT p.fournisseur
FROM produits p
LEFT JOIN fournisseurs f ON p.fournisseur = f.nom
WHERE f.nom IS NULL;
```

Cette requête liste les fournisseurs mentionnés dans `produits` mais absents de `fournisseurs`. Si la liste n'est pas vide, il faut vérifier que ce sont de vrais fournisseurs et pas des erreurs de saisie (fautes de frappe, noms mal formatés). La migration les insèrera automatiquement, mais mieux vaut valider avant.

---

### La fonction `downgrade()`

```python
def downgrade() -> None:
    op.execute("ALTER TABLE produits DROP CONSTRAINT IF EXISTS fk_produits_fournisseur")
```

Retour en arrière : on supprime simplement le lien. Les données ne sont pas touchées (les fournisseurs auto-insérés lors de l'upgrade restent dans la table, mais ce n'est pas grave — ils ne gênent pas).

---

## Peut-on optimiser ce fichier ?

**Le fichier est bien pensé, avec une vraie attention aux données existantes. Deux points à noter :**

- **Le `downgrade()` ne supprime pas les fournisseurs auto-insérés** lors de l'`upgrade()`. Ce n'est pas forcément un problème (les fournisseurs ne font pas de mal), mais ce n'est pas non plus un retour à l'état exact d'avant. Un downgrade parfaitement symétrique noterait quels fournisseurs ont été ajoutés et les supprimerait. En pratique, c'est rarement nécessaire.

- **`ON UPDATE CASCADE` sur le nom du fournisseur** est un choix discutable. Utiliser le nom comme clé de référence (au lieu d'un identifiant numérique) signifie que tous les produits liés sont mis à jour si le nom change — pratique, mais si la table `fournisseurs` est grande et la colonne `fournisseur` non indexée dans `produits`, chaque renommage peut être lent. Un index sur `produits.fournisseur` serait une bonne idée complémentaire (ajouté dans a005).

- **La vérification idempotente** (`IF NOT EXISTS`) est bien présente pour la contrainte, ce qui est une bonne pratique.
