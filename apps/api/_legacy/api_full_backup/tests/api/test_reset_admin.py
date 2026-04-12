"""
Tests API — reset catalogue (admin uniquement).
"""

import httpx
import pytest

from tests.skip_reasons import AUTH_LOGIN_500, AUTH_LOGIN_NO_TOKEN


def test_reset_without_confirm_400(http_client: httpx.Client):
    resp = http_client.delete("/api/v1/catalogue/reset")
    assert resp.status_code in (400, 403)


def test_reset_without_admin_token_403(ensure_server_running: str, unique_user: dict):
    """Sans token admin, même avec confirm → 403."""
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    client.post(
        "/api/v1/auth/register",
        data={
            "email": unique_user["email"],
            "password": unique_user["password"],
            "name": unique_user.get("name", ""),
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        data={"email": unique_user["email"], "password": unique_user["password"]},
    )
    if login.status_code >= 500:
        pytest.skip(AUTH_LOGIN_500)
    payload = login.json() if "application/json" in login.headers.get("content-type", "") else {}
    token = payload.get("token")
    if not token and payload.get("user_id") and payload.get("email"):
        from services.auth_service import create_token

        token = create_token(
            user_id=int(payload["user_id"]),
            email=payload["email"],
            role=payload.get("role", "user"),
        )
    if not token:
        pytest.skip(AUTH_LOGIN_NO_TOKEN)
    client.headers["Authorization"] = f"Bearer {token}"
    resp = client.delete(
        "/api/v1/catalogue/reset",
        params={"confirm": "SUPPRIMER_TOUT"},
    )
    assert resp.status_code == 403
    client.close()


def test_reset_with_confirm_but_no_token_400(ensure_server_running: str):
    """Confirm sans token → 400 (manque confirm) ou 403."""
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    resp = client.delete(
        "/api/v1/catalogue/reset",
        params={"confirm": "SUPPRIMER_TOUT"},
    )
    assert resp.status_code in (400, 403)
    client.close()
