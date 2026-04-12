"""Tests unitaires — domains.billing.stripe_webhook_service (sans DB réelle)."""

from unittest.mock import AsyncMock

import pytest

from domains.billing.stripe_webhook_service import (
    dispatch_stripe_event,
    handle_stripe_webhook_payload,
)


@pytest.mark.asyncio
async def test_handle_payload_invalid_missing_event_id() -> None:
    r = await handle_stripe_webhook_payload({})
    assert r["kind"] == "error"
    assert r["received"] is False
    assert "invalide" in r["detail"].lower() or "manquant" in r["detail"].lower()


class _FakeTransaction:
    async def __aenter__(self) -> None:
        return None

    async def __aexit__(self, *args: object) -> None:
        return None


class _FakeConn:
    """Simule asyncpg : transaction + fetchrow pour idempotence + handlers."""

    def __init__(self) -> None:
        self.fetchrow = AsyncMock()

    def transaction(self) -> _FakeTransaction:
        return _FakeTransaction()


class _FakeAcquire:
    def __init__(self, conn: _FakeConn) -> None:
        self._conn = conn

    async def __aenter__(self) -> _FakeConn:
        return self._conn

    async def __aexit__(self, *args: object) -> None:
        return None


class _FakePool:
    def __init__(self, conn: _FakeConn) -> None:
        self._conn = conn

    def acquire(self) -> _FakeAcquire:
        return _FakeAcquire(self._conn)


@pytest.mark.asyncio
async def test_handle_payload_duplicate_when_insert_returns_nothing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    conn = _FakeConn()
    conn.fetchrow.return_value = None

    async def fake_get_pool() -> _FakePool:
        return _FakePool(conn)

    monkeypatch.setattr(
        "domains.billing.stripe_webhook_service.DBManager.get_pool",
        fake_get_pool,
    )

    r = await handle_stripe_webhook_payload(
        {"id": "evt_dup", "type": "ping", "data": {}},
    )
    assert r["duplicate"] is True
    assert r["processed"] is False
    assert r["kind"] == "duplicate"


@pytest.mark.asyncio
async def test_handle_payload_processes_ping_when_claim_succeeds(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    conn = _FakeConn()

    async def fetchrow_impl(query: str, *args: object) -> dict[str, str] | None:
        if "INSERT INTO stripe_webhook_events" in query:
            return {"event_id": str(args[0])}
        return None

    conn.fetchrow.side_effect = fetchrow_impl

    async def fake_get_pool() -> _FakePool:
        return _FakePool(conn)

    monkeypatch.setattr(
        "domains.billing.stripe_webhook_service.DBManager.get_pool",
        fake_get_pool,
    )

    r = await handle_stripe_webhook_payload(
        {
            "id": "evt_new",
            "type": "ping",
            "data": {"object": {}},
        },
    )
    assert r["duplicate"] is False
    assert r["processed"] is True
    assert r["kind"] == "noop"


@pytest.mark.asyncio
async def test_dispatch_checkout_session_completed_updates_user() -> None:
    conn = AsyncMock()
    conn.fetchrow = AsyncMock(return_value={"id": 42})

    session = {
        "metadata": {"user_id": "42"},
        "customer": "cus_test",
        "subscription": "sub_test",
    }
    payload = {"type": "checkout.session.completed", "data": {"object": session}}

    kind = await dispatch_stripe_event(conn, payload)
    assert kind == "checkout"
    conn.fetchrow.assert_awaited()


@pytest.mark.asyncio
async def test_dispatch_subscription_event() -> None:
    conn = AsyncMock()
    conn.fetchrow = AsyncMock(return_value={"id": 1})

    sub = {
        "id": "sub_123",
        "customer": "cus_x",
        "status": "active",
        "current_period_end": 1_700_000_000,
    }
    payload = {"type": "customer.subscription.updated", "data": {"object": sub}}

    kind = await dispatch_stripe_event(conn, payload)
    assert kind == "subscription"
    conn.fetchrow.assert_awaited()


@pytest.mark.asyncio
async def test_dispatch_invoice_paid() -> None:
    conn = AsyncMock()
    conn.fetchrow = AsyncMock(return_value={"id": 1})

    inv = {"customer": "cus_inv"}
    payload = {"type": "invoice.paid", "data": {"object": inv}}

    kind = await dispatch_stripe_event(conn, payload)
    assert kind == "invoice"
    conn.fetchrow.assert_awaited()


@pytest.mark.asyncio
async def test_dispatch_invoice_payment_failed() -> None:
    conn = AsyncMock()
    conn.execute = AsyncMock()

    inv = {"customer": "cus_inv"}
    payload = {"type": "invoice.payment_failed", "data": {"object": inv}}

    kind = await dispatch_stripe_event(conn, payload)
    assert kind == "invoice_failed"
    conn.execute.assert_awaited()
