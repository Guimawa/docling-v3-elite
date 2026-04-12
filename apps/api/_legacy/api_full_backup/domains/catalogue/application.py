"""Cas d'usage catalogue : orchestration DBManager + sérialisation (sans HTTP)."""

from __future__ import annotations

import json
from typing import Any

from core.db_manager import DBManager
from domains.catalogue import facets as catalogue_facets
from utils.serializers import serialize_row


class CatalogueValidationError(ValueError):
    """Erreur métier / entrée ; le routeur la mappe en réponse 4xx."""


async def list_products(
    *,
    user_id: int | None,
    famille: str | None = None,
    fournisseur: str | None = None,
    search: str | None = None,
    limit: int = 50,
    cursor: str | None = None,
) -> dict[str, Any]:
    result = await DBManager.get_catalogue(
        famille=famille,
        fournisseur=fournisseur,
        search=search,
        limit=limit,
        cursor=cursor,
        user_id=user_id,
    )
    result["products"] = [serialize_row(p) for p in result["products"]]
    return result


async def update_product(
    product_id: int,
    updates: dict[str, Any],
    *,
    user_id: int | None,
) -> dict[str, Any] | None:
    updated = await DBManager.update_product(product_id, updates, user_id=user_id)
    if not updated:
        return None
    return serialize_row(updated)


async def batch_save(
    produits: list[dict[str, Any]],
    source: str,
    *,
    user_id: int | None,
) -> dict[str, Any]:
    nb_saved, historique_failures = await DBManager.upsert_products_batch(
        produits,
        source=source,
        user_id=user_id,
    )
    resp: dict[str, Any] = {"saved": nb_saved, "total": len(produits)}
    if historique_failures > 0:
        resp["partial_success"] = True
        resp["historique_errors"] = historique_failures
    return resp


async def get_fournisseurs(*, user_id: int | None) -> dict[str, Any]:
    fournisseurs = await DBManager.get_fournisseurs(user_id=user_id)
    return {"fournisseurs": fournisseurs}


async def get_stats(*, user_id: int | None) -> dict[str, Any]:
    return await DBManager.get_stats(user_id=user_id)


async def reset_catalogue(*, user_id: int | None) -> dict[str, Any]:
    await DBManager.truncate_products(user_id=user_id)
    return {"message": "Catalogue vidé", "produits_restants": 0}


async def get_price_history(
    product_id: int,
    *,
    user_id: int | None,
) -> dict[str, Any]:
    rows = await DBManager.get_price_history_by_product_id(product_id, user_id=user_id)
    history = [serialize_row(dict(r)) for r in rows]
    return {"history": history, "product_id": product_id}


async def get_facets_dynamic(
    *,
    user_id: int,
    q: str | None = None,
    fournisseur: str | None = None,
    famille: str | None = None,
    sous_famille: str | None = None,
    type_produit: str | None = None,
    variante: str | None = None,
    dimension: str | None = None,
) -> dict[str, Any]:
    return await catalogue_facets.get_catalogue_facets(
        user_id=user_id,
        q=q,
        fournisseur=fournisseur,
        famille=famille,
        sous_famille=sous_famille,
        type_produit=type_produit,
        variante=variante,
        dimension=dimension,
    )


async def search_faceted(
    *,
    user_id: int,
    q: str | None = None,
    fournisseur: str | None = None,
    famille: str | None = None,
    sous_famille: str | None = None,
    type_produit: str | None = None,
    variante: str | None = None,
    dimension: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    return await catalogue_facets.search_catalogue_faceted(
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


async def merge_product_attributes(
    product_id: int,
    attributes: dict[str, Any],
    *,
    user_id: int,
) -> dict[str, Any] | None:
    clean = {k: v for k, v in attributes.items() if v and v != "__skip__"}
    if not clean:
        return {"ok": True, "saved": {}}
    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE produits
            SET attributes = COALESCE(attributes, '{}'::jsonb) || $1::jsonb,
                updated_at = NOW()
            WHERE id = $2 AND user_id = $3
            RETURNING id
            """,
            json.dumps(clean),
            product_id,
            user_id,
        )
    if not row:
        return None
    return {"ok": True, "saved": clean}


async def compare_prices(
    search: str,
    with_history: bool,
    *,
    user_id: int | None,
) -> dict[str, Any]:
    if not search or len(search.strip()) < 2:
        raise CatalogueValidationError("Recherche trop courte (min 2 car.)")
    term = search.strip()
    if with_history:
        rows = await DBManager.compare_prices_with_history(term, user_id=user_id)
    else:
        rows = await DBManager.compare_prices(term, user_id=user_id)
    serialized: list[dict[str, Any]] = []
    for r in rows:
        d = dict(r)
        sr = serialize_row(d)
        sr["price_history"] = [serialize_row(h) for h in d.get("price_history", [])]
        serialized.append(sr)
    return {"results": serialized, "search": term, "count": len(rows)}


async def check_product_duplicate(
    designation_fr: str,
    fournisseur: str,
    *,
    user_id: int,
) -> dict[str, Any]:
    """Vérifie la duplication d'un produit par similarité textuelle."""
    from core.db_product_utils import _escape_like
    from services.dedup_service import check_duplicate

    first_word = (fournisseur.split()[0] if fournisseur.strip() else fournisseur).strip()
    if not first_word:
        return {"is_duplicate": False, "match": None, "scores": {}}

    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, designation_fr, fournisseur, prix_remise_ht, unite
            FROM produits
            WHERE user_id = $1
              AND fournisseur ILIKE $2
            LIMIT 500
            """,
            user_id,
            f"%{_escape_like(first_word)}%",
        )
    produits_rows = [dict(r) for r in rows]
    is_dup, match, scores = check_duplicate(designation_fr, fournisseur, produits_rows)
    return {"is_duplicate": is_dup, "match": match, "scores": scores}

