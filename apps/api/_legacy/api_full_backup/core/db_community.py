"""
CommunityRepository — préférences communautaires et prefs utilisateur.
"""

import logging
from typing import Any

from core.db_base import BaseRepository

logger = logging.getLogger(__name__)


class CommunityRepository(BaseRepository):
    """Préférences communautaires (consent, zone_geo)."""

    @classmethod
    async def get_user_prefs(cls, user_id: int | None) -> tuple[bool, str | None]:
        """Retourne (community_consent, zone_geo) pour un user."""
        if user_id is None:
            return False, None
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT community_consent, zone_geo FROM users WHERE id = $1",
                user_id,
            )
            if not row:
                return False, None
            consent = bool(row.get("community_consent"))
            zone = row.get("zone_geo")
            return consent, str(zone) if zone else None

    @classmethod
    async def update_user_prefs(
        cls, user_id: int, community_consent: bool | None = None, zone_geo: str | None = None
    ) -> None:
        """Met à jour les préférences communauté d'un user (un seul aller-retour)."""
        set_parts: list[str] = []
        params: list[Any] = [user_id]  # $1 = user_id
        idx = 2
        if community_consent is not None:
            set_parts.append(f"community_consent = ${idx}")
            params.append(community_consent)
            idx += 1
        if zone_geo is not None:
            set_parts.append(f"zone_geo = ${idx}")
            params.append(zone_geo[:10] if zone_geo else None)
            idx += 1
        if not set_parts:
            return
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                f"UPDATE users SET {', '.join(set_parts)} WHERE id = $1",
                *params,
            )
