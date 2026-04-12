"""
Tests de sécurité — bypass auth, token expiré/modifié.
"""

import importlib
import os

import pytest

pytestmark = [pytest.mark.security]


def test_expired_token_rejected(ensure_server_strict_auth: str):
    """Token expiré → 401 sur /auth/me."""
    import services.auth_service as auth_mod

    # auth_service lit JWT_EXPIRY_SECONDS (pas JWT_EXPIRY_HOURS) à l'import
    orig = os.environ.get("JWT_EXPIRY_SECONDS")
    os.environ["JWT_EXPIRY_SECONDS"] = "-1"
    importlib.reload(auth_mod)
    token = auth_mod.create_token(user_id=1, email="test@test.com")
    if orig is not None:
        os.environ["JWT_EXPIRY_SECONDS"] = orig
    else:
        os.environ.pop("JWT_EXPIRY_SECONDS", None)
    importlib.reload(auth_mod)

    import httpx

    client = httpx.Client(base_url=ensure_server_strict_auth, timeout=10)
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401
    client.close()


def test_tampered_token_rejected(
    ensure_server_strict_auth: str,
    unique_user: dict,
):
    """Token modifié → 401."""
    import httpx

    from services.auth_service import create_token

    token = create_token(user_id=1, email=unique_user["email"])
    parts = token.split(".")
    parts[1] = parts[1][::-1]
    tampered = ".".join(parts)

    client = httpx.Client(base_url=ensure_server_strict_auth, timeout=10)
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tampered}"},
    )
    assert resp.status_code == 401
    client.close()


def test_no_token_401(ensure_server_strict_auth: str):
    """Sans header Authorization → 401."""
    import httpx

    client = httpx.Client(base_url=ensure_server_strict_auth, timeout=10)
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    client.close()
