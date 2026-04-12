"""
Configuration centralisée — Docling Agent v3
Toutes les variables d'environnement validées au démarrage via pydantic-settings.
"""

import json
import logging
import os
from pathlib import Path
from typing import ClassVar

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from frozendict import frozendict

logger = logging.getLogger(__name__)


class ConfigurationError(SystemExit):
    """Raised when startup configuration validation fails.

    Subclasses ``SystemExit`` so that:
    - existing ``pytest.raises(SystemExit)`` tests stay green,
    - FastAPI/uvicorn shutdown handlers still run (no brutal ``sys.exit``),
    - callers can catch a *named* exception when needed.
    """

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__(
            "Configuration invalide :\n  • " + "\n  • ".join(errors)
        )


# USD / 1M tokens — surcharges via GEMINI_COST_PER_MILLION_JSON (JSON objet)
_DEFAULT_GEMINI_COST_PER_MILLION = frozendict({
    "gemini-3-flash-preview": 0.10,
    "gemini-3.1-pro-preview": 2.50,
    "gemini-2.5-flash": 0.30,
    "mistral-ocr-latest": 1.00,
    "mistral-ocr-2512": 1.00,
    "chandra-ocr-2": 0.15,
    "lightonocr-2-1b": 0.05,
})


def _env_path() -> Path:
    """Resolve .env from repo root (parent of apps/)."""
    return Path(__file__).resolve().parent.parent.parent.parent / ".env"


class _Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_env_path()),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_VERSION: str = "3.0.0"
    GEMINI_API_KEY: str = ""
    MISTRAL_API_KEY: str = ""
    CHANDRA_API_KEY: str = ""
    LIGHTON_API_KEY: str = ""
    DATABASE_URL: str = ""
    DEFAULT_AI_MODEL: str = "gemini-3.1-pro-preview"
    SYNC_AGENT_FOLDER: str = "./Docling_Sync"
    SYNC_AGENT_ENABLED: bool = True
    STORJ_BUCKET: str = "docling-factures"
    STORJ_ACCESS_KEY: str = ""
    STORJ_SECRET_KEY: str = ""
    STORJ_ENDPOINT: str = "https://gateway.storjshare.io"
    PWA_URL: str = ""
    JWT_SECRET: str = ""
    JWT_REFRESH_SECRET: str = (
        ""  # distinct de JWT_SECRET — lu depuis .env (requis validate_startup)
    )
    # Refresh token (secondes) — défaut 7 jours ; aligné cookie DB + JWT exp
    JWT_REFRESH_EXPIRY_SECONDS: int = Field(
        default=604800,
        ge=300,
        le=365 * 24 * 3600,
        description="Durée de vie du refresh token en secondes.",
    )
    # Argon2id — surcharge sans modifier le code (recommandations OWASP / matériel)
    ARGON2_TIME_COST: int = Field(default=3, ge=1, le=10)
    ARGON2_MEMORY_COST: int = Field(default=65536, ge=8192, le=2**24)
    ARGON2_PARALLELISM: int = Field(default=2, ge=1, le=8)
    # Anti-DoS (Argon2 / HIBP SHA1) — troncature + validation inscription
    PASSWORD_MAX_LENGTH: int = Field(default=1000, ge=64, le=4096)
    SENTRY_DSN: str = ""
    ENVIRONMENT: str = "production"
    DISABLE_RATE_LIMIT: bool = False
    RATE_LIMIT_STORAGE_URI: str | None = None
    FREE_ACCESS_MODE: bool = Field(
        default=False,
        description=(
            "Si true : l'API accepte les requêtes sans JWT et associe un utilisateur "
            "'guest' partagé (même user_id pour tous) pour débloquer scan/catalogue en dev. "
            "À n'utiliser qu'en développement — interdit en production (voir validate_startup)."
        ),
    )
    GEMINI_TIMEOUT_MS: int = 180000  # 3 min pour extraction factures longues
    MISTRAL_TIMEOUT_MS: int = 180000  # 3 min pour OCR Mistral documents longs
    CHANDRA_TIMEOUT_MS: int = 180000  # 3 min pour OCR Chandra self-hosted
    LIGHTON_TIMEOUT_MS: int = 120000  # 2 min pour OCR LightOn local/self-hosted
    GEMINI_MAX_RETRIES: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Tentatives d’extraction Gemini (backoff sur 429 / RESOURCE_EXHAUSTED).",
    )
    MISTRAL_MAX_RETRIES: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Tentatives OCR Mistral (backoff sur 429/5xx).",
    )
    # Mistral Document AI — table_format (html|markdown) pour OCR 2512+ ; vide = ne pas envoyer le champ
    MISTRAL_OCR_TABLE_FORMAT: str = Field(
        default="html",
        description="Format des tableaux renvoyés par Mistral OCR (html ou markdown). Vide pour omettre.",
    )
    # Pipeline optionnel : OCR pur (markdown) puis structuration via chat (ex. scans difficiles)
    MISTRAL_OCR_TWO_STEP: bool = Field(
        default=False,
        description="Si true : POST /v1/ocr sans annotation, puis /v1/chat/completions pour le JSON Docling.",
    )
    MISTRAL_STRUCTURING_MODEL: str = Field(
        default="mistral-large-latest",
        description="Modèle chat Mistral pour l’étape 2 lorsque MISTRAL_OCR_TWO_STEP=true.",
    )
    CHANDRA_MAX_RETRIES: int = Field(
        default=2,
        ge=1,
        le=10,
        description="Tentatives OCR Chandra (backoff sur 429/5xx).",
    )
    LIGHTON_MAX_RETRIES: int = Field(
        default=2,
        ge=1,
        le=10,
        description="Tentatives OCR LightOn (backoff sur 429/5xx).",
    )
    # --- Moteur "Géant" 2026 ---
    OCR_ENGINE: str = Field(
        default="standard",
        description="standard = Gemini/Tesseract ; elite = IBM Docling (Giant Tech).",
    )
    IMAGE_PREPROCESS_MODE: str = Field(
        default="basic",
        description="basic = Dénouage/CLAHE ; pro_scan = Perspective Warp (Adobe Scan style).",
    )
    # Endpoints d'orchestration self-hosted (wrapper HTTP interne)
    CHANDRA_BASE_URL: str = ""
    LIGHTON_BASE_URL: str = ""
    # JSON optionnel : {"gemini-3-flash-preview":0.10,"gemini-3.1-pro-preview":2.5} (USD / 1M tokens)
    GEMINI_COST_PER_MILLION_JSON: str = ""
    DB_COMMAND_TIMEOUT: int = 60  # secondes pour requêtes lourdes (similarity)
    BYTEZ_API_KEY: str = ""  # Optionnel — API unifiée 100k+ modèles (docs.bytez.com)
    COMMUNITY_SALT: str = ""  # Salt pour hash base prix communautaire (SHA256)
    COMMUNITY_K_ANONYMITY_MIN: int = Field(
        default=5,
        ge=2,
        le=50,
        description="Seuil minimal de contributions (k-anonymité) pour exposer un agrégat.",
    )
    SERVICE_API_KEYS: str = ""  # Comma-separated API keys for external services (Pronto)
    PRONTO_URL: str = ""  # Pronto frontend URL for CORS
    CORS_EXTRA_ORIGINS: str = Field(
        default="",
        description=(
            "Origines CORS supplémentaires (séparées par des virgules), ex. preview Netlify "
            "ou domaine custom, en plus de PWA_URL et des entrées codées en dur."
        ),
    )

    # Scan : inline (défaut, BackgroundTasks) ou queue (pending + worker + stockage objet)
    SCAN_JOB_EXECUTION: str = Field(
        default="inline",
        description="inline = extraction dans le process API ; queue = job pending + worker.",
    )
    WORKER_POLL_INTERVAL_MS: int = Field(default=1000, ge=100, le=600_000)
    WORKER_CONCURRENCY: int = Field(default=1, ge=1, le=32)
    # s3 = Storj/S3 (boto3) ; gcs = Google Cloud Storage (google-cloud-storage)
    STORAGE_BACKEND: str = Field(default="s3", description="Backend stockage objets : s3 | gcs")
    GCS_BUCKET: str = ""
    # PDF : seuil minimal de caractères extraits par page (PyMuPDF) pour privilégier la couche texte
    PDF_TEXT_MIN_CHARS_PER_PAGE: int = Field(default=40, ge=0, le=5000)

    GOOGLE_OAUTH_ENABLED: bool = Field(
        default=False,
        description="Active les routes Google OAuth (start/callback/link). Si true, client_id/secret/redirect requis.",
    )
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    # Monétisation Stripe (optionnel — voir SPEC-SERVICE-PAYANT-2026)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_ID: str = ""  # Legacy/Default
    STRIPE_PRICE_STARTER_9: str = ""
    STRIPE_PRICE_PRO_19: str = ""
    STRIPE_PRICE_ELITE_29: str = ""
    # Chemins relatifs au PWA (URL absolue = PWA_URL ou http://localhost:5173)
    STRIPE_CHECKOUT_SUCCESS_PATH: str = "/settings?checkout=success"
    STRIPE_CHECKOUT_CANCEL_PATH: str = "/tarifs"
    # Retour portail client Stripe (chemin relatif à PWA_URL)
    STRIPE_PORTAL_RETURN_PATH: str = "/settings"

    MODELS_DISPONIBLES: ClassVar[frozendict] = frozendict({
        "gemini-3-flash-preview": "models/gemini-3-flash-preview",
        "gemini-3.1-pro-preview": "models/gemini-3.1-pro-preview",
        "gemini-2.5-flash": "models/gemini-2.5-flash",
        "mistral-ocr-latest": "mistral-ocr-latest",
        "mistral-ocr-2512": "mistral-ocr-2512",
        "chandra-ocr-2": "chandra-ocr-2",
        "lightonocr-2-1b": "lightonocr-2-1b",
        "docling-ibm-pro": "docling-ibm-pro",
    })

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _strip_database_url(cls, v: str) -> str:
        from core.db_url import strip_postgresql_dsn_query

        raw = (v or "").strip()
        if not raw:
            return raw
        return strip_postgresql_dsn_query(raw)

    @property
    def DEFAULT_MODEL(self) -> str:  # noqa: N802 — alias constant
        return self.DEFAULT_AI_MODEL

    def validate_startup(self) -> None:
        """Vérifie uniquement les prérequis — ne modifie pas le filesystem."""
        errors: list[str] = []

        if self.DEFAULT_AI_MODEL.startswith("gemini-") and not self.GEMINI_API_KEY:
            errors.append(
                "GEMINI_API_KEY manquante dans .env (requise pour DEFAULT_AI_MODEL Gemini)"
            )
        if self.DEFAULT_AI_MODEL.startswith("mistral-") and not self.MISTRAL_API_KEY:
            errors.append(
                "MISTRAL_API_KEY manquante dans .env (requise pour DEFAULT_AI_MODEL Mistral)"
            )
        if self.DEFAULT_AI_MODEL.startswith("chandra-") and not self.CHANDRA_BASE_URL:
            errors.append(
                "CHANDRA_BASE_URL manquante dans .env (requise pour DEFAULT_AI_MODEL Chandra)"
            )
        if self.DEFAULT_AI_MODEL.startswith("lighton") and not self.LIGHTON_BASE_URL:
            errors.append(
                "LIGHTON_BASE_URL manquante dans .env (requise pour DEFAULT_AI_MODEL LightOnOCR)"
            )
        if not self.DATABASE_URL:
            errors.append("DATABASE_URL manquante dans .env")
        elif not self.DATABASE_URL.startswith("postgresql"):
            errors.append("DATABASE_URL doit commencer par postgresql://")
        if not self.JWT_SECRET:
            errors.append("JWT_SECRET manquant dans .env")
        elif len(self.JWT_SECRET) < 32:
            errors.append("JWT_SECRET doit faire au moins 32 caractères pour la sécurité")
        jwt_refresh_secret = (self.JWT_REFRESH_SECRET or "").strip()
        if not jwt_refresh_secret:
            errors.append("JWT_REFRESH_SECRET manquant dans .env")
        elif len(jwt_refresh_secret) < 32:
            errors.append("JWT_REFRESH_SECRET doit faire au moins 32 caractères pour la sécurité")
        if self.DEFAULT_AI_MODEL not in self.MODELS_DISPONIBLES:
            m_id = str(self.DEFAULT_AI_MODEL)
            errors.append(
                f"DEFAULT_AI_MODEL='{m_id}' invalide. Valeurs acceptées : {', '.join(self.MODELS_DISPONIBLES)}"
            )

        if self.ENVIRONMENT == "production" and self.FREE_ACCESS_MODE:
            errors.append("FREE_ACCESS_MODE interdit en production")

        exec_mode = (self.SCAN_JOB_EXECUTION or "inline").strip().lower()
        if exec_mode not in ("inline", "queue"):
            errors.append("SCAN_JOB_EXECUTION doit être 'inline' ou 'queue'")
        if exec_mode == "queue" and self.ENVIRONMENT == "production":
            backend = (self.STORAGE_BACKEND or "s3").strip().lower()
            if backend == "s3" and not (self.STORJ_ACCESS_KEY and self.STORJ_SECRET_KEY):
                errors.append(
                    "SCAN_JOB_EXECUTION=queue en production requiert le stockage objet S3/Storj "
                    "(STORJ_ACCESS_KEY / STORJ_SECRET_KEY)"
                )
            if backend == "gcs" and not (self.GCS_BUCKET or "").strip():
                errors.append(
                    "SCAN_JOB_EXECUTION=queue avec STORAGE_BACKEND=gcs requiert GCS_BUCKET en production"
                )

        if self.ENVIRONMENT == "production" and self.DISABLE_RATE_LIMIT:
            errors.append("DISABLE_RATE_LIMIT interdit en production (rate-limit requis)")

        if self.GOOGLE_OAUTH_ENABLED:
            cid = (self.GOOGLE_CLIENT_ID or "").strip()
            csec = (self.GOOGLE_CLIENT_SECRET or "").strip()
            redir = (self.GOOGLE_REDIRECT_URI or "").strip()
            if not cid:
                errors.append("GOOGLE_CLIENT_ID requis lorsque GOOGLE_OAUTH_ENABLED=true")
            if not csec:
                errors.append("GOOGLE_CLIENT_SECRET requis lorsque GOOGLE_OAUTH_ENABLED=true")
            if not redir:
                errors.append("GOOGLE_REDIRECT_URI requis lorsque GOOGLE_OAUTH_ENABLED=true")
            elif not redir.startswith(("http://", "https://")):
                errors.append("GOOGLE_REDIRECT_URI doit être une URL http(s) absolue")

        if self.ENVIRONMENT == "production":
            salt = (self.COMMUNITY_SALT or "").strip()
            if not salt:
                errors.append(
                    "COMMUNITY_SALT manquant dans .env (obligatoire en production pour le hash "
                    "prix communautaire)"
                )
            elif len(salt) < 32:
                errors.append(
                    "COMMUNITY_SALT doit faire au moins 32 caractères en production "
                    "(reçu: %d caractères)" % len(salt)
                )
            elif salt == "docling-default-salt":
                errors.append(
                    "COMMUNITY_SALT ne peut pas être la valeur de développement par défaut "
                    "en production"
                )

        if errors:
            for err in errors:
                logger.error(err)
            raise ConfigurationError(errors)

        logger.info("Config OK — modele: %s", self.DEFAULT_MODEL)
        logger.info(
            "Sync Agent: %s -> %s",
            "actif" if self.SYNC_AGENT_ENABLED else "desactive",
            self.SYNC_AGENT_FOLDER,
        )

    def setup_watchdog_folders(self) -> None:
        """Crée l'arborescence du dossier magique (appelé après validate_startup)."""
        Path(self.SYNC_AGENT_FOLDER).mkdir(parents=True, exist_ok=True)
        Path(self.SYNC_AGENT_FOLDER + "/Traitees").mkdir(parents=True, exist_ok=True)
        Path(self.SYNC_AGENT_FOLDER + "/Erreurs").mkdir(parents=True, exist_ok=True)


def _split_extra_origins(raw: str) -> tuple[str, ...]:
    parts = (raw or "").split(",")
    return tuple(p.strip().rstrip("/") for p in parts if p.strip())


def _build_allowed_origins(settings: _Settings) -> tuple[str, ...]:
    """Liste CORS figée au chargement du module (évite de reconstruire à chaque accès)."""
    base = [
        "http://localhost:5173",
        "https://localhost:5173",
        "http://127.0.0.1:5173",
        "https://127.0.0.1:5173",
        "http://localhost:5174",
        "https://localhost:5174",
        "http://127.0.0.1:5174",
        "https://127.0.0.1:5174",
        "http://localhost:5175",
        "https://localhost:5175",
        "http://127.0.0.1:5175",
        "https://127.0.0.1:5175",
        "http://localhost:3000",
        "https://docling-agent.netlify.app",
        "https://d0cling.netlify.app",
        settings.PWA_URL,
        settings.PRONTO_URL,
        *_split_extra_origins(settings.CORS_EXTRA_ORIGINS),
    ]
    return tuple(o.strip().rstrip("/") for o in base if (o or "").strip())


_settings = _Settings()

_ALLOWED_ORIGINS_CACHE: tuple[str, ...] = _build_allowed_origins(_settings)


def _cost_per_million_map() -> dict[str, float]:
    raw = (_settings.GEMINI_COST_PER_MILLION_JSON or "").strip()
    if not raw:
        return dict(_DEFAULT_GEMINI_COST_PER_MILLION)
    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("GEMINI_COST_PER_MILLION_JSON doit être un objet JSON")
        return {str(k): float(v) for k, v in data.items()}
    except (json.JSONDecodeError, TypeError, ValueError) as e:
        logger.warning("GEMINI_COST_PER_MILLION_JSON invalide (%s), défauts utilisés", e)
        return dict(_DEFAULT_GEMINI_COST_PER_MILLION)


class _ConfigMeta(type):
    """Lit dynamiquement les champs depuis `_settings` — une seule source de vérité."""

    def __getattr__(cls, name: str) -> object:
        if name == "DEFAULT_MODEL":
            return _settings.DEFAULT_MODEL
        if name == "ALLOWED_ORIGINS":
            return list(_ALLOWED_ORIGINS_CACHE)
        if name == "MODELS_DISPONIBLES":
            return _Settings.MODELS_DISPONIBLES
        if hasattr(_settings, name):
            return getattr(_settings, name)
        raise AttributeError(f"type object 'Config' has no attribute {name!r}")


class Config(metaclass=_ConfigMeta):
    """Accès `Config.CLE` → attributs pydantic de `_settings` (+ DEFAULT_MODEL, ALLOWED_ORIGINS)."""

    @classmethod
    def cost_per_million_map(cls) -> dict[str, float]:
        """Coût estimé USD par million de tokens, clé = model_id affiché côté API."""
        return _cost_per_million_map()

    @classmethod
    def get_service_keys(cls) -> set[str]:
        """Parse comma-separated service API keys."""
        raw = _settings.SERVICE_API_KEYS
        if not raw:
            return set()
        return {k.strip() for k in raw.split(",") if k.strip()}

    @classmethod
    def validate(cls) -> None:
        _settings.validate_startup()
        _settings.setup_watchdog_folders()


# Instance pydantic — même objet que sous `Config.*` (hors méthodes dérivées)
settings = _settings
