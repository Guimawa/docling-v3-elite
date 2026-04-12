"""
Intégration DB : claim_next_job (SKIP LOCKED).

Sans DATABASE_URL ou sans migration a015 : skip (zéro mock asyncpg).
"""

from __future__ import annotations

import os
import uuid

import pytest

from core.config import Config
from tests.skip_reasons import DB_URL_MISSING_SHORT, MIG_A015_JOBS


@pytest.mark.asyncio
async def test_claim_next_job_roundtrip_pending_to_claimed() -> None:
    if not (os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL") or "").strip():
        pytest.skip(DB_URL_MISSING_SHORT)

    from core.db_manager import DBManager

    await DBManager.get_pool()
    job_id = str(uuid.uuid4())
    pool = await DBManager.get_pool()

    try:
        await DBManager.create_job(
            job_id,
            "pending",
            user_id=None,
            input_storage_key=f"pending/anon/{job_id}/t.pdf",
            input_filename="t.pdf",
            model_id=Config.DEFAULT_MODEL,
            job_source="pc",
            content_type="application/pdf",
        )
    except Exception as exc:
        err = str(exc).lower()
        if "input_storage_key" in err or "does not exist" in err or "undefinedcolumn" in err:
            pytest.skip(MIG_A015_JOBS)
        raise

    claimed = await DBManager.claim_next_job()
    assert claimed is not None
    assert claimed["job_id"] == job_id
    assert claimed["input_filename"] == "t.pdf"

    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM jobs WHERE job_id = $1::uuid", job_id)
