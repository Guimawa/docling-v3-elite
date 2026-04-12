"""
AuthService - Docling Agent v4
JWT authentication (PyJWT) with Argon2id password hashing.
Backward-compatible: PBKDF2 hashes are verified and silently rehashed to Argon2id on login.
"""

import hashlib
import hmac
import logging
import os
import time
import uuid

import httpx
import asyncio
from typing import Annotated, Optional, Literal
from pydantic import BaseModel, Field, EmailStr
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from core.config import Config

logger = logging.getLogger(__name__)


def _get_jwt_secret() -> str:
    """Lazy accessor — validated at startup by Config.validate(), not at import."""
    secret = os.getenv("JWT_SECRET", "") or str(getattr(Config, "JWT_SECRET", "") or "")
    if not secret:
        raise RuntimeError(
            "JWT_SECRET manquant. Définir la variable d'environnement JWT_SECRET "
            "avant de démarrer l'application."
        )
    return secret


def _get_jwt_refresh_secret() -> str:
    """Lazy accessor pour le secret refresh token — différent du secret access token."""
    secret = os.getenv("JWT_REFRESH_SECRET", "") or str(
        getattr(Config, "JWT_REFRESH_SECRET", "") or ""
    )
    if not secret:
        raise RuntimeError(
            "JWT_REFRESH_SECRET manquant. Définir la variable d'environnement JWT_REFRESH_SECRET "
            "avant de démarrer l'application."
        )
    return secret


JWT_ALGORITHM = "HS256"
# Access token : 15 min (900s)
JWT_EXPIRY = int(os.getenv("JWT_EXPIRY_SECONDS", "900"))

# Claims de validation — protection contre les attaques par confusion d'algorithme
# (CVE-2026-22817, CVE-2026-27804, CVE-2026-23552)
JWT_ISSUER = "docling-api"
JWT_AUDIENCE = "docling-pwa"

_ph_singleton: PasswordHasher | None = None


def _password_hasher() -> PasswordHasher:
    global _ph_singleton
    if _ph_singleton is None:
        _ph_singleton = PasswordHasher(
            time_cost=int(Config.ARGON2_TIME_COST),
            memory_cost=int(Config.ARGON2_MEMORY_COST),
            parallelism=int(Config.ARGON2_PARALLELISM),
        )
    return _ph_singleton


def _clip_password_for_processing(password: str) -> str:
    """Tronque avant hachage / HIBP (anti-DoS mots de passe gigantesques)."""
    max_len = int(Config.PASSWORD_MAX_LENGTH)
    if len(password) <= max_len:
        return password
    return password[:max_len]


# --- SCHÉMAS PYDANTIC V2 ---

class JWTPayload(BaseModel):
    sub: str = Field(description="User ID")
    email: Optional[str] = None
    role: Literal["user", "admin"] = "user"
    iat: int
    exp: int
    iss: str = JWT_ISSUER
    aud: str = JWT_AUDIENCE
    jti: str
    type: Literal["access", "refresh", "google_oauth_state"]

# --- CORE AUTH ---

def create_token(user_id: int, email: str, role: str = "user") -> str:
    now = int(time.time())
    payload = JWTPayload(
        sub=str(user_id),
        email=email,
        role=role,
        iat=now,
        exp=now + JWT_EXPIRY,
        jti=str(uuid.uuid4()),
        type="access"
    )
    return jwt.encode(payload.model_dump(), _get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def hash_password_async(password: str) -> str:
    """Hash password non-bloquant (offloaded to thread)."""
    clipped = _clip_password_for_processing(password)
    return await asyncio.to_thread(_password_hasher().hash, clipped)

async def verify_password_async(password: str, stored: str) -> bool:
    """Vérification non-bloquante (offloaded to thread)."""
    clipped = _clip_password_for_processing(password)
    if not stored.startswith("$argon2"):
        return _verify_pbkdf2(clipped, stored)
    try:
        return await asyncio.to_thread(_password_hasher().verify, stored, clipped)
    except VerifyMismatchError:
        return False


def create_refresh_token(user_id: int) -> tuple[str, str]:
    """Create a JWT refresh token signed with JWT_REFRESH_SECRET.
    Expiry : Config.JWT_REFRESH_EXPIRY_SECONDS (défaut 7 jours).
    Retourne (token, jti) — le jti doit être stocké en DB pour révocation.
    """
    now = int(time.time())
    jti = str(uuid.uuid4())
    refresh_ttl = int(Config.JWT_REFRESH_EXPIRY_SECONDS)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + refresh_ttl,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "jti": jti,
        "type": "refresh",
    }
    token = jwt.encode(payload, _get_jwt_refresh_secret(), algorithm=JWT_ALGORITHM)
    return token, jti


def verify_refresh_token(token: str) -> dict | None:
    """Verify and decode a refresh token. Returns payload dict or None.
    Vérifie la signature avec JWT_REFRESH_SECRET et le claim type=refresh.
    """
    try:
        data = jwt.decode(
            token,
            _get_jwt_refresh_secret(),
            algorithms=[JWT_ALGORITHM],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
        )
        if data.get("type") != "refresh":
            logger.warning("Token type invalide (attendu: refresh)")
            return None
        data["sub"] = int(data["sub"])
        return data
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError, KeyError):
        logger.warning("Refresh token invalide ou expiré")
        return None


def verify_token(token: str) -> dict | None:
    """Verify and decode a JWT access token. Returns payload dict or None."""
    try:
        data = jwt.decode(
            token,
            _get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],
            audience=JWT_AUDIENCE,  # Valide le claim aud
            issuer=JWT_ISSUER,  # Valide le claim iss
        )
        if data.get("type") != "access":
            logger.warning("Token type invalide (attendu: access)")
            return None
        data["sub"] = int(data["sub"])
        return data
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError, KeyError):
        logger.warning("Token invalide ou payload malformé")
        return None


def validate_password(password: str) -> tuple[bool, str]:
    """
    Valide le mot de passe selon NIST SP 800-63B (2024) :
    - Minimum 12 caractères
    - Pas de règles de complexité arbitraires (NIST déconseille)
    Retourne (True, "") si valide, (False, message_erreur) sinon.
    """
    if len(password) < 12:
        return False, "Le mot de passe doit contenir au moins 12 caractères"
    max_len = int(Config.PASSWORD_MAX_LENGTH)
    if len(password) > max_len:
        return (
            False,
            f"Le mot de passe ne doit pas dépasser {max_len} caractères",
        )
    return True, ""


async def check_pwned_password(password: str) -> bool:
    """
    Vérifie si le mot de passe figure dans la base HIBP via k-anonymity.
    Retourne True si le mot de passe a été compromis, False sinon (ou si HIBP est indisponible).
    Ne bloque jamais l'inscription en cas d'erreur réseau (fail-open).
    """
    clipped = _clip_password_for_processing(password)
    sha1 = hashlib.sha1(clipped.encode("utf-8")).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"https://api.pwnedpasswords.com/range/{prefix}",
                headers={"Add-Padding": "true"},
            )
        if resp.status_code == 200:
            for line in resp.text.splitlines():
                h, _ = line.split(":")
                if h == suffix:
                    return True
    except httpx.RequestError:
        pass  # Fail-open — HIBP indisponible ne doit pas bloquer l'inscription
    except Exception:
        logger.warning(
            "check_pwned_password: erreur inattendue (hors réseau)",
            exc_info=True,
        )
    return False


def hash_password(password: str) -> str:
    """Hash password with Argon2id (default for all new accounts)."""
    return _password_hasher().hash(_clip_password_for_processing(password))


def _verify_pbkdf2(password: str, stored: str) -> bool:
    """Verify a legacy PBKDF2-SHA256 hash (format: salt_hex:hash_hex)."""
    try:
        salt_hex, hash_hex = stored.split(":")
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def verify_password(password: str, stored: str) -> bool:
    """
    Verify password against stored hash.
    Supports both Argon2id ($argon2...) and legacy PBKDF2 (hex:hex) formats.
    """
    clipped = _clip_password_for_processing(password)
    if stored.startswith("$argon2"):
        try:
            return _password_hasher().verify(stored, clipped)
        except VerifyMismatchError:
            return False
    return _verify_pbkdf2(clipped, stored)


def needs_rehash(stored: str) -> bool:
    """Returns True if the stored hash should be upgraded to Argon2id."""
    if stored.startswith("$argon2"):
        return _password_hasher().check_needs_rehash(stored)
    return True
