"""Tests unitaires — domains.scan.adapters (délégation vers Orchestrator / StorageService)."""

from __future__ import annotations

import pytest

import domains.scan.adapters as scan_adapters
from domains.scan.adapters import OrchestratorExtractionEngine, StoragePresignedPdfUrlResolver


@pytest.mark.asyncio
async def test_orchestrator_extraction_engine_delegates_to_orchestrator_process_file(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}

    async def fake_process_file(
        file_bytes: bytes,
        filename: str,
        model_id: str,
        source: str,
        user_id: int | None = None,
    ) -> dict:
        captured.update(
            {
                "file_bytes": file_bytes,
                "filename": filename,
                "model_id": model_id,
                "source": source,
                "user_id": user_id,
            }
        )
        return {"success": True, "products": []}

    monkeypatch.setattr(
        scan_adapters.Orchestrator,
        "process_file",
        staticmethod(fake_process_file),
    )

    engine = OrchestratorExtractionEngine()
    out = await engine.process_file(
        b"abc",
        "f.pdf",
        model_id="gemini-2.5-flash",
        source="pc",
        user_id=7,
    )

    assert out == {"success": True, "products": []}
    assert captured["file_bytes"] == b"abc"
    assert captured["filename"] == "f.pdf"
    assert captured["model_id"] == "gemini-2.5-flash"
    assert captured["source"] == "pc"
    assert captured["user_id"] == 7


def test_storage_presigned_pdf_url_resolver_delegates_to_storage_service(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, int]] = []

    @classmethod
    def fake_get_presigned(cls, pdf_url: str, expires_in: int = 3600) -> str | None:
        calls.append((pdf_url, expires_in))
        return f"signed:{pdf_url}"

    monkeypatch.setattr(
        scan_adapters.StorageService,
        "get_presigned_url_from_pdf_url",
        fake_get_presigned,
    )

    resolver = StoragePresignedPdfUrlResolver()
    url = resolver.get_presigned_url_from_pdf_url("s3://bucket/key.pdf", expires_in=7200)

    assert url == "signed:s3://bucket/key.pdf"
    assert calls == [("s3://bucket/key.pdf", 7200)]
