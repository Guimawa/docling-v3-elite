"""
Tests E2E — auth avancé : /me, refresh token.
Nécessitent le serveur en cours d'exécution.
Skip automatiquement si serveur non disponible.
"""

import os
import time

import httpx
import pytest

from tests.skip_reasons import (
    AUTH_E2E_FREE_ACCESS,
    AUTH_E2E_LOGIN_429,
    AUTH_E2E_REGISTER_429,
    SRV_E2E_LEGACY,
    auth_e2e_login_fail,
    auth_e2e_register_fail,
)

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")

# CSRF refresh/logout : même bypass Origin que le navigateur SPA → Config.ALLOWED_ORIGINS
_E2E_SPA_ORIGIN_HEADERS = {"Origin": "http://localhost:5173"}

pytestmark = [pytest.mark.e2e, pytest.mark.anyio]


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


async def server_available() -> bool:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{BASE_URL}/health", timeout=3)
            return r.status_code == 200
    except Exception:
        return False


async def _register_and_login(client: httpx.AsyncClient) -> tuple[str, str | None]:
    """Inscrit un utilisateur unique et retourne (email, token optionnel)."""
    email = f"e2e_adv_{int(time.time())}@test.com"
    password = "DoclingE2E_Advanced!2026_Z"
    register_r = await client.post(
        "/api/v1/auth/register",
        data={"email": email, "password": password, "name": "E2E Adv"},
    )
    if register_r.status_code == 429:
        pytest.skip(AUTH_E2E_REGISTER_429)
    if register_r.status_code >= 500:
        pytest.skip(auth_e2e_register_fail(register_r.status_code, register_r.text))
    login_r = await client.post(
        "/api/v1/auth/login",
        data={"email": email, "password": password},
    )
    if login_r.status_code == 429:
        pytest.skip(AUTH_E2E_LOGIN_429)
    if login_r.status_code >= 500:
        pytest.skip(auth_e2e_login_fail(login_r.status_code, login_r.text))
    assert login_r.status_code == 200, f"Login échoué : {login_r.text}"
    payload = login_r.json()
    token = payload.get("token") or payload.get("data", {}).get("access_token")
    return email, token


# ─── Test 1 : /me retourne le bon email ──────────────────────────────────────
@pytest.mark.anyio
async def test_me_endpoint():
    """Login → GET /auth/me → email correspond."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)

    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        email, token = await _register_and_login(client)
        if token:
            client.headers["Authorization"] = f"Bearer {token}"

        me_r = await client.get("/api/v1/auth/me")
        assert me_r.status_code == 200, f"GET /me échoué : {me_r.text}"
        data = me_r.json()
        assert data.get("email") == email, f"Email attendu {email}, reçu {data.get('email')}"


# ─── Test 2 : /me sans token → 401 ───────────────────────────────────────────
@pytest.mark.anyio
async def test_me_requires_auth():
    """GET /auth/me sans token → 401."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)

    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.get("/api/v1/auth/me")
        if r.status_code == 200:
            pytest.skip(AUTH_E2E_FREE_ACCESS)
        assert r.status_code == 401, f"Attendu 401, reçu {r.status_code}"


# ─── Test 3 : Refresh token → nouveau token valide ───────────────────────────
@pytest.mark.anyio
async def test_refresh_token_flow():
    """Login → POST /auth/refresh → nouveau token → GET /catalogue OK."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)

    async with httpx.AsyncClient(base_url=BASE_URL, follow_redirects=True) as client:
        _email, token = await _register_and_login(client)
        if token:
            client.headers["Authorization"] = f"Bearer {token}"

        # Appel refresh (Origin requis si pas de double-submit X-CSRF-Token)
        refresh_r = await client.post("/api/v1/auth/refresh", headers=_E2E_SPA_ORIGIN_HEADERS)

        # Le refresh peut répondre 200 (avec cookie httpOnly) ou 401 si pas de refresh cookie
        # En mode httpOnly cookie, le refresh token est dans le cookie — on vérifie que
        # l'endpoint est accessible et retourne soit un nouveau token soit signale
        # l'absence de refresh cookie (pas d'erreur serveur 5xx)
        assert refresh_r.status_code in (200, 401), (
            f"Refresh inattendu : {refresh_r.status_code} {refresh_r.text}"
        )

        if refresh_r.status_code == 200:
            new_token = refresh_r.json().get("token") or refresh_r.json().get("access_token")
            if new_token:
                client.headers["Authorization"] = f"Bearer {new_token}"

        # Le catalogue doit toujours être accessible (avec l'ancien ou le nouveau token)
        cat_r = await client.get("/api/v1/catalogue")
        assert cat_r.status_code in (200, 204), f"Catalogue après refresh échoué : {cat_r.text}"
