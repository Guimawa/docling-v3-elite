"""Bootstrap / shutdown FastAPI : config, pool DB, invité FREE_ACCESS, watchdog."""

import asyncio
import logging
import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI

from core.config import Config
from core.db_manager import DBManager
from domains.shared import state as guest_state
from services.auth_service import hash_password
from services.sync_agent_service import SyncAgentService

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Config.validate()
    await DBManager.get_pool()

    if Config.FREE_ACCESS_MODE:
        pool = await DBManager.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM users WHERE email = $1", guest_state.GUEST_USER_EMAIL
            )
            # Mot de passe inconnu (jeté après hachage) — pas de secret fixe réutilisable.
            guest_hash = hash_password(secrets.token_urlsafe(64))
            if not row:
                row = await conn.fetchrow(
                    """INSERT INTO users (email, password_hash, display_name, role)
                       VALUES ($1, $2, $3, $4) RETURNING id""",
                    guest_state.GUEST_USER_EMAIL,
                    guest_hash,
                    "Invité (accès libre)",
                    "user",
                )
            else:
                await conn.execute(
                    "UPDATE users SET password_hash = $1 WHERE id = $2",
                    guest_hash,
                    row["id"],
                )
            guest_state.set_guest_user_id(row["id"])
        logger.info(
            "Accès free provisoire activé (guest user_id=%s)", guest_state.get_guest_user_id()
        )

    loop = asyncio.get_running_loop()
    SyncAgentService.start(Config.DEFAULT_MODEL, loop)
    logger.info("🚀 Docling Agent v3 démarré")
    yield
    SyncAgentService.stop()
    guest_state.set_guest_user_id(None)
    await DBManager.close_pool()
    logger.info("🛑 Docling Agent v3 arrêté")
