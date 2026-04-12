import datetime
from datetime import timezone
import logging

import httpx
from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.responses import RedirectResponse

from core.config import Config
from core.db_manager import DBManager
from domains.auth import lockout
from domains.auth.cookies import set_auth_cookie, set_refresh_cookie
from domains.shared import state as guest_state
from domains.shared.dependencies import (
    get_current_user,
    require_csrf_for_cookie_request,
    user_id_from_auth_payload,
)
from domains.shared.rate_limit import limiter
from services.auth_service import (
    check_pwned_password,
    create_refresh_token,
    create_token,
    hash_password,
    needs_rehash,
    validate_password,
    verify_password,
    verify_refresh_token,
)
from services.google_oauth_service import (
    build_google_authorization_url,
    consume_oauth_state,
    create_oauth_state_token,
    exchange_authorization_code,
    new_oauth_jti,
    store_oauth_state,
    verify_google_id_token,
    verify_oauth_state_token,
)

logger = logging.getLogger(__name__)

EMAIL_COLLISION_GOOGLE = (
    "Un compte existe déjà avec cet email (inscription classique). "
    "Connectez-vous avec votre mot de passe puis liez Google depuis les paramètres."
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _require_google_oauth_enabled() -> None:
    if not Config.GOOGLE_OAUTH_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Connexion Google désactivée sur ce serveur.",
        )


class OnboardingStepBody(BaseModel):
    display_name: str | None = Field(default=None, max_length=200)
    company_name: str | None = Field(default=None, max_length=200)
    company_size: str | None = Field(default=None, max_length=50)
    job_role: str | None = Field(default=None, max_length=100)
    primary_goal: str | None = Field(default=None, max_length=100)
    step: int | None = Field(default=None, ge=0, le=50)

class RegisterBody(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., max_length=128)
    name: str | None = Field(default=None, max_length=200)
    storage_type: str = Field(default="managed", pattern="^(managed|personal)$")
    storage_config: dict | None = Field(default=None)
    plan_tier: str = Field(default="free", pattern="^(free|starter_9|pro_19|elite_29)$")


class GoogleLinkBody(BaseModel):
    id_token: str = Field(..., min_length=20)


async def _store_refresh_token(conn, user_id: int, jti: str) -> None:
    """Persiste un refresh token en BDD. Helper unique — élimine la duplication 4×."""
    expires_at = datetime.datetime.now(timezone.utc) + datetime.timedelta(
        seconds=Config.JWT_REFRESH_EXPIRY_SECONDS
    )
    await conn.execute(
        """INSERT INTO refresh_tokens (user_id, jti, expires_at)
           VALUES ($1, $2, $3)""",
        user_id,
        jti,
        expires_at,
    )


async def _insert_refresh_and_build_redirect(
    conn,
    user_id: int,
    email: str,
    role: str,
) -> RedirectResponse:
    access = create_token(user_id, email, role)
    refresh_token, jti = create_refresh_token(user_id)
    await _store_refresh_token(conn, user_id, jti)
    base = (Config.PWA_URL or "http://localhost:5173").rstrip("/")
    resp = RedirectResponse(url=f"{base}/", status_code=302)
    set_auth_cookie(resp, access)
    set_refresh_cookie(resp, refresh_token)
    return resp


@router.post("/register")
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterBody):
    email = body.email.strip().lower()
    password = body.password
    name = body.name or email.split("@")[0]

    ok, msg = validate_password(password)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    
    if await check_pwned_password(password):
        raise HTTPException(
            status_code=400,
            detail="Ce mot de passe a été compromis dans une fuite de données. Sécurité prioritaire.",
        )

    if email == guest_state.GUEST_USER_EMAIL.lower():
        raise HTTPException(status_code=403, detail="Identifiant réservé.")

    # Validation Stockage Personnel si choisi
    if body.storage_type == "personal" and not body.storage_config:
        raise HTTPException(
            status_code=400,
            detail="Configuration de stockage requise pour le mode 'Personal Cloud'.",
        )

    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM users WHERE LOWER(email) = $1", email)
        if existing:
            raise HTTPException(status_code=409, detail="Email déjà utilisé")
        
        pw_hash = hash_password(password)
        import json
        row = await conn.fetchrow(
            """INSERT INTO users (email, password_hash, display_name, storage_type, storage_config, plan_tier) 
               VALUES ($1, $2, $3, $4, $5, $6) 
               RETURNING id, role""",
            email,
            pw_hash,
            name,
            body.storage_type,
            json.dumps(body.storage_config or {}),
            body.plan_tier,
        )
        
        token = create_token(row["id"], email, row["role"])
        refresh_token, jti = create_refresh_token(row["id"])
        await _store_refresh_token(conn, row["id"], jti)

        resp = JSONResponse(content={"user_id": row["id"], "email": email, "storage_type": body.storage_type})
        set_auth_cookie(resp, token)
        set_refresh_cookie(resp, refresh_token)
        return resp


@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, email: str = Form(...), password: str = Form(...)):
    if len(email) > 255:
        raise HTTPException(status_code=400, detail="Email trop long")
    if len(password) > 128:
        raise HTTPException(status_code=400, detail="Mot de passe trop long")
    if email.strip().lower() == guest_state.GUEST_USER_EMAIL:
        raise HTTPException(
            status_code=403,
            detail="Connexion interactive interdite pour le compte invité (accès libre).",
        )
    lockout.check_login_lockout(email)
    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, email, password_hash, role, display_name FROM users WHERE email = $1",
            email,
        )
        if (
            not user
            or user["password_hash"] is None
            or not verify_password(password, user["password_hash"])
        ):
            lockout.record_login_failure(email)
            logger.warning(
                "Échec login pour '%s' (%d tentative(s))",
                email,
                lockout.failure_count(email),
            )
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

        if user["password_hash"] and needs_rehash(user["password_hash"]):
            new_hash = hash_password(password)
            await conn.execute(
                "UPDATE users SET password_hash = $1 WHERE id = $2",
                new_hash,
                user["id"],
            )
            logger.info("Rehash PBKDF2→Argon2id pour user_id=%s", user["id"])

        lockout.clear_login_failures(email)
        token = create_token(user["id"], user["email"], user["role"])
        refresh_token, jti = create_refresh_token(user["id"])
        await _store_refresh_token(conn, user["id"], jti)

        resp = JSONResponse(
            content={
                "user_id": user["id"],
                "email": user["email"],
                "name": user["display_name"],
                "role": user["role"],
            }
        )
        set_auth_cookie(resp, token)
        set_refresh_cookie(resp, refresh_token)
        return resp


@router.post("/refresh")
@limiter.limit("20/minute")
async def refresh_access_token(request: Request):
    require_csrf_for_cookie_request(request)
    refresh_token = request.cookies.get("docling-refresh")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token manquant")

    payload = verify_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Refresh token invalide ou expiré")

    jti = payload.get("jti")
    user_id = payload.get("sub")
    if not jti or not user_id:
        raise HTTPException(status_code=401, detail="Refresh token malformé")

    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, revoked FROM refresh_tokens WHERE jti = $1 AND user_id = $2",
            jti,
            user_id,
        )
        if not row:
            raise HTTPException(status_code=401, detail="Refresh token inconnu")

        # ── Reuse Detection 2026 ──────────────────────────────────────────
        # Si un token DÉJÀ révoqué est re-présenté, c'est un vol de token.
        # Révoquer TOUTE la famille et forcer une ré-authentification.
        if row["revoked"]:
            await conn.execute(
                "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1",
                user_id,
            )
            logger.critical(
                "SECURITY: refresh token reuse detected for user_id=%s jti=%s",
                user_id, jti,
            )
            raise HTTPException(
                status_code=401,
                detail="Session compromise détectée. Reconnectez-vous.",
            )

        user = await conn.fetchrow("SELECT id, email, role FROM users WHERE id = $1", user_id)
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")

        # Révoquer l'ancien, émettre le nouveau (rotation)
        await conn.execute("UPDATE refresh_tokens SET revoked = TRUE WHERE jti = $1", jti)

        new_access_token = create_token(user["id"], user["email"], user["role"])
        new_refresh_token, new_jti = create_refresh_token(user["id"])
        await _store_refresh_token(conn, user["id"], new_jti)

    resp = JSONResponse(content={"ok": True})
    set_auth_cookie(resp, new_access_token)
    set_refresh_cookie(resp, new_refresh_token)
    return resp


@router.post("/logout")
async def logout(request: Request):
    require_csrf_for_cookie_request(request)
    refresh_token = request.cookies.get("docling-refresh")
    if refresh_token:
        payload = verify_refresh_token(refresh_token)
        if payload:
            jti = payload.get("jti")
            user_id = payload.get("sub")
            if jti and user_id:
                try:
                    pool = await DBManager.get_pool()
                    async with pool.acquire() as conn:
                        await conn.execute(
                            "UPDATE refresh_tokens SET revoked = TRUE WHERE jti = $1 AND user_id = $2",
                            jti,
                            user_id,
                        )
                except Exception:
                    logger.warning(
                        "Impossible de révoquer le refresh token lors du logout", exc_info=True
                    )

    resp = JSONResponse(content={"ok": True})
    resp.delete_cookie(key="docling-token", path="/")
    resp.delete_cookie(key="csrf_token", path="/")
    resp.delete_cookie(key="docling-refresh", path="/api/v1/auth")
    return resp


@router.get("/google/start")
@limiter.limit("30/minute")
async def google_oauth_start(request: Request):
    _require_google_oauth_enabled()
    jti = new_oauth_jti()
    state = create_oauth_state_token(jti)
    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        await store_oauth_state(conn, jti)
    url = build_google_authorization_url(
        Config.GOOGLE_CLIENT_ID.strip(),
        Config.GOOGLE_REDIRECT_URI.strip(),
        state,
    )
    return RedirectResponse(url=url, status_code=302)


@router.get("/google/callback")
@limiter.limit("30/minute")
async def google_oauth_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
):
    _require_google_oauth_enabled()
    if not code:
        raise HTTPException(status_code=400, detail="Paramètre code manquant")
    if not state:
        raise HTTPException(status_code=400, detail="Paramètre state manquant")
    jti = verify_oauth_state_token(state)
    if not jti:
        raise HTTPException(status_code=400, detail="State OAuth invalide ou expiré")

    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        ok_state = await consume_oauth_state(conn, jti)
        if not ok_state:
            raise HTTPException(
                status_code=400,
                detail="State OAuth déjà utilisé ou inconnu",
            )
        try:
            tokens = await exchange_authorization_code(
                code,
                Config.GOOGLE_CLIENT_ID.strip(),
                Config.GOOGLE_CLIENT_SECRET.strip(),
                Config.GOOGLE_REDIRECT_URI.strip(),
            )
        except httpx.HTTPStatusError as e:
            logger.warning("Échec échange code Google: %s", e)
            raise HTTPException(
                status_code=502,
                detail="Échec de l'échange de jeton avec Google",
            ) from e
        id_tok = tokens.get("id_token")
        if not id_tok:
            raise HTTPException(status_code=502, detail="Réponse Google sans id_token")
        claims = verify_google_id_token(id_tok, Config.GOOGLE_CLIENT_ID.strip())
        if not claims:
            raise HTTPException(status_code=401, detail="id_token Google invalide")
        sub = claims.get("sub")
        email_raw = (claims.get("email") or "").strip()
        email = email_raw.lower()
        display = (claims.get("name") or "").strip() or (email.split("@")[0] if email else "")
        if not sub or not email:
            raise HTTPException(status_code=400, detail="Profil Google incomplet (email requis)")
        if email == guest_state.GUEST_USER_EMAIL.lower():
            raise HTTPException(status_code=403, detail="Email non autorisé")

        by_sub = await conn.fetchrow(
            "SELECT id, email, role FROM users WHERE google_sub = $1",
            sub,
        )
        if by_sub:
            return await _insert_refresh_and_build_redirect(
                conn, by_sub["id"], by_sub["email"], by_sub["role"]
            )

        by_email = await conn.fetchrow(
            "SELECT id, email, role, password_hash, google_sub FROM users WHERE LOWER(email) = $1",
            email,
        )
        if by_email:
            if by_email["google_sub"] and by_email["google_sub"] != sub:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Conflit de compte : cet email est déjà associé à un autre compte Google."
                    ),
                )
            if by_email["password_hash"] is not None and by_email["google_sub"] is None:
                raise HTTPException(status_code=409, detail=EMAIL_COLLISION_GOOGLE)
            raise HTTPException(
                status_code=409,
                detail="Impossible de finaliser la connexion Google pour ce compte.",
            )

        row = await conn.fetchrow(
            """
            INSERT INTO users (
                email, password_hash, display_name, google_sub, auth_provider,
                onboarding_step, onboarding_completed
            )
            VALUES ($1, NULL, $2, $3, 'google', 0, FALSE)
            RETURNING id, role
            """,
            email,
            display,
            sub,
        )
        return await _insert_refresh_and_build_redirect(conn, row["id"], email, row["role"])


@router.post("/onboarding/step")
async def onboarding_step(body: OnboardingStepBody, user: dict = Depends(get_current_user)):
    uid = user_id_from_auth_payload(user)
    if uid is None:
        raise HTTPException(
            status_code=403,
            detail="Session utilisateur requise pour l'onboarding",
        )
    updates: list[str] = []
    args: list = []
    i = 1
    if body.display_name is not None:
        stripped = (body.display_name or "").strip()
        if stripped:
            updates.append(f"display_name = ${i}")
            args.append(stripped[:200])
            i += 1
    if body.company_name is not None:
        updates.append(f"company_name = ${i}")
        args.append(body.company_name[:200])
        i += 1
    if body.company_size is not None:
        updates.append(f"company_size = ${i}")
        args.append(body.company_size[:50])
        i += 1
    if body.job_role is not None:
        updates.append(f"job_role = ${i}")
        args.append(body.job_role[:100])
        i += 1
    if body.primary_goal is not None:
        updates.append(f"primary_goal = ${i}")
        args.append(body.primary_goal[:100])
        i += 1
    if body.step is not None:
        updates.append(f"onboarding_step = ${i}")
        args.append(body.step)
        i += 1
    if not updates:
        raise HTTPException(status_code=400, detail="Aucun champ d'onboarding fourni")
    args.append(uid)
    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            f"UPDATE users SET {', '.join(updates)}, updated_at = NOW() WHERE id = ${i}",
            *args,
        )
    return {"ok": True}


@router.post("/onboarding/complete")
async def onboarding_complete(user: dict = Depends(get_current_user)):
    uid = user_id_from_auth_payload(user)
    if uid is None:
        raise HTTPException(
            status_code=403,
            detail="Session utilisateur requise pour l'onboarding",
        )
    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET onboarding_completed = TRUE, updated_at = NOW() WHERE id = $1",
            uid,
        )
    return {"ok": True, "onboarding_completed": True}


@router.post("/google/link")
@limiter.limit("10/minute")
async def google_account_link(
    request: Request,
    body: GoogleLinkBody,
    user: dict = Depends(get_current_user),
):
    _require_google_oauth_enabled()
    uid = user_id_from_auth_payload(user)
    if uid is None:
        raise HTTPException(status_code=403, detail="Session utilisateur requise")
    claims = verify_google_id_token(
        body.id_token.strip(),
        Config.GOOGLE_CLIENT_ID.strip(),
    )
    if not claims:
        raise HTTPException(status_code=401, detail="id_token Google invalide")
    sub = claims.get("sub")
    email_google = (claims.get("email") or "").strip().lower()
    session_email = (user.get("email") or "").strip().lower()
    if not sub or not email_google:
        raise HTTPException(status_code=400, detail="Profil Google incomplet (email requis)")
    if email_google != session_email:
        raise HTTPException(
            status_code=403,
            detail="L'email Google ne correspond pas au compte connecté",
        )
    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        other = await conn.fetchrow(
            "SELECT id FROM users WHERE google_sub = $1 AND id <> $2",
            sub,
            uid,
        )
        if other:
            raise HTTPException(
                status_code=409,
                detail="Ce compte Google est déjà lié à un autre utilisateur",
            )
        row = await conn.fetchrow(
            "SELECT password_hash, google_sub FROM users WHERE id = $1",
            uid,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        if row["google_sub"] == sub:
            return {"ok": True, "linked": True}
        await conn.execute(
            """
            UPDATE users SET
                google_sub = $1,
                auth_provider = CASE WHEN password_hash IS NOT NULL THEN 'linked' ELSE 'google' END,
                updated_at = NOW()
            WHERE id = $2
            """,
            sub,
            uid,
        )
    return {"ok": True, "linked": True}


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    user_id = user_id_from_auth_payload(user)
    onboarding_completed = False
    auth_provider = None
    consent, zone_geo = (
        await DBManager.get_user_community_prefs(user_id) if user_id else (False, None)
    )
    subscription_status = None
    subscription_current_period_end = None
    has_stripe_customer = False
    if user_id:
        pool = await DBManager.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT
                    onboarding_completed,
                    auth_provider,
                    storage_type,
                    storage_config,
                    plan_tier,
                    subscription_status::text AS subscription_status,
                    subscription_current_period_end,
                    (stripe_customer_id IS NOT NULL AND btrim(stripe_customer_id::text) <> '')
                        AS has_stripe_customer
                FROM users WHERE id = $1
                """,
                user_id,
            )
            if row:
                onboarding_completed = bool(row["onboarding_completed"])
                auth_provider = row["auth_provider"]
                subscription_status = row["subscription_status"]
                cpe = row["subscription_current_period_end"]
                if cpe is not None:
                    subscription_current_period_end = (
                        cpe.isoformat() if hasattr(cpe, "isoformat") else str(cpe)
                    )
                has_stripe_customer = bool(row["has_stripe_customer"])
    return {
        "user_id": user["sub"],
        "email": user["email"],
        "role": user["role"],
        "auth_provider": auth_provider,
        "onboarding_completed": onboarding_completed,
        "storage_type": row["storage_type"] if row else "managed",
        "plan_tier": row["plan_tier"] if row else "free",
        "community_consent": consent,
        "zone_geo": zone_geo,
        "subscription_status": subscription_status,
        "subscription_current_period_end": subscription_current_period_end,
        "has_stripe_customer": has_stripe_customer,
    }
