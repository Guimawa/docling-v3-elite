import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Response

from core.db_manager import DBManager
from domains.shared.dependencies import require_user_id
from domains.shared.request_context import request_id_var
from utils.serializers import serialize_row

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/export", tags=["compliance"])


@router.get("/my-data")
async def export_my_data(user_id: int = Depends(require_user_id)):
    try:
        data = await DBManager.get_user_export_data(user_id)
        data["produits"] = [serialize_row(p) for p in data["produits"]]
        data["factures"] = [serialize_row(f) for f in data["factures"]]
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        return Response(
            content=json_str,
            media_type="application/json; charset=utf-8",
            headers={
                "Content-Disposition": "attachment; filename=docling-export-my-data.json",
            },
        )
    except HTTPException:
        raise
    except Exception as err:
        logger.error("Erreur export my-data [%s]", request_id_var.get(""), exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur lors de l'export") from err
