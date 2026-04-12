import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from domains.catalogue import application as catalogue_app
from domains.catalogue.attributes_endpoint import register_attributes_routes
from domains.catalogue.facets_router import register_facets_routes
from domains.shared.dependencies import (
    get_admin_user,
    require_active_subscription,
    require_user_id,
    user_id_from_auth_payload,
)
from domains.shared.request_context import request_id_var
from schemas.invoice import BatchSaveRequest, CatalogueProductUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["prices"])

register_facets_routes(router)
register_attributes_routes(router)


class CheckDuplicateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    designation_fr: str
    fournisseur: str


@router.get("/catalogue")
async def get_catalogue(
    famille: str | None = None,
    fournisseur: str | None = None,
    search: str | None = None,
    limit: int = 50,
    cursor: str | None = None,
    user_id: int = Depends(require_user_id),
):
    try:
        return await catalogue_app.list_products(
            user_id=user_id,
            famille=famille,
            fournisseur=fournisseur,
            search=search,
            limit=min(limit, 200),
            cursor=cursor,
        )
    except Exception as err:
        logger.error("Erreur get_catalogue [%s]", request_id_var.get(""), exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur") from err


@router.put("/catalogue/{product_id}")
async def update_product(
    product_id: int,
    payload: CatalogueProductUpdate,
    user_id: int = Depends(require_active_subscription),
):
    try:
        updates = payload.model_dump(exclude_unset=True)
        updated = await catalogue_app.update_product(product_id, updates, user_id=user_id)
        if not updated:
            raise HTTPException(status_code=404, detail="Produit introuvable")
        return updated
    except HTTPException:
        raise
    except Exception as err:
        logger.error("Erreur update_product [%s]", request_id_var.get(""), exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur") from err


@router.post("/catalogue/batch")
async def save_batch(
    payload: BatchSaveRequest, user_id: int = Depends(require_active_subscription)
):
    try:
        return await catalogue_app.batch_save(
            [p.model_dump() for p in payload.produits],
            payload.source,
            user_id=user_id,
        )
    except Exception as err:
        logger.error("Erreur batch save [%s]", request_id_var.get(""), exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur") from err


@router.get("/catalogue/fournisseurs")
async def get_fournisseurs(user_id: int = Depends(require_user_id)):
    try:
        return await catalogue_app.get_fournisseurs(user_id=user_id)
    except Exception as err:
        logger.error("Erreur get_fournisseurs [%s]", request_id_var.get(""), exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur") from err


@router.get("/stats")
async def get_stats(user_id: int = Depends(require_user_id)):
    try:
        return await catalogue_app.get_stats(user_id=user_id)
    except Exception as err:
        logger.error("Erreur get_stats [%s]", request_id_var.get(""), exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur") from err


@router.delete("/catalogue/reset")
async def reset_catalogue(confirm: str = "", _admin: dict = Depends(get_admin_user)):
    if confirm != "SUPPRIMER_TOUT":
        raise HTTPException(
            status_code=400,
            detail="Passer ?confirm=SUPPRIMER_TOUT pour confirmer",
        )
    user_id = user_id_from_auth_payload(_admin)
    return await catalogue_app.reset_catalogue(user_id=user_id)


@router.get("/catalogue/price-history/{product_id}")
async def get_price_history(product_id: int, user_id: int = Depends(require_user_id)):
    try:
        return await catalogue_app.get_price_history(product_id, user_id=user_id)
    except Exception as err:
        logger.error("Erreur get_price_history [%s]", request_id_var.get(""), exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur") from err


@router.get("/catalogue/compare")
async def compare_prices(
    search: str = "",
    with_history: bool = True,
    user_id: int = Depends(require_user_id),
):
    try:
        return await catalogue_app.compare_prices(search, with_history, user_id=user_id)
    except catalogue_app.CatalogueValidationError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as err:
        logger.error("Erreur compare_prices [%s]", request_id_var.get(""), exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur") from err


@router.post("/catalogue/check-duplicate")
async def check_product_duplicate(
    body: CheckDuplicateRequest,
    user_id: int = Depends(require_active_subscription),
):
    try:
        return await catalogue_app.check_product_duplicate(
            body.designation_fr,
            body.fournisseur,
            user_id=user_id,
        )
    except Exception as err:
        logger.error("Erreur check_product_duplicate [%s]", request_id_var.get(""), exc_info=True)
        raise HTTPException(status_code=500, detail="Erreur interne du serveur") from err

