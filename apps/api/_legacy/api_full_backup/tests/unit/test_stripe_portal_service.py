"""Tests — domains.billing.stripe_portal_service."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from core.config import settings
from domains.billing.stripe_portal_service import _portal_return_url, create_billing_portal_url


class _FakeAcquireCtx:
    def __init__(self, conn: object) -> None:
        self._conn = conn

    async def __aenter__(self) -> object:
        return self._conn

    async def __aexit__(self, *args: object) -> None:
        return None


class _FakePool:
    def __init__(self, conn: object) -> None:
        self._conn = conn

    def acquire(self) -> _FakeAcquireCtx:
        return _FakeAcquireCtx(self._conn)


def test_portal_return_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "PWA_URL", "https://app.example")
    monkeypatch.setattr(settings, "STRIPE_PORTAL_RETURN_PATH", "/settings")
    assert _portal_return_url() == "https://app.example/settings"


@pytest.mark.asyncio
async def test_portal_503_without_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "")

    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(
        return_value={"stripe_customer_id": "cus_abc"},
    )
    fake_pool = _FakePool(mock_conn)

    async def fake_get_pool() -> _FakePool:
        return fake_pool

    monkeypatch.setattr(
        "domains.billing.stripe_portal_service.DBManager.get_pool",
        fake_get_pool,
    )

    with pytest.raises(HTTPException) as exc:
        await create_billing_portal_url(1)
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_portal_409_without_stripe_customer(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_fake")

    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(
        return_value={"stripe_customer_id": None},
    )
    fake_pool = _FakePool(mock_conn)

    async def fake_get_pool() -> _FakePool:
        return fake_pool

    monkeypatch.setattr(
        "domains.billing.stripe_portal_service.DBManager.get_pool",
        fake_get_pool,
    )

    with pytest.raises(HTTPException) as exc:
        await create_billing_portal_url(1)
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_portal_returns_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setattr(settings, "PWA_URL", "https://app.example")

    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(
        return_value={"stripe_customer_id": "cus_abc"},
    )
    fake_pool = _FakePool(mock_conn)

    async def fake_get_pool() -> _FakePool:
        return fake_pool

    monkeypatch.setattr(
        "domains.billing.stripe_portal_service.DBManager.get_pool",
        fake_get_pool,
    )

    async def fake_stripe_post(*args, **kwargs):
        return {"url": "https://billing.stripe.com/session/test"}

    monkeypatch.setattr(
        "domains.billing.stripe_portal_service.stripe_post",
        fake_stripe_post,
    )

    url = await create_billing_portal_url(7)
    assert url.startswith("https://billing.stripe.com/")
