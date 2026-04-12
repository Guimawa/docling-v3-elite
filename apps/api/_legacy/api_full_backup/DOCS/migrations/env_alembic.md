# env.py — Le chef d'orchestre des migrations

**Fichier :** `migrations/env.py`
**Dépend de :** rien (c'est le point de départ)
**Rôle :** Expliquer à Alembic comment se connecter à la base de données et lancer les migrations, que ce soit en mode "live" ou en mode "génération de script SQL".

---

## Le code

```python
"""
Alembic environment — Docling Agent v3
Uses asyncpg via SQLAlchemy async engine (no extra sync driver needed).
"""

import asyncio
import os
import re
import ssl as ssl_module
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

# Add apps/api to path so imports (core, services, etc.) resolve
_api_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _api_dir)
# Load .env from repo root (parent of apps/)
_root_dir = os.path.dirname(os.path.dirname(_api_dir))
from dotenv import load_dotenv  # noqa: E402 — must load .env before other imports

load_dotenv(os.path.join(_root_dir, ".env"))

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None


def _get_url_and_ssl() -> tuple[str, dict]:
    """Read DATABASE_URL from env, return (asyncpg_url, connect_args)."""
    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL non définie — impossible de lancer les migrations.")

    needs_ssl = "sslmode=require" in url or "sslmode=verify" in url

    # Strip sslmode from URL — asyncpg doesn't accept it as a query param;
    # we pass ssl via connect_args instead.
    url = re.sub(r"[?&]sslmode=[^&]*", "", url)
    url = url.replace("?&", "?").rstrip("?")

    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    connect_args: dict = {}
    if needs_ssl:
        ctx = ssl_module.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl_module.CERT_NONE
        connect_args["ssl"] = ctx

    return url, connect_args


def run_migrations_offline() -> None:
    """Generate SQL script without connecting to the database."""
    url, _ = _get_url_and_ssl()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    url, connect_args = _get_url_and_ssl()

    connectable = create_async_engine(
        url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations against a live database (async)."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

---

## Ce que ce fichier fait — en clair

### C'est quoi Alembic et pourquoi ce fichier existe ?

Alembic, c'est un outil qui gère les changements de structure de la base de données. Imagine que ta base de données est un classeur avec des tiroirs (tables). Chaque migration, c'est une instruction comme "ajoute un tiroir", "renomme cette étiquette", "mets un verrou sur ce tiroir". Alembic garde une liste ordonnée de toutes ces instructions.

`env.py` est le fichier de configuration qui répond à une seule question : **"Comment est-ce qu'on se connecte à la base pour appliquer ces instructions ?"**. C'est le mode d'emploi qu'Alembic lit avant de faire quoi que ce soit.

---

### Bloc 1 — Les imports et la mise en place du chemin

```python
_api_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _api_dir)
_root_dir = os.path.dirname(os.path.dirname(_api_dir))
load_dotenv(os.path.join(_root_dir, ".env"))
```

C'est comme donner une adresse postale au script avant qu'il parte faire des courses. Le script se trouve dans `migrations/`, mais il a besoin de connaître le chemin vers `apps/api/` (pour importer d'autres fichiers du projet) et vers la racine du projet (pour lire le fichier `.env` qui contient le mot de passe de la base de données).

`load_dotenv(...)` c'est l'équivalent d'ouvrir le carnet d'adresses secret : il charge la variable `DATABASE_URL` qui contient l'adresse + le mot de passe de la base de données Neon (PostgreSQL cloud).

---

### Bloc 2 — La fonction `_get_url_and_ssl()`

```python
def _get_url_and_ssl() -> tuple[str, dict]:
```

Cette fonction fait trois choses concrètes :

1. **Lire l'adresse de la base** : Elle récupère `DATABASE_URL` depuis l'environnement. Si elle ne trouve rien, elle s'arrête avec une erreur claire — pas question de partir sans savoir où aller.

2. **Nettoyer l'URL** : La base de données (Neon) fournit une URL avec `sslmode=require` dedans. Mais le pilote de connexion utilisé ici (asyncpg) ne comprend pas ce paramètre dans l'URL — il faut le lui donner différemment. Donc le code l'enlève de l'URL avec une expression régulière (comme effacer un mot d'une phrase avec du Tipp-Ex), puis le re-communique via un objet séparé `connect_args`.

3. **Adapter le format de l'URL** : Les URLs PostgreSQL commencent par `postgresql://`. Mais la bibliothèque de connexion asynchrone attend `postgresql+asyncpg://`. C'est un simple remplacement de préfixe, comme changer "Rue" en "Avenue" dans une adresse.

---

### Bloc 3 — Le mode "offline" (sans connexion)

```python
def run_migrations_offline() -> None:
```

Ce mode ne se connecte pas vraiment à la base. Il génère juste un fichier texte avec les commandes SQL que les migrations exécuteraient. C'est utile pour relire ce qui va se passer avant de le faire pour de vrai, ou pour donner le script à un administrateur qui appliquera lui-même les changements.

C'est comme préparer une liste de travaux à faire dans un appartement, sans encore appeler les artisans.

---

### Bloc 4 — Le mode "online" (connexion réelle, asynchrone)

```python
async def run_async_migrations() -> None:
def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())
```

C'est le mode normal : on se connecte vraiment à la base et on applique les migrations.

La particularité ici, c'est que la connexion est **asynchrone** (avec `async/await`). Cela signifie que le programme peut faire d'autres choses pendant qu'il attend une réponse de la base de données — c'est plus efficace. `asyncio.run(...)` est le démarreur qui lance ce moteur asynchrone depuis du code normal.

`pool.NullPool` signifie qu'on ne garde pas de connexion ouverte en permanence. Pour les migrations — qu'on lance une fois de temps en temps, pas des milliers de fois par seconde — c'est le bon choix. On ouvre, on fait le travail, on ferme.

---

### Bloc 5 — Le branchement final

```python
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

C'est l'aiguillage. Quand Alembic démarre, il regarde comment il a été appelé (avec l'option `--sql` pour offline, ou sans pour online) et choisit le bon chemin.

---

## Peut-on optimiser ce fichier ?

**Globalement non, ce fichier est propre et bien conçu.** Quelques observations honnêtes :

- **Le `ctx.check_hostname = False` + `ctx.verify_mode = ssl_module.CERT_NONE`** désactive la vérification du certificat SSL. C'est acceptable pour une base cloud gérée comme Neon (le certificat vient de leur infrastructure), mais en théorie moins sécurisé qu'une vérification complète. Ce compromis est courant avec asyncpg + Neon et documenté dans leur guide de connexion.

- **`target_metadata = None`** : Alembic peut en théorie comparer le schéma réel de la base avec les modèles Python (via `MetaData`) pour générer des migrations automatiquement. Ici ce n'est pas utilisé (migrations écrites à la main). Ce n'est pas un défaut — c'est un choix délibéré qui donne plus de contrôle et évite les surprises.

- **La gestion des chemins** avec `os.path.dirname(...)` en cascade est fonctionnelle mais un peu fragile si la structure de dossiers change. Une alternative plus robuste serait d'utiliser `pathlib.Path(__file__).parents[N]` — plus lisible. C'est une amélioration cosmétique mineure, pas urgente.

- **Pas de timeout de connexion configuré** dans `create_async_engine`. Si la base est temporairement inaccessible, le script attendra indéfiniment. Ajouter `connect_args["connect_timeout"] = 10` serait une petite sécurité supplémentaire.
