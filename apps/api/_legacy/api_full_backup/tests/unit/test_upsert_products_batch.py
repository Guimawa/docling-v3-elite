"""Tests unitaires upsert_products_batch — mocks asyncpg, pas d'I/O réseau."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from core.db_manager import _UPSERT_PRODUCTS_CHUNK_SIZE, DBManager


def _product(i: int, raw: str | None = None) -> dict:
    return {
        "fournisseur": "Fco",
        "designation_raw": raw or f"RAW-{i}",
        "designation_fr": f"FR-{i}",
        "famille": "Autre",
        "unite": "unité",
        "prix_brut_ht": 10.0,
        "remise_pct": 0.0,
        "prix_remise_ht": 8.0,
        "prix_ttc_iva21": 9.68,
        "confidence": "high",
    }


class _AcquireCM:
    def __init__(self, conn):
        self._conn = conn

    async def __aenter__(self):
        return self._conn

    async def __aexit__(self, *args):
        return None


class _TxCM:
    async def __aenter__(self):
        return None

    async def __aexit__(self, *args):
        return None


def _make_conn(fetch_impl, execute_impl=None):
    conn = MagicMock()
    conn.transaction = MagicMock(return_value=_TxCM())
    conn.fetch = AsyncMock(side_effect=fetch_impl)
    conn.fetchrow = AsyncMock()
    if execute_impl is not None:
        conn.execute = AsyncMock(side_effect=execute_impl)
    else:
        conn.execute = AsyncMock()
    return conn


@pytest.mark.asyncio
async def test_upsert_empty_returns_zero_without_pool(monkeypatch):
    """Liste vide : pas d'appel pool."""
    called = []

    async def no_pool():
        called.append(True)
        raise AssertionError("get_pool ne doit pas être appelé")

    monkeypatch.setattr(DBManager, "get_pool", no_pool)
    n, h = await DBManager.upsert_products_batch([], source="pc", user_id=None)
    assert (n, h) == (0, 0)
    assert called == []


@pytest.mark.asyncio
async def test_batch_path_one_fetch_per_chunk(monkeypatch):
    """Un fetch pour l'upsert lot + pas de fetchrow sur le chemin nominal."""
    products = [_product(i) for i in range(5)]

    async def fetch_side_effect(sql, *args):
        assert "unnest" in sql.lower()
        uids, keys = args[0], args[1]
        out = []
        for i in range(len(keys)):
            out.append(
                {
                    "id": 500 + i,
                    "product_key": keys[i],
                    "user_id": uids[i],
                }
            )
        return out

    conn = _make_conn(fetch_side_effect)
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=_AcquireCM(conn))

    async def fake_get_pool():
        return pool

    monkeypatch.setattr(DBManager, "get_pool", fake_get_pool)
    monkeypatch.setattr(DBManager, "_pool", None)

    n, h = await DBManager.upsert_products_batch(products, source="mobile", user_id=42)

    assert n == len(products)
    assert h == 0
    assert conn.fetch.await_count == 1
    assert conn.fetchrow.await_count == 0
    exec_calls = [str(c.args[0]).upper() for c in conn.execute.await_args_list]
    assert any("SAVEPOINT" in x for x in exec_calls)
    assert any("RELEASE SAVEPOINT" in x for x in exec_calls)
    hist_sql = next(
        (c.args[0] for c in conn.execute.await_args_list if "prix_historique" in c.args[0]),
        None,
    )
    assert hist_sql is not None
    assert "unnest" in hist_sql.lower()


@pytest.mark.asyncio
async def test_dedupe_same_conflict_key_in_chunk(monkeypatch):
    """Deux lignes même clé : unnest avec une seule ligne pour l'upsert, deux historiques."""
    p1 = _product(1, raw="SAME")
    p2 = {
        **_product(2, raw="SAME"),
        "designation_fr": p1["designation_fr"],
        "unite": p1["unite"],
        "prix_remise_ht": 9.0,
    }
    products = [p1, p2]

    seen_lens = []

    async def fetch_side_effect(sql, *args):
        assert "unnest" in sql.lower()
        keys = args[1]
        seen_lens.append(len(keys))
        uids = args[0]
        return [
            {
                "id": 777,
                "product_key": keys[0],
                "user_id": uids[0],
            }
        ]

    conn = _make_conn(fetch_side_effect)
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=_AcquireCM(conn))

    monkeypatch.setattr(DBManager, "get_pool", AsyncMock(return_value=pool))
    monkeypatch.setattr(DBManager, "_pool", None)

    n, h = await DBManager.upsert_products_batch(products, source="pc", user_id=7)
    assert n == 2
    assert seen_lens == [1]
    assert conn.fetch.await_count == 1


@pytest.mark.asyncio
async def test_fallback_sequential_on_batch_failure(monkeypatch):
    """Échec du lot → ROLLBACK TO SAVEPOINT + fetchrow par produit."""
    products = [_product(i) for i in range(3)]
    fetch_calls = 0

    async def fetch_side_effect(sql, *args):
        nonlocal fetch_calls
        fetch_calls += 1
        raise RuntimeError("batch insert simulated failure")

    conn = _make_conn(fetch_side_effect)
    rid = iter([301, 302, 303])

    async def fetchrow_side_effect(sql, *args):
        return {"id": next(rid)}

    conn.fetchrow = AsyncMock(side_effect=fetchrow_side_effect)

    pool = MagicMock()
    pool.acquire = MagicMock(return_value=_AcquireCM(conn))

    monkeypatch.setattr(DBManager, "get_pool", AsyncMock(return_value=pool))
    monkeypatch.setattr(DBManager, "_pool", None)

    n, h = await DBManager.upsert_products_batch(products, source="pc", user_id=None)
    assert n == 3
    assert h == 0
    assert fetch_calls == 1
    assert conn.fetchrow.await_count == 3
    exec_calls = " ".join(str(c.args[0]).upper() for c in conn.execute.await_args_list)
    assert "ROLLBACK TO SAVEPOINT" in exec_calls


@pytest.mark.asyncio
async def test_multiple_chunks_respects_chunk_size(monkeypatch):
    """Plus d'un lot si len > _UPSERT_PRODUCTS_CHUNK_SIZE."""
    n_items = _UPSERT_PRODUCTS_CHUNK_SIZE + 10
    products = [_product(i) for i in range(n_items)]

    async def fetch_side_effect(sql, *args):
        uids, keys = args[0], args[1]
        return [
            {
                "id": 1000 + j,
                "product_key": keys[j],
                "user_id": uids[j],
            }
            for j in range(len(keys))
        ]

    conn = _make_conn(fetch_side_effect)
    pool = MagicMock()
    pool.acquire = MagicMock(return_value=_AcquireCM(conn))

    monkeypatch.setattr(DBManager, "get_pool", AsyncMock(return_value=pool))
    monkeypatch.setattr(DBManager, "_pool", None)

    n, h = await DBManager.upsert_products_batch(products, source="pc", user_id=1)
    assert n == n_items
    assert h == 0
    assert conn.fetch.await_count == 2
