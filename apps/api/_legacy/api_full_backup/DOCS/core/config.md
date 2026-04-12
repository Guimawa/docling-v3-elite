# config.py — Le panneau de configuration de toute l'application

**Fichier :** `core/config.py`
**Rôle :** Lit toutes les clés secrètes et réglages depuis un fichier `.env`, les vérifie au démarrage, et les rend disponibles partout dans l'application.

---

## Le code

```python
"""
Configuration centralisée — Docling Agent v3
Toutes les variables d'environnement validées au démarrage via pydantic-settings.
"""

import logging
import sys
from pathlib import Path
from typing import ClassVar

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


def _env_path() -> Path:
    """Resolve .env from repo root (parent of apps/)."""
    return Path(__file__).resolve().parent.parent.parent.parent / ".env"


class _Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_env_path()),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    GEMINI_API_KEY: str = ""
    DATABASE_URL: str = ""
    DEFAULT_AI_MODEL: str = "gemini-3-flash-preview"
    WATCHDOG_FOLDER: str = "./Docling_Factures"
    WATCHDOG_ENABLED: bool = True
    STORJ_BUCKET: str = "docling-factures"
    STORJ_ACCESS_KEY: str = ""
    STORJ_SECRET_KEY: str = ""
    STORJ_ENDPOINT: str = "https://gateway.storjshare.io"
    PWA_URL: str = ""
    JWT_SECRET: str = ""
    JWT_EXPIRY_HOURS: int = 24
    SENTRY_DSN: str = ""
    ENVIRONMENT: str = "production"
    FREE_ACCESS_MODE: bool = False  # Accès provisoire sans auth (guest partagé)
    GEMINI_TIMEOUT_MS: int = 180000  # 3 min pour extraction factures longues
    DB_COMMAND_TIMEOUT: int = 60  # secondes pour requêtes lourdes (similarity)
    BYTEZ_API_KEY: str = ""  # Optionnel — API unifiée 100k+ modèles (docs.bytez.com)
    COMMUNITY_SALT: str = ""  # Salt pour hash base prix communautaire (SHA256)
    SERVICE_API_KEYS: str = ""  # Comma-separated API keys for external services (Pronto)
    PRONTO_URL: str = ""  # Pronto frontend URL for CORS

    MODELS_DISPONIBLES: ClassVar[dict[str, str]] = {
        "gemini-3-flash-preview": "models/gemini-3-flash-preview",
        "gemini-3.1-pro-preview": "models/gemini-3.1-pro-preview",
        "gemini-2.5-flash": "models/gemini-2.5-flash",
    }

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _strip_database_url(cls, v: str) -> str:
        return (v or "").strip()

    @property
    def DEFAULT_MODEL(self) -> str:  # noqa: N802 — alias constant
        return self.DEFAULT_AI_MODEL

    @property
    def ALLOWED_ORIGINS(self) -> list[str]:  # noqa: N802 — alias constant
        return [
            o for o in [
                "http://localhost:5173",
                "https://localhost:5173",
                "http://localhost:5174",
                "https://localhost:5174",
                "http://localhost:5175",
                "https://localhost:5175",
                "http://localhost:3000",
                "https://docling-agent.netlify.app",
                self.PWA_URL,
                self.PRONTO_URL,
            ] if o
        ]

    def validate_startup(self) -> None:
        errors: list[str] = []

        if not self.GEMINI_API_KEY:
            errors.append("GEMINI_API_KEY manquante dans .env")
        if not self.DATABASE_URL:
            errors.append("DATABASE_URL manquante dans .env")
        elif not self.DATABASE_URL.startswith("postgresql"):
            errors.append("DATABASE_URL doit commencer par postgresql://")
        if not self.JWT_SECRET:
            errors.append("JWT_SECRET manquant dans .env")
        elif len(self.JWT_SECRET) < 32:
            errors.append("JWT_SECRET doit faire au moins 32 caractères pour la sécurité")
        if self.DEFAULT_AI_MODEL not in self.MODELS_DISPONIBLES:
            safe_model = str(self.DEFAULT_AI_MODEL).replace("{", "{{").replace("}", "}}")
            errors.append(
                "DEFAULT_AI_MODEL='{}' invalide. Valeurs acceptées : {}".format(
                    safe_model, ", ".join(self.MODELS_DISPONIBLES)
                )
            )

        if self.ENVIRONMENT == "production" and self.FREE_ACCESS_MODE:
            errors.append("FREE_ACCESS_MODE interdit en production")

        Path(self.WATCHDOG_FOLDER).mkdir(parents=True, exist_ok=True)
        Path(self.WATCHDOG_FOLDER + "/Traitees").mkdir(parents=True, exist_ok=True)
        Path(self.WATCHDOG_FOLDER + "/Erreurs").mkdir(parents=True, exist_ok=True)

        if errors:
            for err in errors:
                logger.error(err)
            sys.exit(1)

        logger.info("Config OK — modele: %s", self.DEFAULT_MODEL)
        logger.info(
            "Watchdog: %s -> %s",
            "actif" if self.WATCHDOG_ENABLED else "desactive",
            self.WATCHDOG_FOLDER,
        )


_settings = _Settings()


class Config:
    """Facade preserving the original class-attribute API for backward compat."""

    GEMINI_API_KEY:     str       = _settings.GEMINI_API_KEY
    DATABASE_URL:       str       = _settings.DATABASE_URL
    DEFAULT_MODEL:      str       = _settings.DEFAULT_MODEL
    MODELS_DISPONIBLES: dict      = _Settings.MODELS_DISPONIBLES
    WATCHDOG_FOLDER:    str       = _settings.WATCHDOG_FOLDER
    WATCHDOG_ENABLED:   bool      = _settings.WATCHDOG_ENABLED
    STORJ_BUCKET:       str       = _settings.STORJ_BUCKET
    STORJ_ACCESS_KEY:   str       = _settings.STORJ_ACCESS_KEY
    STORJ_SECRET_KEY:   str       = _settings.STORJ_SECRET_KEY
    STORJ_ENDPOINT:     str       = _settings.STORJ_ENDPOINT
    ALLOWED_ORIGINS:    list[str] = _settings.ALLOWED_ORIGINS
    JWT_SECRET:         str       = _settings.JWT_SECRET
    JWT_EXPIRY_HOURS:   int       = _settings.JWT_EXPIRY_HOURS
    SENTRY_DSN:         str       = _settings.SENTRY_DSN
    ENVIRONMENT:        str       = _settings.ENVIRONMENT
    FREE_ACCESS_MODE:   bool      = _settings.FREE_ACCESS_MODE
    GEMINI_TIMEOUT_MS:  int       = _settings.GEMINI_TIMEOUT_MS
    DB_COMMAND_TIMEOUT: int       = _settings.DB_COMMAND_TIMEOUT
    BYTEZ_API_KEY:      str       = _settings.BYTEZ_API_KEY
    COMMUNITY_SALT:     str       = _settings.COMMUNITY_SALT
    SERVICE_API_KEYS:   str       = _settings.SERVICE_API_KEYS
    PRONTO_URL:         str       = _settings.PRONTO_URL

    @classmethod
    def get_service_keys(cls) -> set[str]:
        """Parse comma-separated service API keys."""
        if not cls.SERVICE_API_KEYS:
            return set()
        return {k.strip() for k in cls.SERVICE_API_KEYS.split(",") if k.strip()}

    @classmethod
    def validate(cls) -> None:
        _settings.validate_startup()
```

---

## Ce que ce fichier fait — en clair

### Le fichier `.env` : le carnet de secrets

Imagine que tu as un carnet où tu notes toutes tes informations confidentielles : le mot de passe de ta banque, le code de ta box internet, la clé de ton garage. Tu ne l'affiches pas sur ton mur, tu le gardes en sécurité.

Dans Docling, ce carnet s'appelle `.env`. Il contient des choses comme :
- La clé API pour accéder à Gemini (l'IA de Google)
- L'adresse et le mot de passe de la base de données
- La clé secrète pour signer les jetons d'authentification

Ce fichier `config.py` sait où trouver ce carnet et sait comment le lire.

---

### `_env_path()` — Trouver le carnet

```python
def _env_path() -> Path:
    return Path(__file__).resolve().parent.parent.parent.parent / ".env"
```

Cette petite fonction dit : "Le fichier `.env` est quatre dossiers au-dessus de moi." C'est comme donner des indications : "Sors de la cuisine, traverse le salon, monte l'escalier, tu trouveras la clé sous le paillasson."

---

### `_Settings` — La fiche de lecture

C'est la classe principale qui lit réellement le fichier `.env`. Elle ressemble à un formulaire administratif avec des cases pré-remplies :

- Si une case n'est pas remplie dans `.env`, elle utilise la valeur par défaut (par exemple, le modèle IA par défaut est `gemini-3-flash-preview`).
- Si une case est présente dans `.env`, elle écrase la valeur par défaut.

Chaque ligne comme `GEMINI_API_KEY: str = ""` signifie : "Je m'attends à trouver une clé API Gemini. Si elle n'est pas là, je note une chaîne vide pour l'instant."

**`MODELS_DISPONIBLES`** est un peu différent : c'est une liste figée des modèles IA autorisés. On ne peut pas en ajouter depuis le `.env`, c'est une décision de code. C'est comme la carte du menu d'un restaurant — le client ne peut pas inventer des plats.

---

### `_strip_database_url()` — Le correcteur automatique

```python
@field_validator("DATABASE_URL", mode="before")
def _strip_database_url(cls, v: str) -> str:
    return (v or "").strip()
```

Parfois, en copiant-collant une URL dans le `.env`, on laisse un espace au début ou à la fin. Cela suffit à tout casser. Ce mini-outil nettoie automatiquement ces espaces parasites, comme un correcteur orthographique qui enlève les fautes de frappe invisibles.

---

### `ALLOWED_ORIGINS` — La liste des visiteurs autorisés

```python
@property
def ALLOWED_ORIGINS(self) -> list[str]:
```

Pour des raisons de sécurité, un navigateur web n'accepte pas qu'une page sur `site-a.com` aille chercher des données sur `site-b.com` sans autorisation explicite. C'est la règle CORS (Cross-Origin Resource Sharing).

Cette propriété construit la liste des adresses autorisées à parler à l'API :
- Les adresses `localhost` pour les développeurs qui travaillent sur leur machine
- L'adresse Netlify en production
- Les URLs configurées dans `.env` (PWA_URL et PRONTO_URL)

C'est comme une liste d'invités à l'entrée d'un club — seuls ceux sur la liste peuvent entrer.

---

### `validate_startup()` — L'inspecteur du démarrage

C'est la fonction la plus importante de ce fichier. Elle s'exécute quand l'application démarre et vérifie que tout est en ordre, comme un pilote d'avion qui fait sa checklist avant de décoller :

1. **Clé Gemini présente ?** — Sans elle, l'IA ne peut pas travailler.
2. **URL de base de données présente et correcte ?** — Doit commencer par `postgresql://`.
3. **JWT_SECRET présent et assez long ?** — Au moins 32 caractères pour être inviolable.
4. **Modèle IA valide ?** — Doit être dans la liste autorisée.
5. **FREE_ACCESS_MODE interdit en production ?** — Ce mode "sans mot de passe" ne peut pas être actif en vrai.
6. **Création des dossiers de travail** — Si le dossier de surveillance des factures n'existe pas, il le crée.

Si l'un de ces points échoue, l'application **s'arrête immédiatement** (`sys.exit(1)`). Pas de démarrage en mode dégradé, pas de tolérance : soit tout est bon, soit on ne part pas.

---

### `Config` — La vitrine publique

```python
class Config:
    GEMINI_API_KEY: str = _settings.GEMINI_API_KEY
    ...
```

Une fois que `_Settings` a lu et validé toutes les valeurs, `Config` les copie et les expose de manière simple. Le reste de l'application importe `Config` et accède aux réglages comme ça :

```python
from core.config import Config
print(Config.GEMINI_API_KEY)
```

C'est la "vitrine" du magasin : propre, simple, lisible. La réserve avec tout le travail de chargement reste cachée derrière.

**`get_service_keys()`** est une méthode utilitaire qui transforme une liste de clés séparées par des virgules (`cle1,cle2,cle3`) en un ensemble Python. Pratique pour vérifier si une clé externe est autorisée.

---

## Peut-on optimiser ce fichier ?

**Ce qui fonctionne très bien :**
- L'utilisation de `pydantic-settings` est la bonne pratique en 2026. Elle assure la validation des types automatiquement et gère le chargement depuis `.env` de façon robuste.
- Le `validate_startup()` qui bloque le démarrage en cas d'erreur est une excellente approche : mieux vaut un crash clair au démarrage qu'un bug mystérieux en production.
- La séparation entre `_Settings` (logique) et `Config` (façade) est propre.

**Points qui pourraient être améliorés :**

1. **Source de vérité unique.** `Config` utilise une métaclasse : `Config.CLE` lit `_settings` (pydantic). Exceptions explicites : `DEFAULT_MODEL`, `ALLOWED_ORIGINS`, `MODELS_DISPONIBLES`. Nouveau champ `.env` → l’ajouter uniquement à `_Settings`. Export public : `from core.config import settings` (alias de `_settings`).

2. **`ALLOWED_ORIGINS` figé au chargement.** `_build_allowed_origins(_settings)` produit un tuple mis en cache ; `Config.ALLOWED_ORIGINS` renvoie une **copie liste** pour CORS / tests.

3. **Validation vs filesystem.** `validate_startup()` ne fait plus de `mkdir`. `setup_watchdog_folders()` est appelée à la fin de `Config.validate()` après les checks.

4. **`FREE_ACCESS_MODE`.** Documenté via `Field(..., description=...)` sur le modèle pydantic (rôle guest partagé + interdit en prod).

Ces points sont traités dans le code source ; garder ce bloc comme historique de décision.
