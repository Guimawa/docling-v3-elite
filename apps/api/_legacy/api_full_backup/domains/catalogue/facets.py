"""Facettes dynamiques et recherche catalogue (JSONB attributes + pg_trgm).

Couche SQL : uniquement ``public.produits``. Couche HTTP : ``facets_router.register_facets_routes``.
"""

from __future__ import annotations

from typing import Any

from core.db_manager import DBManager
from core.db_product_utils import _escape_like
from utils.serializers import serialize_row


def _facet_where(
    user_id: int,
    q: str | None,
    fournisseur: str | None,
    famille: str | None,
    sous_famille: str | None,
    type_produit: str | None,
    variante: str | None,
    dimension: str | None,
) -> tuple[str, list[Any]]:
    parts = ["user_id = $1"]
    params: list[Any] = [user_id]
    i = 2
    if q and len(q.strip()) >= 2:
        qs = q.strip()
        pat = f"%{_escape_like(qs)}%"
        parts.append(f"(designation_fr ILIKE ${i} OR similarity(designation_fr, ${i + 1}) > 0.15)")
        params.extend([pat, qs])
        i += 2
    for col, val in [
        ("fournisseur", fournisseur),
        ("famille", famille),
        ("attributes->>'sous_famille'", sous_famille),
        ("attributes->>'type_produit'", type_produit),
        ("attributes->>'variante'", variante),
        ("attributes->>'dimension'", dimension),
    ]:
        if val:
            parts.append(f"{col} = ${i}")
            params.append(val)
            i += 1
    return " AND ".join(parts), params


async def get_catalogue_facets(
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
    where, params = _facet_where(
        user_id,
        q,
        fournisseur,
        famille,
        sous_famille,
        type_produit,
        variante,
        dimension,
    )
    # SECURITY: column names in _facet_where() are hardcoded constants, never from user input.
    #           Values are parameterized ($1, $2...) — safe against SQL injection.
    sql = f"""
    SELECT
        array_agg(DISTINCT fournisseur ORDER BY fournisseur)
            FILTER (WHERE fournisseur IS NOT NULL) AS fournisseurs,
        array_agg(DISTINCT famille ORDER BY famille)
            FILTER (WHERE famille IS NOT NULL) AS familles,
        array_agg(DISTINCT attributes->>'sous_famille' ORDER BY attributes->>'sous_famille')
            FILTER (WHERE attributes->>'sous_famille' IS NOT NULL) AS sous_familles,
        array_agg(DISTINCT attributes->>'type_produit' ORDER BY attributes->>'type_produit')
            FILTER (WHERE attributes->>'type_produit' IS NOT NULL) AS types_produit,
        array_agg(DISTINCT attributes->>'variante' ORDER BY attributes->>'variante')
            FILTER (WHERE attributes->>'variante' IS NOT NULL) AS variantes,
        array_agg(DISTINCT attributes->>'dimension' ORDER BY attributes->>'dimension')
            FILTER (WHERE attributes->>'dimension' IS NOT NULL) AS dimensions,
        COUNT(*)::bigint AS total
    FROM produits
    WHERE {where}
    """
    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(sql, *params)
    if row is None:
        return {
            "fournisseurs": [], "familles": [], "sous_familles": [],
            "types_produit": [], "variantes": [], "dimensions": [], "total": 0,
        }
    return {
        "fournisseurs": list(row["fournisseurs"] or []),
        "familles": list(row["familles"] or []),
        "sous_familles": list(row["sous_familles"] or []),
        "types_produit": list(row["types_produit"] or []),
        "variantes": list(row["variantes"] or []),
        "dimensions": list(row["dimensions"] or []),
        "total": int(row["total"] or 0),
    }


async def search_catalogue_faceted(
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
    where, params = _facet_where(
        user_id,
        q,
        fournisseur,
        famille,
        sous_famille,
        type_produit,
        variante,
        dimension,
    )
    order_sql = "ORDER BY prix_remise_ht ASC NULLS LAST"
    rows_params: list[Any] = list(params)
    if q and len(q.strip()) >= 2:
        qs = q.strip()
        sim_idx = len(params) + 1
        order_sql = (
            f"ORDER BY similarity(designation_fr, ${sim_idx}) DESC, prix_remise_ht ASC NULLS LAST"
        )
        rows_params.append(qs)

    n = len(rows_params)
    # SECURITY: column names in _facet_where() are hardcoded constants, never from user input.
    sql = f"""
        SELECT
            id, designation_fr, designation_raw, famille, fournisseur,
            unite, prix_brut_ht, remise_pct, prix_remise_ht, prix_ttc_iva21,
            prix_ttc_remise, prix_ttc_non_remise, prix_conseille_vente,
            numero_facture, date_facture, attributes,
            photo_url, description_ia
        FROM produits
        WHERE {where}
        {order_sql}
        LIMIT ${n + 1} OFFSET ${n + 2}
    """
    exec_params = [*rows_params, limit, offset]
    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *exec_params)
        total_row = await conn.fetchrow(
            f"SELECT COUNT(*)::bigint AS c FROM produits WHERE {where}", *params
        )
    if total_row is None:
        total = 0
    else:
        total = int(total_row["c"])
    products = [serialize_row(dict(r)) for r in rows]
    return {
        "products": products,
        "total": total,
        "offset": offset,
        "limit": limit,
    }
