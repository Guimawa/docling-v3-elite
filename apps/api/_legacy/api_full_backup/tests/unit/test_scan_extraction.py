"""Tests unitaires — domains.scan.extraction (sanitize_job_error, run_extraction + engine injecté)."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from core.db_manager import DBManager
from domains.scan import extraction as ext
from domains.scan.extraction import run_extraction, sanitize_job_error


def test_sanitize_job_error_tripped_circuit() -> None:
    msg = sanitize_job_error(Exception("anything"), tripped=True)
    assert "temporairement indisponible" in msg


@pytest.mark.parametrize(
    ("exc_msg", "expected_snippet"),
    [
        ("HTTP 429 too many", "Quota API"),
        ("RESOURCE_EXHAUSTED on call", "Quota API"),
        ("rate limit exceeded", "Quota API"),
        ("quota exceeded for project", "Quota API"),
        ("status 401 unauthorized", "Clé API"),
        ("403 forbidden", "Clé API"),
        ("invalid api key provided", "Clé API"),
        ("bad api_key in request", "Clé API"),
        ("connection timeout", "Délai d'attente"),
        ("request timed out", "Délai d'attente"),
        ("unexpected boom", "Erreur lors de l'extraction"),
    ],
)
def test_sanitize_job_error_categories(exc_msg: str, expected_snippet: str) -> None:
    assert expected_snippet in sanitize_job_error(Exception(exc_msg), tripped=False)


@pytest.mark.asyncio
async def test_run_extraction_uses_injected_engine_not_global(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    engine_calls: list[dict] = []

    class StubEngine:
        async def process_file(
            self,
            file_bytes: bytes,
            filename: str,
            *,
            model_id: str,
            source: str,
            user_id: int | None = None,
        ) -> dict:
            engine_calls.append(
                {
                    "file_bytes": file_bytes,
                    "filename": filename,
                    "model_id": model_id,
                    "source": source,
                    "user_id": user_id,
                }
            )
            return {"success": True, "products": [], "error": None}

    async def fake_update_job(
        job_id: str,
        status: str,
        *,
        result: dict | None = None,
        error: str | None = None,
    ) -> None:
        fake_update_job.last = (job_id, status, result, error)

    fake_update_job.last = None  # type: ignore[attr-defined]

    async def noop_success() -> None:
        return None

    async def noop_failure() -> bool:
        return False

    fake_cb = SimpleNamespace(
        is_open=lambda: False,
        record_success=noop_success,
        record_failure=noop_failure,
        threshold=5,
    )

    monkeypatch.setattr(ext, "_gemini_cb", fake_cb)
    monkeypatch.setattr(DBManager, "update_job", fake_update_job)

    await run_extraction(
        "job-uuid-1",
        b"data",
        "doc.pdf",
        "gemini-3-flash-preview",
        "pc",
        user_id=99,
        engine=StubEngine(),
    )

    assert len(engine_calls) == 1
    assert engine_calls[0]["model_id"] == "gemini-3-flash-preview"
    assert engine_calls[0]["user_id"] == 99
    jid, st, res, err = fake_update_job.last  # type: ignore[attr-defined, union-attr]
    assert jid == "job-uuid-1"
    assert st == "completed"
    assert res is not None and res["success"] is True
    assert err is None
