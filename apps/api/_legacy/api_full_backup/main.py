"""
FastAPI — Docling Agent v3

Composition de l'application : middlewares, lifespan (`domains/platform/lifespan.py`), routeurs
par domaine (`domains/`). La logique HTTP par contexte borné est dans
`domains/<contexte>/router.py`.
"""

import logging
import os
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from core.config import Config
from domains.auth.router import router as auth_router
from domains.billing.router import router as billing_router
from domains.catalogue.router import router as catalogue_router
from domains.community.router import router as community_router
from domains.compliance.router import router as compliance_router
from domains.platform.lifespan import lifespan
from domains.platform.router import router as platform_router
from domains.scan.router import router as scan_router
from domains.shared.rate_limit import limiter
from domains.shared.request_context import request_id_var
from domains.shared.sentry import init_sentry
from domains.sync_agent.router import router as sync_agent_router

init_sentry()

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

_OPENAPI_TAGS = [
    {
        "name": "auth",
        "description": (
            "Authentification JWT (httpOnly cookie) — register, login, refresh, logout ; "
            "optionnel Google OAuth + onboarding si GOOGLE_OAUTH_ENABLED"
        ),
    },
    {
        "name": "scan",
        "description": "Upload et extraction IA de factures (PDF/image) via Gemini multilingue FR/ES/CA",
    },
    {
        "name": "prices",
        "description": "Catalogue de prix structuré — consultation, insertion, comparaison, batch, historique",
    },
    {
        "name": "community",
        "description": "Données agrégées / préférences opt-in (zone, consentement) — pas le catalogue",
    },
    {
        "name": "compliance",
        "description": "Export et conformité (ex. export RGPD des données personnelles)",
    },
    {
        "name": "sync_agent",
        "description": "Surveillance dossier / synchronisation locale (statut du service sync_agent)",
    },
    {
        "name": "platform",
        "description": "Point d'entrée public, réception des Web Vitals (telemetry navigateur)",
    },
    {
        "name": "billing",
        "description": "Facturation Stripe — webhook (amorce), voir SPEC-SERVICE-PAYANT-2026",
    },
    {
        "name": "health",
        "description": "Healthcheck applicatif et base de données",
    },
]


def _app_environment() -> str:
    """Mode d’exécution — aligné sur `core.config.Config` (Pydantic), pas sur `os.getenv(..., 'development')`."""
    raw = str(getattr(Config, "ENVIRONMENT", "") or "").strip().lower()
    return raw if raw else "development"


_ENV = _app_environment()
_DOCS_URL = None if _ENV == "production" else "/docs"
_REDOC_URL = None if _ENV == "production" else "/redoc"


app = FastAPI(
    title="Docling Agent API",
    version=Config.APP_VERSION,
    description=(
        "API d'extraction IA de factures fournisseurs BTP (zones CA/ES/FR).\n\n"
        "**Auth** : JWT httpOnly cookie (access 15 min + refresh 7 j avec rotation).\n\n"
        "**OCR** : Gemini multilingue — PDF, JPEG, PNG, WebP.\n\n"
        "**Export** : CSV catalogue de prix."
    ),
    lifespan=lifespan,
    openapi_tags=_OPENAPI_TAGS,
    docs_url=_DOCS_URL,
    redoc_url=_REDOC_URL,
    contact={"name": "Docling BTP", "email": "support@docling.app"},
    license_info={"name": "Proprietary"},
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Trop de tentatives. Réessayez dans quelques instants."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "X-CSRF-Token",
        "X-Request-ID",
        "X-Service-Key",
    ],
    allow_credentials=True,
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
    request_id_var.set(req_id)
    request.state.request_id = req_id
    logger.info("→ %s %s [%s]", request.method, request.url.path, req_id)
    response = await call_next(request)
    response.headers["X-Request-ID"] = req_id
    return response


async def _security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "img-src 'self' data: blob: https:; "
        "connect-src 'self' https:; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )
    if _ENV == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


app.middleware("http")(_security_headers)

app.include_router(platform_router)
app.include_router(scan_router)
app.include_router(catalogue_router)
app.include_router(auth_router)
app.include_router(billing_router)
app.include_router(community_router)
app.include_router(compliance_router)
app.include_router(sync_agent_router)

if __name__ == "__main__":
    import uvicorn
    # Cloud Run injecte la variable d'env PORT (défaut 8080)
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
