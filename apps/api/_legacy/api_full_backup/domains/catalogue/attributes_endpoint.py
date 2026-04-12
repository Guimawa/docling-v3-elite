"""
Endpoints extraction / persistance des attributs JSONB (table ``public.produits``).

- GET  ``/catalogue/attributes`` : suggestion d'attributs (``attribute_extractor``).
- POST ``/catalogue/{product_id}/attributes`` : fusion JSONB côté DB.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict

from domains.catalogue import application as catalogue_app
from domains.shared.dependencies import require_user_id
from domains.shared.request_context import request_id_var
from services.attribute_extractor import extract_attributes

logger = logging.getLogger(__name__)


class SaveAttributesBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    attributes: dict[str, Any]


def register_attributes_routes(router: APIRouter) -> None:
    """Enregistre les routes attributs sur ``router``."""

    @router.get("/catalogue/attributes")
    async def catalogue_attributes_extract(
        designation: str = Query(..., min_length=1),
        famille: str = Query(""),
        fournisseur: str = Query(""),
        user_id: int = Depends(require_user_id),
    ):
        try:
            logger.debug("catalogue_attributes_extract user_id=%s", user_id)
            return await extract_attributes(designation, famille, fournisseur)
        except Exception as err:
            logger.error("Erreur extract_attributes [%s]", request_id_var.get(""), exc_info=True)
            raise HTTPException(status_code=500, detail="Erreur interne du serveur") from err

    @router.post("/catalogue/{product_id}/attributes")
    async def catalogue_attributes_save(
        product_id: int,
        body: SaveAttributesBody,
        user_id: int = Depends(require_user_id),
    ):
        try:
            out = await catalogue_app.merge_product_attributes(
                product_id, body.attributes, user_id=user_id
            )
            if not out:
                raise HTTPException(status_code=404, detail="Produit introuvable")
            return out
        except HTTPException:
            raise
        except Exception as err:
            logger.error("Erreur save_attributes [%s]", request_id_var.get(""), exc_info=True)
            raise HTTPException(status_code=500, detail="Erreur interne du serveur") from err
