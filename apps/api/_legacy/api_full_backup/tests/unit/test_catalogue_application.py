"""Tests unitaires pour domains.catalogue.application — mocks DBManager, zéro I/O réel."""

from __future__ import annotations

from decimal import Decimal

import pytest

from core.db_manager import DBManager
from domains.catalogue.application import (
    CatalogueValidationError,
    batch_save,
    compare_prices,
    list_products,
    update_product,
)


@pytest.mark.asyncio
async def test_compare_prices_raises_when_search_shorter_than_two_chars() -> None:
    for bad in ("", " ", "a", "  x  "):
        with pytest.raises(CatalogueValidationError, match="Recherche trop courte"):
            await compare_prices(bad, with_history=False, user_id=1)


@pytest.mark.asyncio
async def test_batch_save_partial_success_when_historique_failures_positive(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_upsert(
        _produits: list,
        *,
        source: str,
        user_id: int | None,
    ) -> tuple[int, int]:
        return (1, 2)

    monkeypatch.setattr(DBManager, "upsert_products_batch", fake_upsert)

    produits = [{"id": 1}, {"id": 2}]
    out = await batch_save(produits, "test-source", user_id=99)

    assert out["saved"] == 1
    assert out["total"] == 2
    assert out["partial_success"] is True
    assert out["historique_errors"] == 2


@pytest.mark.asyncio
async def test_update_product_returns_none_when_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_update(
        _product_id: int,
        _updates: dict,
        *,
        user_id: int | None,
    ) -> dict | None:
        return None

    monkeypatch.setattr(DBManager, "update_product", fake_update)

    result = await update_product(12345, {"famille": "X"}, user_id=1)
    assert result is None


@pytest.mark.asyncio
async def test_list_products_serializes_products_key(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_catalogue(**_kwargs: object) -> dict:
        return {
            "products": [{"id": 1, "prix_ht": Decimal("12.34")}],
            "next_cursor": "abc",
        }

    monkeypatch.setattr(DBManager, "get_catalogue", fake_get_catalogue)

    out = await list_products(user_id=7)

    assert out["next_cursor"] == "abc"
    assert len(out["products"]) == 1
    assert out["products"][0]["prix_ht"] == "12.34"
