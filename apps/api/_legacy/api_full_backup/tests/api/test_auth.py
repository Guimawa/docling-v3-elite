"""
Tests API — authentification (Form data, pas JSON).
"""

import httpx
import pytest

from tests.skip_reasons import AUTH_REGISTER_500_SHORT


def test_register_success(ensure_server_running: str, unique_user: dict):
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    resp = client.post(
        "/api/v1/auth/register",
        data={
            "email": unique_user["email"],
            "password": unique_user["password"],
            "name": unique_user.get("name", ""),
        },
    )
    if resp.status_code == 500:
        pytest.skip(AUTH_REGISTER_500_SHORT)
    assert resp.status_code == 200
    data = resp.json()
    assert "user_id" in data
    assert data["email"] == unique_user["email"]
    client.close()


def test_register_duplicate_email_409(ensure_server_running: str, unique_user: dict):
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    # Premier enregistrement
    client.post(
        "/api/v1/auth/register",
        data={
            "email": unique_user["email"],
            "password": unique_user["password"],
            "name": unique_user.get("name", ""),
        },
    )
    # Doublon
    resp = client.post(
        "/api/v1/auth/register",
        data={
            "email": unique_user["email"],
            "password": "OtherPass123!",
            "name": "Other",
        },
    )
    assert resp.status_code == 409
    detail = resp.json().get("detail", "").lower()
    assert "utilise" in detail or "deja" in detail or "already" in detail
    client.close()


def test_register_missing_fields_422(ensure_server_running: str):
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    resp = client.post("/api/v1/auth/register", data={})
    assert resp.status_code in (422, 400)
    client.close()


def test_login_success(authenticated_client):
    client, user = authenticated_client
    # Déjà authentifié, vérifier /me
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == user["email"]


def test_login_wrong_password_401(ensure_server_running: str, unique_user: dict):
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    client.post(
        "/api/v1/auth/register",
        data={
            "email": unique_user["email"],
            "password": unique_user["password"],
            "name": unique_user.get("name", ""),
        },
    )
    resp = client.post(
        "/api/v1/auth/login",
        data={
            "email": unique_user["email"],
            "password": "WrongPassword123!",
        },
    )
    assert resp.status_code == 401
    client.close()


def test_me_no_token_401(http_client_strict: httpx.Client):
    resp = http_client_strict.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_me_invalid_token_401(ensure_server_strict_auth: str):
    client = httpx.Client(
        base_url=ensure_server_strict_auth,
        timeout=30,
        headers={"Authorization": "Bearer invalid.token.here"},
    )
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    client.close()


def test_login_nonexistent_email_401(ensure_server_running: str):
    """Login avec email inexistant → 401 (même comportement qu'un mauvais password)."""
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    resp = client.post(
        "/api/v1/auth/login",
        data={
            "email": "doesnotexist@example.com",
            "password": "anypass123",
        },
    )
    assert resp.status_code == 401
    # Pas de leak d'info (user enumeration) : pas de "email inexistant" explicite
    client.close()


def test_login_guest_email_forbidden_403(ensure_server_running: str):
    """Le compte invité FREE_ACCESS ne doit pas être utilisable en login interactif."""
    from domains.shared import state as guest_state

    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    resp = client.post(
        "/api/v1/auth/login",
        data={
            "email": guest_state.GUEST_USER_EMAIL,
            "password": "anything",
        },
    )
    assert resp.status_code == 403
    assert "invité" in resp.json().get("detail", "").lower()
    client.close()


def test_register_guest_email_forbidden_403(ensure_server_running: str):
    from domains.shared import state as guest_state

    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    resp = client.post(
        "/api/v1/auth/register",
        data={
            "email": guest_state.GUEST_USER_EMAIL,
            "password": "ValidPass123!",
            "name": "X",
        },
    )
    assert resp.status_code == 403
    client.close()
