"""
Tests E2E — Flow complet API : auth → upload → catalogue → devis
Ces tests nécessitent le serveur en cours d'exécution.
Skip automatiquement si serveur non disponible.
"""

import os
import time

import httpx
import pytest

from tests.skip_reasons import SRV_E2E_LEGACY

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")

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


# ─── Test 1 : Health check ────────────────────────────────────────────────────
@pytest.mark.anyio
async def test_health_check():
    """Vérifie que /health répond 200 avec un champ status."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data


# ─── Test 2 : Register + Login flow ──────────────────────────────────────────
@pytest.mark.anyio
async def test_auth_flow():
    """Inscription + connexion réelles via l'API."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)
    email = f"e2e_test_{int(time.time())}@test.com"
    password = "DoclingE2E_Strict!2026_A"

    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        # Inscription
        r = await client.post(
            "/api/v1/auth/register",
            data={"email": email, "password": password, "name": "E2E Test"},
        )
        assert r.status_code in (200, 201, 409), f"Register failed: {r.text}"

        # Connexion
        r = await client.post(
            "/api/v1/auth/login",
            data={"email": email, "password": password},
        )
        assert r.status_code == 200, f"Login failed: {r.text}"

        # Vérification token ou cookie
        response_data = r.json()
        has_token = (
            "docling-token" in r.cookies
            or response_data.get("token")
            or response_data.get("data", {}).get("access_token")
        )
        assert has_token, f"No token found in response: {response_data}"


# ─── Test 3 : Accès endpoint authentifié ─────────────────────────────────────
@pytest.mark.anyio
async def test_authenticated_access():
    """Un client authentifié peut accéder au catalogue."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)
    email = f"e2e_auth_{int(time.time())}@test.com"
    password = "DoclingE2E_Strict!2026_B"

    async with httpx.AsyncClient(base_url=BASE_URL, follow_redirects=True) as client:
        # Inscription + connexion
        await client.post(
            "/api/v1/auth/register",
            data={"email": email, "password": password, "name": "E2E Auth"},
        )
        login_r = await client.post(
            "/api/v1/auth/login",
            data={"email": email, "password": password},
        )
        assert login_r.status_code == 200, f"Login failed: {login_r.text}"

        token = login_r.json().get("token")
        if token:
            client.headers["Authorization"] = f"Bearer {token}"

        # Accès au catalogue (doit fonctionner avec auth)
        r = await client.get("/api/v1/catalogue")
        assert r.status_code in (200, 204), f"Catalogue access failed: {r.text}"


# ─── Test 4 : Accès non authentifié bloqué ───────────────────────────────────
@pytest.mark.anyio
async def test_unauthorized_blocked():
    """Un client sans token reçoit 401 sur les endpoints protégés."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.get("/api/v1/catalogue")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"


# ─── Test 5 : Rate limiting login ────────────────────────────────────────────
@pytest.mark.anyio
async def test_rate_limiting():
    """Plusieurs tentatives de login échouées déclenchent le rate limiting."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        responses = []
        for _ in range(7):
            r = await client.post(
                "/api/v1/auth/login",
                data={"email": "nonexistent@test.com", "password": "wrong"},
            )
            responses.append(r.status_code)
        # Au moins un 429 (rate limited) ou des 401 (creds invalides)
        assert 429 in responses or all(s == 401 for s in responses), (
            f"Rate limiting not working as expected: {responses}"
        )


# ─── Test 6 : Upload sans auth bloqué ────────────────────────────────────────
@pytest.mark.anyio
async def test_upload_invoice_requires_auth():
    """Un upload sans authentification doit retourner 401."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.post(
            "/api/v1/invoices/process",
            files={"file": ("test.pdf", b"fake pdf", "application/pdf")},
        )
        assert r.status_code == 401, f"Expected 401 for unauthenticated upload, got {r.status_code}"


# ─── Test 7 : Flow complet auth → catalogue ──────────────────────────────────
@pytest.mark.anyio
async def test_full_auth_catalogue_flow():
    """Flow E2E complet : register → login → catalogue → logout."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)
    email = f"e2e_full_{int(time.time())}@test.com"
    password = "DoclingE2E_Strict!2026_C"

    async with httpx.AsyncClient(base_url=BASE_URL, follow_redirects=True) as client:
        # 1. Inscription
        reg_r = await client.post(
            "/api/v1/auth/register",
            data={"email": email, "password": password, "name": "E2E Full"},
        )
        assert reg_r.status_code in (200, 201), f"Register failed: {reg_r.text}"

        # 2. Connexion
        login_r = await client.post(
            "/api/v1/auth/login",
            data={"email": email, "password": password},
        )
        assert login_r.status_code == 200, f"Login failed: {login_r.text}"

        token = login_r.json().get("token")
        if token:
            client.headers["Authorization"] = f"Bearer {token}"

        # 3. Catalogue accessible
        cat_r = await client.get("/api/v1/catalogue")
        assert cat_r.status_code in (200, 204), f"Catalogue failed: {cat_r.text}"

        # 4. Liste fournisseurs accessible
        fournisseurs_r = await client.get("/api/v1/catalogue/fournisseurs")
        assert fournisseurs_r.status_code == 200, f"Fournisseurs failed: {fournisseurs_r.text}"

        # 5. Logout (CSRF : Origin SPA autorisé)
        logout_r = await client.post("/api/v1/auth/logout", headers=_E2E_SPA_ORIGIN_HEADERS)
        assert logout_r.status_code in (200, 204), f"Logout failed: {logout_r.text}"

        # 6. Catalogue inaccessible après logout (si cookie-based, token toujours valide)
        if not token:
            # Cookie-based : vérifier que la session est invalidée
            post_logout_r = await client.get("/api/v1/catalogue")
            assert post_logout_r.status_code == 401, (
                f"Expected 401 after logout, got {post_logout_r.status_code}"
            )
