import hmac

from fastapi import Depends, Header, HTTPException, Request

from core.config import Config
from core.db_manager import DBManager
from domains.shared import state as guest_state
from services.auth_service import verify_token


def require_csrf_for_cookie_request(request: Request) -> None:
    """CSRF pour les POST qui s'appuient sur des cookies sans passer par ``get_current_user``.

    Ex. ``/auth/refresh``, ``/auth/logout`` : même barrière que les mutations (double-submit
    ou ``Origin`` dans ``Config.ALLOWED_ORIGINS``).
    """
    if not _csrf_valid(request):
        raise HTTPException(status_code=403, detail="CSRF token manquant ou invalide")




def _csrf_valid(request: Request) -> bool:
    """Double-submit cookie+header (même origine) ou Origin autorisé (SPA hébergée ailleurs que l'API)."""
    cookie_csrf = request.cookies.get("csrf_token", "")
    header_csrf = request.headers.get("X-CSRF-Token", "")
    if cookie_csrf and header_csrf and hmac.compare_digest(cookie_csrf, header_csrf):
        return True

    origin = (request.headers.get("Origin") or "").strip().rstrip("/")
    if not origin:
        return False

    # Optimisation 2026 : Utiliser un set pour O(1) et rstrip une seule fois
    allowed = {str(o).strip().rstrip("/") for o in Config.ALLOWED_ORIGINS}
    return origin in allowed


def user_id_from_auth_payload(user: dict) -> int | None:
    """Extrait l'identifiant utilisateur PostgreSQL depuis le payload auth.

    Retourne un entier pour JWT valide ou invité (FREE_ACCESS_MODE). Retourne
    ``None`` pour un compte **service** (``sub == "service"``) ou si ``sub``
    n'est pas un identifiant numérique.
    """
    sub = user.get("sub")
    if sub is None:
        return None
    s = sub if isinstance(sub, str) else str(sub)
    return int(s) if s.isdigit() else None


async def _get_user_session(
    request: Request,
    authorization: str = "",
) -> dict:
    """JWT (Authorization ou cookie httpOnly) ou invité FREE_ACCESS — sans clé service."""
    token = None
    auth_via_cookie = False

    if authorization.startswith("Bearer "):
        token = authorization[7:]
    if not token:
        token = request.cookies.get("docling-token")
        auth_via_cookie = bool(token)

    if token:
        payload = verify_token(token)
        if payload:
            if auth_via_cookie and request.method in ("POST", "PUT", "PATCH", "DELETE"):
                if not _csrf_valid(request):
                    raise HTTPException(status_code=403, detail="CSRF token manquant ou invalide")
            return payload

    gid = guest_state.get_guest_user_id()
    if Config.FREE_ACCESS_MODE and gid is not None:
        return {"sub": str(gid), "email": guest_state.GUEST_USER_EMAIL, "role": "user"}

    raise HTTPException(status_code=401, detail="Token manquant")


async def get_current_user(
    request: Request,
    authorization: str = Header(default="", alias="Authorization"),
) -> dict:
    """Extrait et valide le token (Cookie ou Authorization) ou invité FREE_ACCESS."""
    return await _get_user_session(request, authorization)


async def require_service_identity(
    x_service_key: str = Header(default="", alias="X-Service-Key"),
) -> dict:
    """Identité machine (Pronto, intégrations) — clé service obligatoire et valide."""
    if not (x_service_key or "").strip():
        raise HTTPException(status_code=401, detail="Clé de service requise")
    valid_keys = Config.get_service_keys()
    if x_service_key not in valid_keys:
        raise HTTPException(status_code=401, detail="Clé de service invalide")
    return {"sub": "service", "email": "service@pronto.internal", "role": "service"}


async def get_service_or_user(
    request: Request,
    authorization: str = Header(default="", alias="Authorization"),
    x_service_key: str = Header(default="", alias="X-Service-Key"),
) -> dict:
    """Clé service valide OU session utilisateur (JWT / invité) — pour endpoints mixtes."""
    if (x_service_key or "").strip():
        valid_keys = Config.get_service_keys()
        if x_service_key not in valid_keys:
            raise HTTPException(status_code=401, detail="Clé de service invalide")
        return {"sub": "service", "email": "service@pronto.internal", "role": "service"}
    return await _get_user_session(request, authorization)


async def require_user_id(user: dict = Depends(get_current_user)) -> int:
    """Routes métier : impose un identifiant utilisateur PostgreSQL (exclut compte service)."""
    uid = user_id_from_auth_payload(user)
    if uid is None:
        raise HTTPException(
            status_code=403,
            detail="Identité utilisateur requise pour cette ressource",
        )
    return uid


async def require_active_subscription(user_id: int = Depends(require_user_id)) -> int:
    """
    Si ``FREE_ACCESS_MODE`` est faux (ex. production), exige un abonnement actif ou en essai.

    Sinon (mode dev invité) : laisse passer. Utiliser sur les routes sensibles (scan, écriture catalogue).
    """
    if Config.FREE_ACCESS_MODE:
        return user_id

    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT subscription_status::text AS subscription_status FROM users WHERE id = $1::bigint",
            user_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    st = (row["subscription_status"] or "").strip().lower()
    if st in ("active", "trialing"):
        return user_id

    raise HTTPException(
        status_code=402,
        detail="Abonnement actif requis pour cette action. Consultez les tarifs ou renouvelez votre abonnement.",
    )


async def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès admin requis")
    return user
