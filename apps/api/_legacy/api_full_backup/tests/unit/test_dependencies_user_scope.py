"""Portée auth : require_user_id vs identité service (sans serveur ni DB)."""

from unittest.mock import patch

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from domains.shared.dependencies import get_current_user, get_service_or_user, require_user_id


def _mini_app() -> FastAPI:
    app = FastAPI()

    @app.get("/user-only")
    async def user_only(uid: int = Depends(require_user_id)):
        return {"user_id": uid}

    @app.get("/svc-or-user")
    async def mixed(_user: dict = Depends(get_service_or_user)):
        return {"sub": _user.get("sub")}

    return app


def test_require_user_id_rejects_service_sub() -> None:
    app = _mini_app()

    async def fake_service() -> dict:
        return {"sub": "service", "email": "service@pronto.internal", "role": "service"}

    app.dependency_overrides[get_current_user] = fake_service
    try:
        client = TestClient(app)
        r = client.get("/user-only")
        assert r.status_code == 403
        assert "utilisateur" in r.json().get("detail", "").lower()
    finally:
        app.dependency_overrides.clear()


def test_require_user_id_accepts_numeric_sub() -> None:
    app = _mini_app()

    async def fake_user() -> dict:
        return {"sub": "42", "email": "u@example.com", "role": "user"}

    app.dependency_overrides[get_current_user] = fake_user
    try:
        client = TestClient(app)
        r = client.get("/user-only")
        assert r.status_code == 200
        assert r.json() == {"user_id": 42}
    finally:
        app.dependency_overrides.clear()


@patch(
    "domains.shared.dependencies.Config.get_service_keys",
    return_value={"integration-test-key"},
)
def test_get_service_or_user_accepts_valid_service_key(_mock_keys: object) -> None:
    app = _mini_app()
    client = TestClient(app)
    r = client.get("/svc-or-user", headers={"X-Service-Key": "integration-test-key"})
    assert r.status_code == 200
    assert r.json() == {"sub": "service"}


@patch("domains.shared.dependencies.Config.get_service_keys", return_value=set())
def test_get_service_or_user_rejects_unknown_service_key(_mock_keys: object) -> None:
    app = _mini_app()
    client = TestClient(app)
    r = client.get("/svc-or-user", headers={"X-Service-Key": "nope"})
    assert r.status_code == 401
