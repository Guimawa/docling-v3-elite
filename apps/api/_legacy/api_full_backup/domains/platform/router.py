import logging
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from core.config import Config
from core.db_manager import DBManager
from domains.scan.extraction import get_gemini_circuit_breaker_state
from domains.shared.dependencies import get_current_user, user_id_from_auth_payload

logger = logging.getLogger(__name__)

router = APIRouter()


class WebVitalsPayload(BaseModel):
    # NOTE: extra="ignore" intentionnel — les RUM libraries (WebVitals) envoient des champs variables
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    value: float
    rating: Literal["good", "needs-improvement", "poor"] | None = None
    id: str | None = Field(default=None, max_length=128)
    path: str | None = Field(default=None, max_length=512)


@router.get("/", tags=["platform"])
async def root():
    return {
        "message": "Docling Agent v3 API is running",
        "docs": "/docs",
        "version": Config.APP_VERSION,
    }


@router.post("/api/vitals", tags=["platform"])
async def receive_vitals(payload: WebVitalsPayload):
    logger.info(
        "Web Vitals: %s=%.2f (%s)",
        payload.name,
        payload.value,
        payload.rating,
    )
    return {"ok": True}


@router.get("/health", tags=["health"])
async def health():
    try:
        pool = await DBManager.get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {
            "status": "ok",
            "db": "connected",
            "gemini_api_circuit": get_gemini_circuit_breaker_state(),
            "version": Config.APP_VERSION,
        }
    except Exception as err:
        raise HTTPException(status_code=503, detail="Database unreachable") from err


@router.get("/api/v1/observability/summary", tags=["platform"])
async def observability_summary(
    hours: Annotated[int, Query(ge=1, le=168)] = 24,
    current_user: dict = Depends(get_current_user),
):
    user_id = user_id_from_auth_payload(current_user)
    data = await DBManager.get_observability_summary(hours=hours, user_id=user_id)
    alerts = []
    if data["failure_ratio"] >= 0.1:
        alerts.append("failure_ratio_high")
    if data["avg_cost_usd"] >= 0.08:
        alerts.append("avg_cost_high")
    return {"summary": data, "alerts": alerts}
