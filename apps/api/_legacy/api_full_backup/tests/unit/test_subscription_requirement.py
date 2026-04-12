"""Tests — require_active_subscription."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from core.config import settings
from domains.shared.dependencies import require_active_subscription


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


@pytest.mark.asyncio
async def test_require_subscription_skipped_when_free_access(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "FREE_ACCESS_MODE", True)
    uid = await require_active_subscription(42)
    assert uid == 42


@pytest.mark.asyncio
async def test_require_subscription_active_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "FREE_ACCESS_MODE", False)

    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(return_value={"subscription_status": "active"})
    fake_pool = _FakePool(mock_conn)

    async def fake_get_pool() -> _FakePool:
        return fake_pool

    monkeypatch.setattr(
        "domains.shared.dependencies.DBManager.get_pool",
        fake_get_pool,
    )

    uid = await require_active_subscription(99)
    assert uid == 99


@pytest.mark.asyncio
async def test_require_subscription_inactive_402(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "FREE_ACCESS_MODE", False)

    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(return_value={"subscription_status": "canceled"})
    fake_pool = _FakePool(mock_conn)

    async def fake_get_pool() -> _FakePool:
        return fake_pool

    monkeypatch.setattr(
        "domains.shared.dependencies.DBManager.get_pool",
        fake_get_pool,
    )

    with pytest.raises(HTTPException) as exc:
        await require_active_subscription(1)
    assert exc.value.status_code == 402
