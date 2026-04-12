from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field

from core.db_manager import DBManager
from domains.shared.dependencies import get_current_user, require_user_id
from services.community_service import CommunityService

router = APIRouter(prefix="/api/v1/community", tags=["community"])


class CommunityPreferencesPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    community_consent: bool | None = None
    zone_geo: str | None = Field(
        default=None,
        min_length=2,
        max_length=10,
        pattern=r"^[A-Za-z0-9_-]+$",
    )


@router.patch("/preferences")
async def update_community_preferences(
    payload: CommunityPreferencesPatch,
    user_id: int = Depends(require_user_id),
):
    await DBManager.update_user_community_prefs(
        user_id,
        payload.community_consent,
        payload.zone_geo,
    )
    return {"ok": True}


@router.get("/stats")
async def get_community_stats(
    zone: Annotated[
        str | None, Query(min_length=2, max_length=10, pattern=r"^[A-Za-z0-9_-]+$")
    ] = None,
    pays: Annotated[str | None, Query(min_length=2, max_length=2, pattern=r"^[A-Za-z]{2}$")] = None,
    fournisseur: Annotated[str | None, Query(min_length=1, max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    _user: dict = Depends(get_current_user),
):
    stats = await CommunityService.get_stats(
        zone=zone, pays=pays, fournisseur=fournisseur, limit=limit
    )
    return {"stats": stats}


@router.get("/base")
async def get_community_geo_base(
    geohash_prefix: Annotated[
        str | None, Query(min_length=1, max_length=8, pattern=r"^[0-9bcdefghjkmnpqrstuvwxyz]+$")
    ] = None,
    famille: Annotated[str | None, Query(min_length=2, max_length=60)] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    _user: dict = Depends(get_current_user),
):
    rows = await CommunityService.get_geo_price_map(
        geohash_prefix=geohash_prefix,
        famille=famille,
        limit=limit,
    )
    return {"rows": rows}
