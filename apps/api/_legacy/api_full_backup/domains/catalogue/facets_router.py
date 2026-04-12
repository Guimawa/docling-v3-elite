"""
Routes HTTP facettes + recherche facettée du catalogue de prix.

Les requêtes SQL sous-jacentes ciblent exclusivement la table ``public.produits``
(voir ``domains.catalogue.facets``).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from domains.catalogue import application as catalogue_app
from domains.shared.dependencies import require_user_id
from domains.shared.request_context import request_id_var

logger = logging.getLogger(__name__)


def register_facets_routes(router: APIRouter) -> None:
    """Enregistre ``GET /catalogue/facets`` et ``GET /catalogue/search`` sur ``router``."""

    @router.get("/catalogue/facets")
    async def catalogue_facets_endpoint(
        q: str | None = Query(None),
        fournisseur: str | None = Query(None),
        famille: str | None = Query(None),
        sous_famille: str | None = Query(None),
        type_produit: str | None = Query(None),
        variante: str | None = Query(None),
        dimension: str | None = Query(None),
        user_id: int = Depends(require_user_id),
    ):
        try:
            return await catalogue_app.get_facets_dynamic(
                user_id=user_id,
                q=q,
                fournisseur=fournisseur,
                famille=famille,
                sous_famille=sous_famille,
                type_produit=type_produit,
                variante=variante,
                dimension=dimension,
            )
        except Exception as err:
            logger.error("Erreur catalogue_facets [%s]", request_id_var.get(""), exc_info=True)
            raise HTTPException(status_code=500, detail="Erreur interne du serveur") from err

    @router.get("/catalogue/search")
    async def catalogue_search_endpoint(
        q: str | None = Query(None),
        fournisseur: str | None = Query(None),
        famille: str | None = Query(None),
        sous_famille: str | None = Query(None),
        type_produit: str | None = Query(None),
        variante: str | None = Query(None),
        dimension: str | None = Query(None),
        limit: int = Query(50, le=200),
        offset: int = Query(0, ge=0),
        user_id: int = Depends(require_user_id),
    ):
        try:
            return await catalogue_app.search_faceted(
                user_id=user_id,
                q=q,
                fournisseur=fournisseur,
                famille=famille,
                sous_famille=sous_famille,
                type_produit=type_produit,
                variante=variante,
                dimension=dimension,
                limit=limit,
                offset=offset,
            )
        except Exception as err:
            logger.error("Erreur catalogue_search [%s]", request_id_var.get(""), exc_info=True)
            raise HTTPException(status_code=500, detail="Erreur interne du serveur") from err
