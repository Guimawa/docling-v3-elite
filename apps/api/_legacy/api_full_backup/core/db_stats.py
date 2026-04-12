"""
StatsRepository — dashboard stats (avec cache TTL), observabilité.
"""

import logging
import time
from typing import Any

from core.db_base import BaseRepository

logger = logging.getLogger(__name__)

# Cache court in-process (TTL par worker) — évite de marteler la DB sur les dashboards.
_STATS_TTL_SEC = 60.0
_stats_cache: dict[tuple[Any, ...], tuple[float, dict[str, Any]]] = {}


class StatsRepository(BaseRepository):
    """Dashboard stats et observabilité."""

    @classmethod
    async def get_stats(cls, user_id: int | None = None) -> dict:
        cache_key = ("stats", user_id)
        now = time.monotonic()
        hit = _stats_cache.get(cache_key)
        if hit and hit[0] > now:
            return hit[1]

        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            where = "WHERE user_id = $1" if user_id is not None else ""
            params = (user_id,) if user_id is not None else ()
            stats = await conn.fetchrow(
                "SELECT "
                "COUNT(*) AS total_produits, "
                "COUNT(DISTINCT fournisseur) AS total_fournisseurs, "
                "COUNT(DISTINCT famille) AS total_familles, "
                "COUNT(*) FILTER (WHERE confidence = 'low') AS low_confidence, "
                "COUNT(*) FILTER (WHERE source = 'mobile') AS depuis_mobile, "
                "COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '7 days') AS cette_semaine "
                "FROM produits " + where,
                *params,
            )

            fam_where = " AND user_id = $1" if user_id is not None else ""
            fam_params = (user_id,) if user_id is not None else ()
            familles = await conn.fetch(
                "SELECT famille, COUNT(*) AS nb "
                "FROM produits "
                "WHERE famille IS NOT NULL" + fam_where + " "
                "GROUP BY famille "
                "ORDER BY nb DESC",
                *fam_params,
            )

            out = {**dict(stats), "familles": [dict(f) for f in familles]}
        _stats_cache[cache_key] = (now + _STATS_TTL_SEC, out)
        return out

    @classmethod
    async def get_observability_summary(cls, hours: int = 24, user_id: int | None = None) -> dict:
        pool = await cls.get_pool()
        horizon = max(1, min(hours, 24 * 14))
        async with pool.acquire() as conn:
            if user_id is not None:
                row = await conn.fetchrow(
                    """SELECT
                        COUNT(*)::int AS total_jobs,
                        COUNT(*) FILTER (WHERE statut = 'erreur')::int AS failed_jobs,
                        COALESCE(AVG(cout_api_usd), 0)::float AS avg_cost_usd,
                        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cout_api_usd), 0)::float AS p50_cost_usd
                    FROM factures
                    WHERE created_at >= NOW() - ($1::text || ' hours')::interval
                      AND user_id = $2""",
                    str(horizon), user_id,
                )
            else:
                row = await conn.fetchrow(
                    """SELECT
                        COUNT(*)::int AS total_jobs,
                        COUNT(*) FILTER (WHERE statut = 'erreur')::int AS failed_jobs,
                        COALESCE(AVG(cout_api_usd), 0)::float AS avg_cost_usd,
                        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cout_api_usd), 0)::float AS p50_cost_usd
                    FROM factures
                    WHERE created_at >= NOW() - ($1::text || ' hours')::interval""",
                    str(horizon),
                )
        total = int(row["total_jobs"] or 0)
        failed = int(row["failed_jobs"] or 0)
        failure_ratio = (failed / total) if total > 0 else 0.0
        return {
            "window_hours": horizon,
            "total_jobs": total,
            "failed_jobs": failed,
            "failure_ratio": round(failure_ratio, 4),
            "avg_cost_usd": float(row["avg_cost_usd"] or 0),
            "p50_cost_usd": float(row["p50_cost_usd"] or 0),
        }
