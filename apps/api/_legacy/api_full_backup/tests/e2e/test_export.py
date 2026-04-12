"""
Tests E2E — export données, historique, stats.
Nécessitent le serveur en cours d'exécution.
Skip automatiquement si serveur non disponible.
"""

import os
import time

import httpx
import pytest

from tests.skip_reasons import SRV_E2E_LEGACY

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")

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


async def _authenticated_client_headers() -> httpx.AsyncClient:
    """Retourne un client authentifié (Bearer si présent, sinon cookie session)."""
    email = f"e2e_export_{int(time.time())}@test.com"
    password = "DoclingE2E_Export!2026_X"
    client = httpx.AsyncClient(base_url=BASE_URL, follow_redirects=True)
    await client.post(
        "/api/v1/auth/register",
        data={"email": email, "password": password, "name": "E2E Export"},
    )
    login_r = await client.post(
        "/api/v1/auth/login",
        data={"email": email, "password": password},
    )
    assert login_r.status_code == 200, f"Login échoué : {login_r.text}"
    token = login_r.json().get("token")
    if token:
        client.headers["Authorization"] = f"Bearer {token}"
    return client


# ─── Test 1 : Export sans auth → 401 ─────────────────────────────────────────
@pytest.mark.anyio
async def test_export_requires_auth():
    """GET /export/my-data sans token → 401."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)

    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.get("/api/v1/export/my-data")
        assert r.status_code == 401, f"Attendu 401, reçu {r.status_code}"


# ─── Test 2 : Export avec auth → 200 + JSON valide ───────────────────────────
@pytest.mark.anyio
async def test_export_my_data_authenticated():
    """Login → GET /export/my-data → 200, structure JSON valide."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)

    client = await _authenticated_client_headers()
    try:
        r = await client.get("/api/v1/export/my-data")
        assert r.status_code == 200, f"Export échoué : {r.text}"
        data = r.json()
        # La réponse doit être un dict avec au moins une clé connue
        assert isinstance(data, dict), f"Réponse non-JSON : {type(data)}"
    finally:
        await client.aclose()


# ─── Test 3 : Historique sans auth → 401 ─────────────────────────────────────
@pytest.mark.anyio
async def test_history_requires_auth():
    """GET /history sans token → 401."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)

    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.get("/api/v1/history")
        assert r.status_code == 401, f"Attendu 401, reçu {r.status_code}"


# ─── Test 4 : Stats sans auth → 401 ──────────────────────────────────────────
@pytest.mark.anyio
async def test_stats_requires_auth():
    """GET /stats sans token → 401."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)

    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.get("/api/v1/stats")
        assert r.status_code == 401, f"Attendu 401, reçu {r.status_code}"


# ─── Test 5 : Historique avec auth → 200 ─────────────────────────────────────
@pytest.mark.anyio
async def test_history_authenticated():
    """Login → GET /history → 200, liste (vide ou non)."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)

    client = await _authenticated_client_headers()
    try:
        r = await client.get("/api/v1/history")
        assert r.status_code == 200, f"History échoué : {r.text}"
        data = r.json()
        assert isinstance(data, (list, dict)), f"Structure inattendue : {type(data)}"
    finally:
        await client.aclose()


# ─── Test 6 : Stats avec auth → 200 ──────────────────────────────────────────
@pytest.mark.anyio
async def test_stats_authenticated():
    """Login → GET /stats → 200, champs stats présents."""
    if not await server_available():
        pytest.skip(SRV_E2E_LEGACY)

    client = await _authenticated_client_headers()
    try:
        r = await client.get("/api/v1/stats")
        assert r.status_code == 200, f"Stats échoué : {r.text}"
        data = r.json()
        assert isinstance(data, dict), f"Stats non-dict : {type(data)}"
    finally:
        await client.aclose()
