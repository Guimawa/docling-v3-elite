# a001 — Création de la base de données

**Fichier :** `migrations/versions/a001_baseline_schema.py`
**Date :** 25 février 2026
**Rôle :** Construire tous les tiroirs (tables) de la base de données depuis zéro

---

## Le code

```python
"""Baseline schema from schema_neon.sql

Revision ID: a001
Revises:
Create Date: 2026-02-25

For an EXISTING database (staging/prod):
    alembic stamp a001        # marks baseline as applied without executing
For a NEW database:
    alembic upgrade head      # creates all tables from scratch
"""
from collections.abc import Sequence

from alembic import op

revision: str = "a001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # ── Fournisseurs ──────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS fournisseurs (
            id         SERIAL PRIMARY KEY,
            nom        VARCHAR(200) UNIQUE NOT NULL,
            pays       VARCHAR(10)  DEFAULT 'ES',
            langue     VARCHAR(10)  DEFAULT 'ca',
            created_at TIMESTAMPTZ  DEFAULT NOW()
        )
    """)

    # ── Produits ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS produits (
            id               SERIAL PRIMARY KEY,
            fournisseur      VARCHAR(200) NOT NULL,
            designation_raw  TEXT         NOT NULL,
            designation_fr   TEXT         NOT NULL,
            famille          VARCHAR(100),
            unite            VARCHAR(50),
            prix_brut_ht     NUMERIC(10,4) DEFAULT 0,
            remise_pct       NUMERIC(5,2)  DEFAULT 0,
            prix_remise_ht   NUMERIC(10,4) DEFAULT 0,
            prix_ttc_iva21   NUMERIC(10,4) DEFAULT 0,
            numero_facture   VARCHAR(100),
            date_facture     DATE,
            confidence       VARCHAR(10)   DEFAULT 'high',
            source           VARCHAR(20)   DEFAULT 'pc',
            created_at       TIMESTAMPTZ   DEFAULT NOW(),
            updated_at       TIMESTAMPTZ   DEFAULT NOW(),
            UNIQUE(designation_raw, fournisseur)
        )
    """)

    # ── Jobs ──────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            job_id     UUID PRIMARY KEY,
            status     VARCHAR(20) DEFAULT 'processing',
            result     JSONB,
            error      TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC)")

    # ── Factures ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS factures (
            id                   SERIAL PRIMARY KEY,
            filename             VARCHAR(500),
            statut               VARCHAR(20)  DEFAULT 'traite',
            nb_produits_extraits INTEGER      DEFAULT 0,
            cout_api_usd         NUMERIC(8,6) DEFAULT 0,
            modele_ia            VARCHAR(50)  DEFAULT 'gemini-3-flash',
            source               VARCHAR(20)  DEFAULT 'pc',
            pdf_url              TEXT,
            created_at           TIMESTAMPTZ  DEFAULT NOW()
        )
    """)

    # ── Indexes produits ──────────────────────────────────────────
    op.execute("CREATE INDEX IF NOT EXISTS idx_produits_famille ON produits(famille)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_produits_fournisseur ON produits(fournisseur)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_produits_updated ON produits(updated_at DESC)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_trgm_raw "
        "ON produits USING GIN (designation_raw gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_trgm_fr "
        "ON produits USING GIN (designation_fr gin_trgm_ops)"
    )
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_produits_search_combined
        ON produits USING GIN (
            (designation_raw || ' ' || designation_fr || ' ' || fournisseur) gin_trgm_ops
        )
    """)

    # ── Trigger updated_at ────────────────────────────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION trigger_set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """)
    op.execute("DROP TRIGGER IF EXISTS set_updated_at ON produits")
    op.execute("""
        CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON produits
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()
    """)

    # ── Prix historique ───────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS prix_historique (
            id          SERIAL PRIMARY KEY,
            produit_id  INTEGER REFERENCES produits(id) ON DELETE CASCADE,
            fournisseur VARCHAR(200) NOT NULL,
            designation_fr TEXT NOT NULL,
            prix_ht     NUMERIC(10,4) NOT NULL,
            prix_brut   NUMERIC(10,4),
            remise_pct  NUMERIC(5,2) DEFAULT 0,
            facture_id  INTEGER REFERENCES factures(id) ON DELETE SET NULL,
            recorded_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_prixhist_produit "
        "ON prix_historique(produit_id, recorded_at DESC)"
    )

    # ── Users ─────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            SERIAL PRIMARY KEY,
            email         VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name  VARCHAR(200),
            role          VARCHAR(20) DEFAULT 'user',
            created_at    TIMESTAMPTZ DEFAULT NOW()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS set_updated_at ON produits")
    op.execute("DROP FUNCTION IF EXISTS trigger_set_updated_at()")
    op.execute("DROP TABLE IF EXISTS prix_historique CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")
    op.execute("DROP TABLE IF EXISTS jobs CASCADE")
    op.execute("DROP TABLE IF EXISTS factures CASCADE")
    op.execute("DROP TABLE IF EXISTS produits CASCADE")
    op.execute("DROP TABLE IF EXISTS fournisseurs CASCADE")
```

---

## Ce que ce fichier fait — en clair

Ce fichier, c'est le **plan d'architecte de la base de données**.
Avant de pouvoir stocker quoi que ce soit, il faut construire les meubles.
Ce fichier construit **6 tiroirs** (appelés tables) dans lesquels l'application va ranger toutes ses données.

---

### Tiroir 1 — `fournisseurs` : l'annuaire des vendeurs

Imagine un carnet d'adresses. Pour chaque fournisseur (BIGMAT, Leroy Merlin, etc.) on note :
- un numéro automatique (le `id`)
- son nom — obligatoire, et unique : on ne peut pas avoir BIGMAT en double
- son pays — Espagne par défaut
- sa langue — catalan par défaut
- la date où il a été ajouté

---

### Tiroir 2 — `produits` : le catalogue de prix

C'est **le tiroir central**, le plus important de toute l'application.
Chaque ligne = un produit d'une facture. On y note :

| Ce qu'on stocke | Ce que ça veut dire |
|---|---|
| `fournisseur` | Qui vend ce produit |
| `designation_raw` | Le nom exact sur la facture (peut être en catalan ou espagnol) |
| `designation_fr` | Le nom traduit en français par l'IA |
| `famille` | La catégorie : béton, bois, ferraille… |
| `unite` | L'unité de mesure : m², kg, litre… |
| `prix_brut_ht` | Le prix d'origine avant remise |
| `remise_pct` | La remise accordée, en pourcentage |
| `prix_remise_ht` | Le prix après remise, hors taxe |
| `prix_ttc_iva21` | Le prix final avec TVA à 21% |
| `confidence` | L'IA est-elle sûre de son extraction ? (high / low) |
| `source` | Facture envoyée depuis un mobile ou un PC ? |

**Règle importante :** le même produit du même fournisseur ne peut pas exister deux fois.
Si on essaie d'en ajouter un doublon, la base refuse et met à jour l'existant à la place.

---

### Tiroir 3 — `jobs` : le suivi des traitements

Quand tu envoies une photo de facture, l'application ne traite pas immédiatement sous tes yeux.
Elle crée une **tâche en arrière-plan** et te donne un ticket de suivi.

Ce tiroir enregistre :
- l'identifiant unique du ticket (UUID — un code impossible à deviner)
- l'état : en cours / terminé / erreur
- le résultat quand c'est fini (les produits trouvés)
- le message d'erreur si ça a planté

L'index sur `created_at DESC` = les tâches les plus récentes apparaissent en premier, comme un fil d'actualité.

---

### Tiroir 4 — `factures` : le journal des factures traitées

C'est le **registre comptable** de tout ce qui a été envoyé.
Pour chaque facture analysée, on garde une trace :
- le nom du fichier PDF ou photo
- si le traitement a réussi ou non
- combien de produits ont été extraits
- combien ça a coûté en crédits IA (en dollars — l'API Gemini se paie à l'usage)
- quel modèle Gemini a été utilisé (Flash = rapide/pas cher, Pro = lent/précis)
- le lien vers le PDF archivé dans le cloud (Storj)

---

### Tiroir 5 — `prix_historique` : la mémoire des prix dans le temps

Quand le prix d'un produit change, on ne l'écrase pas — on garde l'ancien.
Ce tiroir est un **livre de bord des évolutions de prix**.

Ça permet de voir :
- "En janvier BIGMAT vendait le sable à 12€/m², en mars il est à 14€" → +16%
- "Ce fournisseur a augmenté ses prix 3 fois en 6 mois"

Les liens (`REFERENCES`) :
- Si le produit est supprimé → son historique aussi (`CASCADE`)
- Si la facture est supprimée → le lien se coupe mais l'historique reste (`SET NULL`)

---

### Tiroir 6 — `users` : les comptes utilisateurs

La liste des personnes qui ont un compte dans l'application :
- email (unique — on ne peut pas avoir deux comptes avec le même email)
- mot de passe **chiffré** (jamais stocké en clair — jamais)
- prénom/nom affiché
- rôle : `user` normal ou `admin`

---

### Les index — les onglets du classeur

Sans index, chercher "tous les produits béton de BIGMAT" = lire chaque ligne une par une.
Avec un index, la base de données va directement au bon endroit.

Les index **GIN + pg_trgm** sont spéciaux :
ils permettent la **recherche floue**.
Si tu tapes "cimen" → tu trouves "Ciment CEM I 42.5".
Si tu tapes "bigma" → tu trouves "BIGMAT Barcelone".
C'est la même logique que la barre de recherche Google qui devine ce que tu veux écrire.

---

### Le trigger — le gardien automatique

C'est un mini-programme qui tourne tout seul dans la base.
Sa mission : chaque fois qu'un produit est modifié, mettre à jour automatiquement la date `updated_at`.
Tu n'as pas à t'en souvenir dans le code — c'est la base qui s'en charge.

---

### La fonction `downgrade` — le plan de démolition

Si on doit revenir en arrière (rollback), ce bloc supprime tout dans l'ordre inverse.
On commence par les petits tiroirs qui dépendent des grands, puis les grands.
Supprimer dans le mauvais ordre provoquerait des erreurs (on ne peut pas supprimer un meuble auquel d'autres meubles sont attachés).

---

## Peut-on optimiser ce fichier ?

**Oui, 3 points à améliorer :**

### 1. La table `fournisseurs` est sous-utilisée
La table `fournisseurs` existe, mais la table `produits` stocke le nom du fournisseur en texte libre (`VARCHAR`) au lieu d'utiliser une vraie liaison vers `fournisseurs.id`.
Résultat : si BIGMAT change de nom, il faut le changer dans chaque ligne de `produits` au lieu d'une seule fois.
→ La migration `a003` corrige en partie ça, mais la liaison reste incomplète.

### 2. La colonne `confidence` devrait être une liste fermée
Actuellement `confidence` accepte n'importe quel texte.
Si quelqu'un met "HAUT" au lieu de "high", la base accepte sans broncher.
→ Il faudrait un `CHECK (confidence IN ('high', 'low'))` pour interdire les valeurs invalides.

### 3. La table `users` manque de colonnes de sécurité
`users` n'a pas de `last_login_at` ni de `is_active` (compte désactivé ou non).
→ Les migrations suivantes (a009) ajoutent le refresh token, mais ces deux colonnes restent absentes et obligent à des contournements dans le code.

---

**En résumé :** ce fichier est solide et bien structuré pour une v1. Les 3 points ci-dessus sont des améliorations de qualité, pas des bugs urgents.
