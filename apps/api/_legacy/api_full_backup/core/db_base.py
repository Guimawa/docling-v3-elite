"""
BaseRepository — pool partagé asyncpg + acquire helper.

Toutes les classes repository héritent de cette base.
Le pool est créé une seule fois (singleton via class variable + Lock).
"""

import asyncio
import logging

import asyncpg

from core.config import Config

logger = logging.getLogger(__name__)


class BaseRepository:
    """Base pour tous les repositories — pool singleton + acquire helper."""

    _pool: asyncpg.Pool | None = None
    _pool_lock: asyncio.Lock = asyncio.Lock()

    @classmethod
    async def get_pool(cls) -> asyncpg.Pool:
        if BaseRepository._pool is not None:
            return BaseRepository._pool
        async with BaseRepository._pool_lock:
            if BaseRepository._pool is not None:
                return BaseRepository._pool
            if not Config.DATABASE_URL:
                raise RuntimeError("DATABASE_URL non définie dans .env")
            BaseRepository._pool = await asyncpg.create_pool(
                Config.DATABASE_URL,
                min_size=2,
                max_size=10,
                command_timeout=Config.DB_COMMAND_TIMEOUT,
                ssl="require",
            )
            logger.info("Pool asyncpg connecté à Neon")
        return BaseRepository._pool

    @classmethod
    async def close_pool(cls) -> None:
        if BaseRepository._pool:
            await BaseRepository._pool.close()
            BaseRepository._pool = None

    @classmethod
    async def run_migrations(cls) -> None:
        """Exécute les migrations Alembic. Les schémas sont versionnés dans migrations/versions/."""
        import asyncio as _asyncio
        import os

        def _run_alembic_upgrade() -> None:
            from alembic import command
            from alembic.config import Config as AlembicConfig

            api_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            config = AlembicConfig(os.path.join(api_root, "alembic.ini"))
            command.upgrade(config, "head")

        await _asyncio.to_thread(_run_alembic_upgrade)
        logger.info("Migrations Alembic OK")
