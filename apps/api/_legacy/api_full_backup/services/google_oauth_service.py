"""
Google OAuth2 — authorization code flow, id_token (RS256) via PyJWKClient, état CSRF JWT + DB.
"""

from __future__ import annotations

import logging
import time
import uuid
from urllib.parse import urlencode

import httpx
import jwt
from jwt import PyJWKClient
from pydantic import BaseModel, EmailStr, Field

from services.auth_service import JWT_ALGORITHM, _get_jwt_secret

logger = logging.getLogger(__name__)

GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_OAUTH_SCOPES = "openid email profile"

STATE_JWT_TYP = "google_oauth_state"
DEFAULT_STATE_TTL_SECONDS = 600

_jwks_client: PyJWKClient | None = None

# --- SCHÉMAS PYDANTIC V2 ---

class GoogleIdTokenClaims(BaseModel):
    iss: str
    aud: str
    sub: str
    email: EmailStr
    email_verified: bool = False
    name: Optional[str] = None
    picture: Optional[str] = None
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    iat: int
    exp: int


def _google_jwks() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(GOOGLE_JWKS_URL)
    return _jwks_client


def new_oauth_jti() -> str:
    return str(uuid.uuid4())


def create_oauth_state_token(jti: str, ttl_seconds: int = DEFAULT_STATE_TTL_SECONDS) -> str:
    now = int(time.time())
    payload = {
        "jti": jti,
        "iat": now,
        "exp": now + ttl_seconds,
        "typ": STATE_JWT_TYP,
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALGORITHM)


def verify_oauth_state_token(token: str) -> str | None:
    """Retourne le jti si le JWT d'état est valide, sinon None."""
    try:
        data = jwt.decode(
            token,
            _get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "iat", "jti"]},
        )
        if data.get("typ") != STATE_JWT_TYP:
            return None
        return str(data["jti"])
    except (jwt.InvalidTokenError, ValueError, KeyError):
        logger.debug("État OAuth Google invalide ou expiré")
        return None


def build_google_authorization_url(client_id: str, redirect_uri: str, state: str) -> str:
    q = urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": GOOGLE_OAUTH_SCOPES,
            "state": state,
            "access_type": "offline",
        }
    )
    return f"{GOOGLE_AUTH_BASE}?{q}"


async def store_oauth_state(conn, jti: str, ttl_seconds: int = DEFAULT_STATE_TTL_SECONDS) -> None:
    import datetime

    expires_at = datetime.datetime.now(datetime.UTC) + datetime.timedelta(seconds=ttl_seconds)
    await conn.execute(
        "INSERT INTO oauth_google_states (jti, expires_at) VALUES ($1, $2)",
        jti,
        expires_at,
    )


async def consume_oauth_state(conn, jti: str) -> bool:
    """Supprime une ligne d'état valide (non expirée). Retourne True si consommation OK."""
    row = await conn.fetchrow(
        "DELETE FROM oauth_google_states WHERE jti = $1 AND expires_at > NOW() RETURNING jti",
        jti,
    )
    return row is not None


async def exchange_authorization_code(
    code: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str,
) -> dict:
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        return resp.json()


def verify_google_id_token(id_token: str, client_id: str) -> GoogleIdTokenClaims | None:
    """Valide la signature RS256 et les claims iss/aud. Retourne les claims typés ou None."""
    try:
        signing_key = _google_jwks().get_signing_key_from_jwt(id_token)
        data = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=client_id,
            issuer=["https://accounts.google.com", "accounts.google.com"],
        )
        return GoogleIdTokenClaims.model_validate(data)
    except Exception as e:
        logger.warning("id_token Google invalide: %s", e)
        return None
