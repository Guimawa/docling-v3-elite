"""
JobRepository — create, claim, update, get (file d'attente scan queue).
"""

import json
import logging

from core.config import Config
from core.db_base import BaseRepository

logger = logging.getLogger(__name__)


class JobRepository(BaseRepository):
    """Opérations sur les jobs de scan (queue + inline)."""

    @classmethod
    async def create(
        cls,
        job_id: str,
        status: str = "processing",
        user_id: int | None = None,
        *,
        input_storage_key: str | None = None,
        input_filename: str | None = None,
        model_id: str | None = None,
        job_source: str | None = None,
        content_type: str | None = None,
        ocr_engine: str | None = "standard",
        preprocess_mode: str | None = "basic",
    ) -> None:
        """Crée un job en base. Colonnes optionnelles pour mode queue (pending)."""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO jobs (
                    job_id, status, user_id,
                    input_storage_key, input_filename, model_id, job_source, content_type,
                    ocr_engine, preprocess_mode
                ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)""",
                job_id, status, user_id,
                input_storage_key, input_filename, model_id, job_source, content_type,
                ocr_engine, preprocess_mode,
            )

    @classmethod
    async def claim_next(cls) -> dict | None:
        """Réserve le plus ancien job pending (SKIP LOCKED) et le passe en processing."""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """WITH next_job AS (
                    SELECT job_id FROM jobs
                    WHERE status = 'pending'
                    ORDER BY created_at ASC
                    FOR UPDATE SKIP LOCKED LIMIT 1
                )
                UPDATE jobs j
                SET status = 'processing',
                    claimed_at = NOW(),
                    attempts = COALESCE(j.attempts, 0) + 1,
                    updated_at = NOW()
                FROM next_job
                WHERE j.job_id = next_job.job_id
                RETURNING
                    j.job_id::text AS job_id, j.user_id,
                    j.input_storage_key, j.input_filename,
                    j.model_id, j.job_source, j.content_type, 
                    j.ocr_engine, j.preprocess_mode,
                    j.attempts"""
            )
            if not row:
                return None
            return {
                "job_id": row["job_id"],
                "user_id": row["user_id"],
                "input_storage_key": row["input_storage_key"],
                "input_filename": (row["input_filename"] or "facture").strip() or "facture",
                "model_id": row["model_id"] or Config.DEFAULT_MODEL,
                "job_source": row["job_source"] or "pc",
                "content_type": row["content_type"],
                "ocr_engine": row["ocr_engine"] or "standard",
                "preprocess_mode": row["preprocess_mode"] or "basic",
                "attempts": int(row["attempts"] or 0),
            }

    @classmethod
    async def update(
        cls,
        job_id: str,
        status: str,
        result: dict | None = None,
        error: str | None = None,
    ) -> None:
        """Met à jour le statut et le résultat d'un job + NOTIFY (SSE/PubSub)."""
        pool = await cls.get_pool()
        result_json = json.dumps(result) if result is not None else None
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """UPDATE jobs
                    SET status = $2, result = $3::jsonb, error = $4, updated_at = NOW()
                    WHERE job_id = $1::uuid""",
                    job_id, status, result_json, error,
                )
                # Notification Pub/Sub pour les SSE clients (FastAPI LISTEN)
                await conn.execute("SELECT pg_notify('job_status_changed', $1)", job_id)

    # ── Déduplication Distribuée (PostgreSQL Cache) ──────────────────────────

    @classmethod
    async def dedup_get(cls, dedup_key: str, ttl_minutes: int = 10) -> str | None:
        """Récupère un job_id existant si l'empreinte est valide (TTL)."""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """SELECT job_id::text FROM app_dedup_cache
                WHERE dedup_key = $1
                AND created_at > NOW() - INTERVAL '$2 minute'""",
                dedup_key, ttl_minutes,
            )
            return row["job_id"] if row else None

    @classmethod
    async def dedup_set(cls, dedup_key: str, job_id: str, user_id: int | None = None) -> None:
        """Enregistre une nouvelle empreinte (idempotence)."""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO app_dedup_cache (dedup_key, job_id, user_id)
                VALUES ($1, $2::uuid, $3)
                ON CONFLICT (dedup_key) DO UPDATE SET
                    job_id = EXCLUDED.job_id,
                    user_id = EXCLUDED.user_id,
                    created_at = NOW()""",
                dedup_key, job_id, user_id,
            )

    @classmethod
    async def dedup_cleanup(cls, older_than_hours: int = 24) -> int:
        """Nettoyage automatique des anciennes empreintes."""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM app_dedup_cache WHERE created_at < NOW() - INTERVAL '$1 hour'",
                older_than_hours,
            )
            count = int(result.split()[-1]) if result else 0
            if count > 0:
                logger.debug("Nettoyage dedup : %d entrées supprimées", count)
            return count

    @classmethod
    async def get(cls, job_id: str, user_id: int | None = None) -> dict | None:
        """Récupère un job par son id. Filtre par user_id pour isolation multi-tenant."""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """SELECT status, result, error, created_at, updated_at
                FROM jobs
                WHERE job_id = $1::uuid AND (user_id IS NOT DISTINCT FROM $2)""",
                job_id, user_id,
            )
            if not row:
                return None
            result = row["result"]
            if isinstance(result, str):
                result = json.loads(result) if result else None
            return {"status": row["status"], "result": result, "error": row["error"]}
