# a009 — Table des tokens de renouvellement pour une authentification sécurisée

**Fichier :** `migrations/versions/a009_refresh_tokens.py`
**Dépend de :** a008
**Rôle :** Créer la table `refresh_tokens` qui permet de renouveler l'authentification des utilisateurs de façon sécurisée, de révoquer un accès compromis, et de faire expirer les sessions anciennes.

---

## Le code

```python
"""Add refresh_tokens table for secure token rotation

Revision ID: a009
Revises: a008
Create Date: 2026-03-18

- Table refresh_tokens : stockage des refresh tokens (révocation, rotation)
- Index sur jti (unique) et user_id + expires_at (purge)
"""
from collections.abc import Sequence

from alembic import op

revision: str = "a009"
down_revision: str | None = "a008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id         SERIAL PRIMARY KEY,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            jti        TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked    BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens(jti)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS refresh_tokens")
```

---

## Ce que ce fichier fait — en clair

### Un peu de contexte : comment fonctionne l'authentification

Quand un utilisateur se connecte à l'application, il reçoit deux "billets" :

1. **L'access token** : un billet à courte durée de vie (quelques minutes à une heure). C'est le billet qu'il présente à chaque requête pour prouver qu'il est connecté.

2. **Le refresh token** : un billet à longue durée de vie (jours ou semaines). Il ne sert qu'à une chose : obtenir un nouvel access token quand l'ancien a expiré, sans avoir à se reconnecter.

C'est comme une clé de chambre d'hôtel (access token) et le contrat signé à la réception (refresh token). La clé peut être copiée ou volée, mais elle n'est valable que 24h. Quand elle expire, on revient à la réception montrer le contrat pour en obtenir une nouvelle.

---

### Pourquoi stocker les refresh tokens en base ?

Si le refresh token n'est stocké nulle part côté serveur, on ne peut pas le révoquer. Si un utilisateur se fait voler son téléphone, on ne peut pas l'empêcher d'utiliser le refresh token pour continuer à accéder au compte.

En stockant chaque refresh token en base de données, on peut :
- **Révoquer** un token spécifique (mettre `revoked = TRUE`)
- **Lister** toutes les sessions actives d'un utilisateur
- **Expirer** automatiquement les vieux tokens
- **Détecter** si un token révoqué est réutilisé (signe d'une attaque)

---

### La table `refresh_tokens` colonne par colonne

```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jti        TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
)
```

| Colonne | Ce que c'est |
|---|---|
| `id` | Numéro unique de la ligne |
| `user_id` | L'utilisateur à qui appartient ce token |
| `jti` | L'identifiant unique du token (JWT ID — voir ci-dessous) |
| `expires_at` | La date et heure d'expiration du token |
| `revoked` | `FALSE` = token valide, `TRUE` = token révoqué/annulé |
| `created_at` | La date de création automatique |

**Le `jti`** (JWT ID) est une petite chaîne de caractères aléatoire unique qui identifie chaque token. C'est comme un numéro de série imprimé sur un billet de banque — chaque billet a le sien, ce qui permet de détecter les faux ou les billets annulés.

**`ON DELETE CASCADE`** pour `user_id` : si l'utilisateur est supprimé, tous ses refresh tokens sont supprimés aussi automatiquement. C'est logique — un compte supprimé n'a plus besoin de tokens. C'est différent de a004 (`ON DELETE SET NULL`) : ici, les tokens sans utilisateur n'ont aucun sens, donc on les supprime plutôt que de les garder.

**`TIMESTAMPTZ`** : timestamp "avec fuseau horaire". Important pour une application qui couvre France et Espagne — les heures sont stockées en UTC (temps universel) et converties selon le fuseau lors de l'affichage. Pas de confusion possible entre l'heure française et l'heure espagnole.

---

### Les trois index

```python
op.execute("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens(jti)")
op.execute("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)")
op.execute("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)")
```

Trois index pour trois usages différents :

1. **`idx_refresh_tokens_jti`** : lors de chaque renouvellement de token, l'application cherche le token par son `jti`. Sans index, elle lirait toute la table. Avec cet index, la recherche est instantanée. C'est l'index le plus sollicité — plusieurs fois par heure pour chaque utilisateur actif.

2. **`idx_refresh_tokens_user_id`** : pour lister ou révoquer toutes les sessions d'un utilisateur ("déconnecter de tous les appareils").

3. **`idx_refresh_tokens_expires_at`** : pour le nettoyage automatique. Une tâche de maintenance peut régulièrement supprimer tous les tokens expirés avec `WHERE expires_at < NOW()`. Sans index, ce nettoyage lirait toute la table. Avec cet index, il est efficace même si la table contient des millions de lignes.

---

### La fonction `downgrade()`

```python
def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS refresh_tokens")
```

Minimaliste : on supprime la table et tous ses index (PostgreSQL supprime les index automatiquement quand on supprime leur table). Toutes les sessions actives sont invalidées — tous les utilisateurs devront se reconnecter.

---

## Peut-on optimiser ce fichier ?

**Ce fichier est excellent. C'est l'une des migrations les plus bien conçues de la série.**

Quelques observations mineures :

- **Le `jti` a déjà un `UNIQUE` en contrainte ET un index dédié**. En PostgreSQL, une contrainte `UNIQUE` crée automatiquement un index. L'index `idx_refresh_tokens_jti` est donc redondant — l'index unique créé par `UNIQUE` suffit pour les recherches par `jti`. Ce n'est pas un problème grave (juste un index en double qui prend un peu de place), mais c'est une légère inefficacité.

- **Pas de contrainte CHECK sur `expires_at`** : rien n'empêche d'enregistrer un token avec `expires_at` dans le passé. Une contrainte `CHECK (expires_at > created_at)` renforcerait l'intégrité, mais la validation est probablement faite côté code Python.

- **Pas de colonne `device_info` ou `ip_address`** : certaines implémentations de refresh tokens stockent l'appareil ou l'adresse IP pour aider l'utilisateur à identifier et révoquer des sessions suspectes ("Session depuis iPhone à Madrid — 15/03/2026"). C'est une amélioration future possible, pas un manque actuel.

- **La stratégie de purge** n'est pas définie dans la migration elle-même — c'est normal, c'est au code applicatif ou à une tâche planifiée de gérer le nettoyage des tokens expirés. L'index sur `expires_at` rend cette purge efficace le moment venu.
