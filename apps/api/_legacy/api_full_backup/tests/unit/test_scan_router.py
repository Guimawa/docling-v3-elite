"""Tests unitaires — domains.scan.router (handler PDF, sans serveur)."""

from __future__ import annotations

import pytest

from core.db_manager import DBManager
from domains.scan.router import get_facture_pdf_url


class FakePdfResolver:
    def __init__(self) -> None:
        self.calls: list[tuple[str, int]] = []

    def get_presigned_url_from_pdf_url(self, pdf_url: str, expires_in: int = 3600) -> str | None:
        self.calls.append((pdf_url, expires_in))
        return f"https://presigned.example/{expires_in}"


@pytest.mark.asyncio
async def test_get_facture_pdf_url_uses_injected_resolver_and_db_pdf(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_get_facture_pdf_url(_facture_id: int, *, user_id: int | None) -> str | None:
        assert _facture_id == 42
        assert user_id == 5
        return "storj://bucket/obj.pdf"

    monkeypatch.setattr(DBManager, "get_facture_pdf_url", fake_get_facture_pdf_url)

    resolver = FakePdfResolver()
    out = await get_facture_pdf_url(
        facture_id=42,
        user_id=5,
        pdf_url_resolver=resolver,
    )

    assert out == {"url": "https://presigned.example/3600", "expires_in": 3600}
    assert resolver.calls == [("storj://bucket/obj.pdf", 3600)]
