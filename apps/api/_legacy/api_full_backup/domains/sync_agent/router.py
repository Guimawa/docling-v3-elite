from fastapi import APIRouter, Depends, Request
import logging

from domains.shared.dependencies import get_service_or_user
from services.sync_agent_service import SyncAgentService

router = APIRouter(prefix="/api/v1/sync-agent", tags=["sync_agent"])

logger = logging.getLogger(__name__)

@router.get("/status")
async def get_sync_agent_status():
    """Retourne l'état actuel du Sync Agent."""
    return SyncAgentService.get_status()
