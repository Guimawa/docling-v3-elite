import os
import secrets

from fastapi.responses import JSONResponse

from core.config import Config


def _cookie_samesite_and_secure() -> tuple[str, bool]:
    """Prod cross-origin (ex. Netlify + Cloud Run) : Strict bloque l'envoi des cookies en fetch."""
    is_prod = os.getenv("ENVIRONMENT", "").lower() == "production"
    if is_prod:
        return "none", True
    return "lax", False


def set_auth_cookie(response: JSONResponse, token: str) -> None:
    samesite, secure = _cookie_samesite_and_secure()
    response.set_cookie(
        key="docling-token",
        value=token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=900,
        path="/",
    )
    csrf_token = secrets.token_hex(32)
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=secure,
        samesite=samesite,
        max_age=900,
        path="/",
    )


def set_refresh_cookie(response: JSONResponse, refresh_token: str) -> None:
    samesite, secure = _cookie_samesite_and_secure()
    response.set_cookie(
        key="docling-refresh",
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=Config.JWT_REFRESH_EXPIRY_SECONDS,
        path="/api/v1/auth",
    )
