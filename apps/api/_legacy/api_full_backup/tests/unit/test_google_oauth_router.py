"""Routes Google OAuth / onboarding — ASGITransport, DB réelle si migration a012."""

from __future__ import annotations

import os
import uuid
from unittest.mock import AsyncMock, patch

import asyncpg
import pytest
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("DISABLE_RATE_LIMIT", "true")
os.environ.setdefault("JWT_SECRET", "test-secret-32-chars-minimum-for-pytest")
os.environ.setdefault("JWT_REFRESH_SECRET", "test-refresh-secret-32-chars-minimum")

from core.config import settings
from core.db_manager import DBManager
from domains.auth.router import router
from domains.shared.dependencies import get_current_user
from domains.shared.rate_limit import limiter
from services.auth_service import create_token, hash_password
from services.google_oauth_service import create_oauth_state_token, new_oauth_jti, store_oauth_state
from tests.skip_reasons import MIG_A012_OAUTH, MIG_A012_OAUTH_SHORT


def _app() -> FastAPI:
    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(router)
    return app


async def _oauth_tables_ready() -> bool:
    try:
        pool = await DBManager.get_pool()
    except Exception:
        return False
    async with pool.acquire() as conn:
        t = await conn.fetchval(
            """
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'oauth_google_states'
            """
        )
        c = await conn.fetchval(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'google_sub'
            """
        )
        return bool(t and c)


@pytest.fixture(autouse=True)
async def _close_db_pool_after_test() -> None:
    """Évite pool asyncpg lié à une event loop fermée (pytest-asyncio par fonction)."""
    yield
    try:
        await DBManager.close_pool()
    except (RuntimeError, AttributeError):
        # Windows / Python 3.13 : la boucle peut être fermée avant ce teardown.
        pool = DBManager._pool
        if pool is not None:
            try:
                pool.terminate()
            except Exception:
                pass
            DBManager._pool = None


@pytest.fixture
def google_oauth_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_ENABLED", True)
    monkeypatch.setattr(
        settings, "GOOGLE_CLIENT_ID", "test-google-client-id.apps.googleusercontent.com"
    )
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "test-google-oauth-secret-32charsmin")
    monkeypatch.setattr(
        settings,
        "GOOGLE_REDIRECT_URI",
        "http://127.0.0.1:8000/api/v1/auth/google/callback",
    )


@pytest.mark.asyncio
async def test_google_callback_missing_code(google_oauth_env) -> None:
    app = _app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get(
            "/api/v1/auth/google/callback",
            params={"state": "ignored"},
        )
    assert r.status_code == 400
    assert "code" in r.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_google_callback_invalid_state_jwt(google_oauth_env) -> None:
    app = _app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get(
            "/api/v1/auth/google/callback",
            params={"code": "fake", "state": "not-a-valid-jwt"},
        )
    assert r.status_code == 400
    detail = r.json().get("detail", "")
    assert "state" in detail.lower() or "oauth" in detail.lower()


@pytest.mark.asyncio
async def test_google_callback_state_not_in_db(google_oauth_env) -> None:
    if not await _oauth_tables_ready():
        pytest.skip(MIG_A012_OAUTH)
    app = _app()
    jti = new_oauth_jti()
    tok = create_oauth_state_token(jti)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get(
            "/api/v1/auth/google/callback",
            params={"code": "fake", "state": tok},
        )
    assert r.status_code == 400
    assert (
        "déjà utilisé" in r.json().get("detail", "").lower()
        or "inconnu" in r.json().get("detail", "").lower()
    )


@pytest.mark.asyncio
async def test_google_callback_email_collision_local_account(google_oauth_env) -> None:
    if not await _oauth_tables_ready():
        pytest.skip(MIG_A012_OAUTH_SHORT)
    email = f"local_{uuid.uuid4().hex[:10]}@example.com"
    app = _app()
    pool = await DBManager.get_pool()
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3)",
                email,
                hash_password("MyPassword12345!"),
                "Local User",
            )
            jti = new_oauth_jti()
            await store_oauth_state(conn, jti)
            state = create_oauth_state_token(jti)

        async def fake_exchange(*_a, **_kw) -> dict:
            return {"id_token": "dummy"}

        def fake_verify(_token: str, _cid: str) -> dict:
            return {"sub": "google-sub-unique", "email": email, "name": "G User"}

        with patch(
            "domains.auth.router.exchange_authorization_code",
            new=AsyncMock(side_effect=fake_exchange),
        ):
            with patch("domains.auth.router.verify_google_id_token", side_effect=fake_verify):
                async with AsyncClient(
                    transport=ASGITransport(app=app), base_url="http://test"
                ) as ac:
                    r = await ac.get(
                        "/api/v1/auth/google/callback",
                        params={"code": "auth-code", "state": state},
                    )
        assert r.status_code == 409
        assert (
            "mot de passe" in r.json().get("detail", "").lower()
            or "classique" in r.json().get("detail", "").lower()
        )
    finally:
        async with pool.acquire() as conn:
            await conn.execute("DELETE FROM users WHERE email = $1", email)


@pytest.mark.asyncio
async def test_onboarding_step_requires_numeric_user(google_oauth_env) -> None:
    app = _app()

    async def svc_user() -> dict:
        return {"sub": "service", "email": "s@x", "role": "service"}

    app.dependency_overrides[get_current_user] = svc_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.post(
                "/api/v1/auth/onboarding/step",
                json={"company_name": "ACME"},
            )
        assert r.status_code == 403
        assert (
            "session" in r.json().get("detail", "").lower()
            or "utilisateur" in r.json().get("detail", "").lower()
        )
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_onboarding_complete_requires_auth(google_oauth_env) -> None:
    app = _app()

    async def nope() -> dict:
        raise HTTPException(status_code=401, detail="Token manquant")

    app.dependency_overrides[get_current_user] = nope
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.post("/api/v1/auth/onboarding/complete")
        assert r.status_code == 401
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_onboarding_step_updates_display_name(google_oauth_env) -> None:
    if not await _oauth_tables_ready():
        pytest.skip(MIG_A012_OAUTH_SHORT)
    uid = None
    pool = await DBManager.get_pool()
    email = f"onb_dn_{uuid.uuid4().hex[:8]}@example.com"
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO users (email, password_hash, display_name, google_sub, auth_provider)
            VALUES ($1, NULL, $2, $3, 'google')
            RETURNING id
            """,
            email,
            "Placeholder",
            f"sub-{uuid.uuid4().hex}",
        )
        uid = row["id"]

    token = create_token(uid, email, "user")

    async def u() -> dict:
        return {"sub": str(uid), "email": email, "role": "user"}

    app = _app()
    app.dependency_overrides[get_current_user] = u
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.post(
                "/api/v1/auth/onboarding/step",
                json={
                    "display_name": "Jean Dupont",
                    "job_role": "Chef de chantier",
                    "step": 1,
                },
                headers={"Authorization": f"Bearer {token}"},
            )
        assert r.status_code == 200
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT display_name, job_role FROM users WHERE id = $1",
                uid,
            )
        assert row["display_name"] == "Jean Dupont"
        assert row["job_role"] == "Chef de chantier"
    finally:
        app.dependency_overrides.clear()
        async with pool.acquire() as conn:
            try:
                await conn.execute("DELETE FROM refresh_tokens WHERE user_id = $1", uid)
            except asyncpg.UndefinedTableError:
                pass
            await conn.execute("DELETE FROM users WHERE id = $1", uid)


@pytest.mark.asyncio
async def test_onboarding_step_updates_user(google_oauth_env) -> None:
    if not await _oauth_tables_ready():
        pytest.skip(MIG_A012_OAUTH_SHORT)
    uid = None
    pool = await DBManager.get_pool()
    email = f"onb_{uuid.uuid4().hex[:8]}@example.com"
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO users (email, password_hash, display_name, google_sub, auth_provider)
            VALUES ($1, NULL, $2, $3, 'google')
            RETURNING id
            """,
            email,
            "O User",
            f"sub-{uuid.uuid4().hex}",
        )
        uid = row["id"]

    token = create_token(uid, email, "user")

    async def u() -> dict:
        return {"sub": str(uid), "email": email, "role": "user"}

    app = _app()
    app.dependency_overrides[get_current_user] = u
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.post(
                "/api/v1/auth/onboarding/step",
                json={"company_name": "BTP SA", "step": 1},
                headers={"Authorization": f"Bearer {token}"},
            )
        assert r.status_code == 200
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT company_name, onboarding_step FROM users WHERE id = $1",
                uid,
            )
        assert row["company_name"] == "BTP SA"
        assert row["onboarding_step"] == 1

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r2 = await client.post(
                "/api/v1/auth/onboarding/complete",
                headers={"Authorization": f"Bearer {token}"},
            )
        assert r2.status_code == 200
        async with pool.acquire() as conn:
            done = await conn.fetchval(
                "SELECT onboarding_completed FROM users WHERE id = $1",
                uid,
            )
        assert done is True
    finally:
        app.dependency_overrides.clear()
        async with pool.acquire() as conn:
            try:
                await conn.execute("DELETE FROM refresh_tokens WHERE user_id = $1", uid)
            except asyncpg.UndefinedTableError:
                # Certains environnements de test ont une base partielle sans table refresh_tokens.
                pass
            await conn.execute("DELETE FROM users WHERE id = $1", uid)
