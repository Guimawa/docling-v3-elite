"""Tests — domains.billing.stripe_checkout_service."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from core.config import settings
from domains.billing.stripe_checkout_service import (
    _absolute_pwa_base,
    _success_and_cancel_urls,
    create_checkout_session_url,
)


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


def test_absolute_pwa_base_defaults_localhost(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "PWA_URL", "")
    assert _absolute_pwa_base() == "http://localhost:5173"


def test_absolute_pwa_base_uses_config(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "PWA_URL", "https://example.app/")
    assert _absolute_pwa_base() == "https://example.app"


def test_success_and_cancel_urls(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "PWA_URL", "https://app.example")
    monkeypatch.setattr(settings, "STRIPE_CHECKOUT_SUCCESS_PATH", "/settings?checkout=success")
    monkeypatch.setattr(settings, "STRIPE_CHECKOUT_CANCEL_PATH", "/tarifs")
    su, cu = _success_and_cancel_urls()
    assert "session_id={CHECKOUT_SESSION_ID}" in su
    assert su.startswith("https://app.example/settings?checkout=success")
    assert cu == "https://app.example/tarifs"


@pytest.mark.asyncio
async def test_create_checkout_503_without_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "")
    monkeypatch.setattr(settings, "STRIPE_PRICE_ID", "price_test123")

    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(
        return_value={"email": "u@test.local", "stripe_customer_id": None},
    )
    fake_pool = _FakePool(mock_conn)

    async def fake_get_pool() -> _FakePool:
        return fake_pool

    monkeypatch.setattr(
        "domains.billing.stripe_checkout_service.DBManager.get_pool",
        fake_get_pool,
    )

    with pytest.raises(HTTPException) as exc:
        await create_checkout_session_url(1)
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_create_checkout_503_without_price(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setattr(settings, "STRIPE_PRICE_ID", "")
    with pytest.raises(HTTPException) as exc:
        await create_checkout_session_url(1)
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_create_checkout_returns_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setattr(settings, "STRIPE_PRICE_ID", "price_test123")
    monkeypatch.setattr(settings, "PWA_URL", "https://app.example")

    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(
        return_value={"email": "u@test.local", "stripe_customer_id": None},
    )
    fake_pool = _FakePool(mock_conn)

    async def fake_get_pool() -> _FakePool:
        return fake_pool

    monkeypatch.setattr(
        "domains.billing.stripe_checkout_service.DBManager.get_pool",
        fake_get_pool,
    )

    async def fake_stripe_post(*args, **kwargs):
        return {"url": "https://checkout.stripe.com/c/pay/cs_test_abc"}

    monkeypatch.setattr(
        "domains.billing.stripe_checkout_service.stripe_post",
        fake_stripe_post,
    )

    url = await create_checkout_session_url(42)
    assert url.startswith("https://checkout.stripe.com/")


@pytest.mark.asyncio
async def test_create_checkout_502_on_stripe_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setattr(settings, "STRIPE_PRICE_ID", "price_test123")

    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(
        return_value={"email": "u@test.local", "stripe_customer_id": None},
    )
    fake_pool = _FakePool(mock_conn)

    async def fake_get_pool() -> _FakePool:
        return fake_pool

    monkeypatch.setattr(
        "domains.billing.stripe_checkout_service.DBManager.get_pool",
        fake_get_pool,
    )

    async def fake_stripe_post(*args, **kwargs):
        raise HTTPException(status_code=502, detail="Stripe error")

    monkeypatch.setattr(
        "domains.billing.stripe_checkout_service.stripe_post",
        fake_stripe_post,
    )

    with pytest.raises(HTTPException) as exc:
        await create_checkout_session_url(1)
    assert exc.value.status_code == 502
