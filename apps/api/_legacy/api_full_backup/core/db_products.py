"""
ProductRepository — upsert, catalogue, patch, truncate, fournisseurs.

Toute la logique produit (la plus volumineuse) isolée dans un module focalisé.
"""

import logging
from datetime import date
from typing import Any

from core.db_base import BaseRepository
from core.db_product_utils import (
    _escape_like,
    _parse_date,
    _safe_float,
)
from core.db_product_utils import (
    _upsert_params as _build_upsert_params,
)
from core.db_upsert_utils import (
    _column_arrays_for_upsert,
    _dedupe_products_for_batch_upsert,
    _produit_conflict_key,
)

logger = logging.getLogger(__name__)

# Mise à jour partielle catalogue (colonnes SQL = noms champs)
_PATCHABLE_PRODUCT_COLUMNS: frozenset[str] = frozenset(
    {
        "designation_fr",
        "designation_raw",
        "famille",
        "fournisseur",
        "unite",
        "prix_brut_ht",
        "remise_pct",
        "prix_remise_ht",
        "prix_ttc_remise",
        "prix_ttc_non_remise",
        "prix_ttc_iva21",
        "prix_conseille_vente",
    }
)
_NUMERIC_PRODUCT_COLUMNS: frozenset[str] = frozenset(
    {
        "prix_brut_ht",
        "remise_pct",
        "prix_remise_ht",
        "prix_ttc_remise",
        "prix_ttc_non_remise",
        "prix_ttc_iva21",
        "prix_conseille_vente",
    }
)

# ── Source de vérité unique pour la clause ON CONFLICT du produit ──────────────
_ON_CONFLICT_SET_SQL = """\
    ON CONFLICT (product_key, user_id)
    DO UPDATE SET
        designation_fr = CASE
            WHEN COALESCE(EXCLUDED.date_facture, DATE '1900-01-01') >= COALESCE(produits.date_facture, DATE '1900-01-01')
            THEN EXCLUDED.designation_fr ELSE produits.designation_fr END,
        famille        = CASE
            WHEN COALESCE(EXCLUDED.date_facture, DATE '1900-01-01') >= COALESCE(produits.date_facture, DATE '1900-01-01')
            THEN EXCLUDED.famille ELSE produits.famille END,
        prix_brut_ht   = CASE
            WHEN COALESCE(EXCLUDED.date_facture, DATE '1900-01-01') >= COALESCE(produits.date_facture, DATE '1900-01-01')
            THEN EXCLUDED.prix_brut_ht ELSE produits.prix_brut_ht END,
        remise_pct     = CASE
            WHEN COALESCE(EXCLUDED.date_facture, DATE '1900-01-01') >= COALESCE(produits.date_facture, DATE '1900-01-01')
            THEN EXCLUDED.remise_pct ELSE produits.remise_pct END,
        prix_remise_ht = CASE
            WHEN COALESCE(EXCLUDED.date_facture, DATE '1900-01-01') >= COALESCE(produits.date_facture, DATE '1900-01-01')
            THEN EXCLUDED.prix_remise_ht ELSE produits.prix_remise_ht END,
        prix_ttc_iva21 = CASE
            WHEN COALESCE(EXCLUDED.date_facture, DATE '1900-01-01') >= COALESCE(produits.date_facture, DATE '1900-01-01')
            THEN EXCLUDED.prix_ttc_iva21 ELSE produits.prix_ttc_iva21 END,
        prix_ttc_remise = CASE
            WHEN COALESCE(EXCLUDED.date_facture, DATE '1900-01-01') >= COALESCE(produits.date_facture, DATE '1900-01-01')
            THEN EXCLUDED.prix_ttc_remise ELSE produits.prix_ttc_remise END,
        prix_ttc_non_remise = CASE
            WHEN COALESCE(EXCLUDED.date_facture, DATE '1900-01-01') >= COALESCE(produits.date_facture, DATE '1900-01-01')
            THEN EXCLUDED.prix_ttc_non_remise ELSE produits.prix_ttc_non_remise END,
        prix_conseille_vente = CASE
            WHEN EXCLUDED.prix_conseille_vente IS NOT NULL THEN EXCLUDED.prix_conseille_vente
            ELSE produits.prix_conseille_vente END,
        numero_facture = CASE
            WHEN COALESCE(EXCLUDED.date_facture, DATE '1900-01-01') >= COALESCE(produits.date_facture, DATE '1900-01-01')
            THEN EXCLUDED.numero_facture ELSE produits.numero_facture END,
        date_facture   = NULLIF(
            GREATEST(COALESCE(produits.date_facture, DATE '1900-01-01'), COALESCE(EXCLUDED.date_facture, DATE '1900-01-01')),
            DATE '1900-01-01'
        ),
        confidence     = CASE
            WHEN COALESCE(EXCLUDED.date_facture, DATE '1900-01-01') >= COALESCE(produits.date_facture, DATE '1900-01-01')
            THEN EXCLUDED.confidence ELSE produits.confidence END,
        source         = CASE
            WHEN COALESCE(EXCLUDED.date_facture, DATE '1900-01-01') >= COALESCE(produits.date_facture, DATE '1900-01-01')
            THEN EXCLUDED.source ELSE produits.source END,
        fournisseur_city = COALESCE(EXCLUDED.fournisseur_city, produits.fournisseur_city),
        fournisseur_country = COALESCE(EXCLUDED.fournisseur_country, produits.fournisseur_country),
        fournisseur_lat = COALESCE(EXCLUDED.fournisseur_lat, produits.fournisseur_lat),
        fournisseur_lng = COALESCE(EXCLUDED.fournisseur_lng, produits.fournisseur_lng),
        fournisseur_geohash = COALESCE(EXCLUDED.fournisseur_geohash, produits.fournisseur_geohash),
        geo_confidence = COALESCE(EXCLUDED.geo_confidence, produits.geo_confidence),
        attributes = COALESCE(produits.attributes, '{}'::jsonb) || COALESCE(EXCLUDED.attributes, '{}'::jsonb),
        updated_at     = NOW()
"""

_INSERT_COLS = """\
    INSERT INTO produits (
        user_id, product_key, fournisseur, designation_raw, designation_fr,
        famille, unite,
        prix_brut_ht, remise_pct, prix_remise_ht, prix_ttc_iva21,
        prix_ttc_remise, prix_ttc_non_remise, prix_conseille_vente,
        numero_facture, date_facture, confidence, source,
        fournisseur_city, fournisseur_country, fournisseur_lat, fournisseur_lng,
        fournisseur_geohash, geo_confidence, attributes
    )"""

_UPSERT_SQL = (
    _INSERT_COLS
    + " VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)\n"
    + _ON_CONFLICT_SET_SQL
)

_UPSERT_BATCH_SQL = (
    _INSERT_COLS
    + """
    SELECT
        t.user_id, t.product_key, t.fournisseur, t.designation_raw, t.designation_fr,
        t.famille, t.unite,
        t.prix_brut_ht, t.remise_pct, t.prix_remise_ht, t.prix_ttc_iva21,
        t.prix_ttc_remise, t.prix_ttc_non_remise, t.prix_conseille_vente,
        t.numero_facture, t.date_facture, t.confidence, t.source,
        t.fournisseur_city, t.fournisseur_country, t.fournisseur_lat, t.fournisseur_lng,
        t.fournisseur_geohash, t.geo_confidence, t.attributes
    FROM unnest(
        $1::bigint[], $2::text[], $3::text[], $4::text[], $5::text[],
        $6::text[], $7::text[],
        $8::double precision[], $9::double precision[], $10::double precision[],
        $11::double precision[], $12::double precision[], $13::double precision[],
        $14::double precision[],
        $15::text[], $16::date[], $17::text[], $18::text[],
        $19::text[], $20::text[], $21::double precision[], $22::double precision[],
        $23::text[], $24::text[], $25::jsonb[]
    ) AS t(
        user_id, product_key, fournisseur, designation_raw, designation_fr,
        famille, unite,
        prix_brut_ht, remise_pct, prix_remise_ht, prix_ttc_iva21,
        prix_ttc_remise, prix_ttc_non_remise, prix_conseille_vente,
        numero_facture, date_facture, confidence, source,
        fournisseur_city, fournisseur_country, fournisseur_lat, fournisseur_lng,
        fournisseur_geohash, geo_confidence, attributes
    )
"""
    + _ON_CONFLICT_SET_SQL
    + "    RETURNING id, product_key, user_id\n"
)

_HIST_BATCH_SQL = """
    INSERT INTO prix_historique (
        produit_id, fournisseur, designation_fr, prix_ht, prix_brut, remise_pct, source_date_facture
    )
    SELECT * FROM unnest(
        $1::int[], $2::text[], $3::text[],
        $4::double precision[], $5::double precision[], $6::double precision[],
        $7::date[]
    ) AS h(produit_id, fournisseur, designation_fr, prix_ht, prix_brut, remise_pct, source_date_facture)
"""

# Taille des lots pour unnest
UPSERT_PRODUCTS_CHUNK_SIZE = 250


# ── Helpers internes ──────────────────────────────────────────────────────────


def _upsert_params(product: dict, source: str, user_id: int | None) -> tuple:
    return _build_upsert_params(product, source, user_id)


async def _insert_prix_historique_rows(
    conn: Any, rows: list[tuple[int, str, str, float, float, float, date | None]]
) -> int:
    """Insère des lignes d'historique ; repli ligne à ligne si le lot échoue."""
    if not rows:
        return 0
    p_ids, fours, desigs, prix_ht, prix_brut, remises, source_dates = zip(*rows, strict=True)
    try:
        await conn.execute(
            _HIST_BATCH_SQL,
            list(p_ids), list(fours), list(desigs),
            list(prix_ht), list(prix_brut), list(remises), list(source_dates),
        )
        return 0
    except Exception as e:
        logger.warning("Batch prix_historique échoué, repli ligne par ligne (%d): %s", len(rows), e, exc_info=True)
        failures = 0
        for row in rows:
            try:
                await conn.execute(
                    """INSERT INTO prix_historique
                            (produit_id, fournisseur, designation_fr, prix_ht, prix_brut, remise_pct, source_date_facture)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)""",
                    *row,
                )
            except Exception as row_e:
                failures += 1
                logger.warning("Erreur prix_historique produit_id=%s: %s", row[0], row_e, exc_info=True)
        return failures


async def _upsert_chunk_sequential(
    conn: Any, chunk: list[dict], source: str, user_id: int | None
) -> tuple[int, int]:
    count = 0
    historique_failures = 0
    for product in chunk:
        try:
            result = await conn.fetchrow(
                _UPSERT_SQL + " RETURNING id",
                *_upsert_params(product, source, user_id),
            )
            count += 1
            if result and _safe_float(product.get("prix_remise_ht")) > 0:
                try:
                    await conn.execute(
                        """INSERT INTO prix_historique
                            (produit_id, fournisseur, designation_fr, prix_ht, prix_brut, remise_pct, source_date_facture)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)""",
                        result["id"],
                        product.get("fournisseur", ""),
                        product.get("designation_fr", ""),
                        _safe_float(product.get("prix_remise_ht")),
                        _safe_float(product.get("prix_brut_ht")),
                        _safe_float(product.get("remise_pct")),
                        _parse_date(product.get("date_facture")),
                    )
                except Exception as e:
                    historique_failures += 1
                    logger.warning("Erreur prix_historique produit_id=%s: %s", result["id"], e, exc_info=True)
        except Exception as e:
            logger.warning("Upsert ignoré pour %s: %s", product.get("designation_raw"), e)
    return count, historique_failures


async def _ensure_fournisseurs_references(conn: Any, products: list[dict]) -> None:
    """Garantit que chaque fournisseur existe dans la table fournisseurs (FK)."""
    seen: set[str] = set()
    noms: list[str] = []
    for p in products:
        nom = (p.get("fournisseur") or "").strip()
        if not nom or nom in seen:
            continue
        seen.add(nom)
        noms.append(nom)
    if not noms:
        return
    await conn.execute(
        """INSERT INTO fournisseurs (nom)
        SELECT * FROM unnest($1::text[])
        ON CONFLICT (nom) DO NOTHING""",
        noms,
    )


async def _upsert_chunk_batch(
    conn: Any, chunk: list[dict], source: str, user_id: int | None
) -> tuple[int, int]:
    if not chunk:
        return 0, 0

    deduped = _dedupe_products_for_batch_upsert(chunk, user_id)
    arrays = _column_arrays_for_upsert(deduped, source, user_id, _upsert_params)
    returned = await conn.fetch(_UPSERT_BATCH_SQL, *arrays)

    id_by_key: dict[tuple[str, int | None], int] = {}
    for row in returned:
        id_by_key[(row["product_key"], row["user_id"])] = row["id"]

    hist_rows: list[tuple[int, str, str, float, float, float, date | None]] = []
    for product in chunk:
        key = _produit_conflict_key(product, user_id)
        pid = id_by_key.get(key)
        if pid is None:
            logger.warning("Pas d'id après upsert lot pour clé %s — historique ignoré", key)
            continue
        if _safe_float(product.get("prix_remise_ht")) > 0:
            hist_rows.append((
                pid,
                product.get("fournisseur", ""),
                product.get("designation_fr", ""),
                _safe_float(product.get("prix_remise_ht")),
                _safe_float(product.get("prix_brut_ht")),
                _safe_float(product.get("remise_pct")),
                _parse_date(product.get("date_facture")),
            ))

    hist_failures = await _insert_prix_historique_rows(conn, hist_rows)
    return len(chunk), hist_failures


# ── Classe publique ───────────────────────────────────────────────────────────


class ProductRepository(BaseRepository):
    """Opérations CRUD sur les produits et l'historique des prix."""

    @classmethod
    async def upsert_batch(
        cls, products: list[dict], source: str = "pc", user_id: int | None = None
    ) -> tuple[int, int]:
        """Insère/met à jour une liste de produits. Retourne (count, hist_failures)."""
        if not products:
            return 0, 0

        pool = await cls.get_pool()
        count = 0
        historique_failures = 0

        async with pool.acquire() as conn:
            async with conn.transaction():
                await _ensure_fournisseurs_references(conn, products)
                for i in range(0, len(products), UPSERT_PRODUCTS_CHUNK_SIZE):
                    chunk = products[i : i + UPSERT_PRODUCTS_CHUNK_SIZE]
                    await conn.execute("SAVEPOINT upsert_products_batch")
                    try:
                        c, h = await _upsert_chunk_batch(conn, chunk, source, user_id)
                        count += c
                        historique_failures += h
                        await conn.execute("RELEASE SAVEPOINT upsert_products_batch")
                    except Exception as e:
                        logger.warning(
                            "Upsert lot échoué (%d produits), repli séquentiel: %s",
                            len(chunk), e, exc_info=True,
                        )
                        await conn.execute("ROLLBACK TO SAVEPOINT upsert_products_batch")
                        c, h = await _upsert_chunk_sequential(conn, chunk, source, user_id)
                        count += c
                        historique_failures += h
        return count, historique_failures

    @classmethod
    async def update(
        cls, product_id: int, updates: dict, user_id: int | None = None
    ) -> dict | None:
        """Met à jour un produit par son ID."""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            set_parts: list[str] = []
            params: list[Any] = []
            idx = 1

            for field in sorted(k for k in updates if k in _PATCHABLE_PRODUCT_COLUMNS):
                set_parts.append(f"{field} = ${idx}")
                raw = updates[field]
                if field in _NUMERIC_PRODUCT_COLUMNS:
                    if field == "prix_conseille_vente":
                        if raw is None:
                            params.append(None)
                        else:
                            v = _safe_float(raw)
                            params.append(None if v <= 0 else v)
                    else:
                        params.append(_safe_float(raw))
                else:
                    params.append(raw)
                idx += 1

            if not set_parts:
                return None

            set_parts.append("updated_at = NOW()")
            where_parts = [f"id = ${idx}"]
            params.append(product_id)
            idx += 1

            if user_id is not None:
                where_parts.append(f"user_id = ${idx}")
                params.append(user_id)
                idx += 1

            # Construction de la requête dynamique (Whitelist-based)
            query_set = ", ".join(set_parts)
            query_where = " AND ".join(where_parts)
            
            query = f"""
                UPDATE produits
                SET {query_set}
                WHERE {query_where}
                RETURNING
                    id, fournisseur, designation_raw, designation_fr,
                    famille, unite,
                    prix_brut_ht, remise_pct, prix_remise_ht, prix_ttc_iva21,
                    prix_ttc_remise, prix_ttc_non_remise, prix_conseille_vente,
                    numero_facture, date_facture, confidence, source,
                    updated_at
            """
            result = await conn.fetchrow(query, *params)
            return dict(result) if result else None

    @classmethod
    async def get_catalogue(
        cls,
        famille: str | None = None,
        fournisseur: str | None = None,
        search: str | None = None,
        limit: int = 50,
        cursor: str | None = None,
        user_id: int | None = None,
    ) -> dict[str, Any]:
        """Catalogue paginé + total en un aller-retour."""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            base_conditions: list[str] = []
            base_params: list[Any] = []
            i = 1

            if user_id is not None:
                base_conditions.append(f"user_id = ${i}")
                base_params.append(user_id)
                i += 1
            if famille and famille != "Toutes":
                base_conditions.append(f"famille = ${i}")
                base_params.append(famille)
                i += 1
            if fournisseur:
                base_conditions.append(f"fournisseur ILIKE ${i} ESCAPE E'\\\\'")
                base_params.append("%" + _escape_like(fournisseur) + "%")
                i += 1
            if search and search.strip():
                s = search.strip()
                s_escaped = _escape_like(s)
                base_conditions.append(
                    f"""(
                    designation_raw ILIKE ${i} ESCAPE E'\\\\'
                    OR designation_fr ILIKE ${i} ESCAPE E'\\\\'
                    OR fournisseur ILIKE ${i} ESCAPE E'\\\\'
                    OR similarity(designation_raw, ${i + 1}) > 0.2
                    OR similarity(designation_fr,  ${i + 1}) > 0.2
                )"""
                )
                base_params.append("%" + s_escaped + "%")
                base_params.append(s)
                i += 2

            where_base_sql = " AND ".join(base_conditions) if base_conditions else "TRUE"
            n_base = len(base_params)

            outer_conditions = list(base_conditions)
            outer_params = list(base_params)
            if cursor:
                outer_conditions.append(f"updated_at < ${n_base + 1}::timestamptz")
                outer_params.append(cursor)
            where_outer_sql = " AND ".join(outer_conditions) if outer_conditions else "TRUE"

            score_col = "0 AS score"
            order_clause = "updated_at DESC"
            if search and search.strip():
                s = search.strip()
                score_idx = len(outer_params) + 1
                score_col = f"""GREATEST(
                    similarity(designation_raw, ${score_idx}),
                    similarity(designation_fr,  ${score_idx})
                ) AS score"""
                outer_params.append(s)
                order_clause = "score DESC, updated_at DESC"

            limit_idx = len(outer_params) + 1
            outer_params.append(limit + 1)

            # ── Exécution de la requête paginée ─────────────────────────────
            # Note: score_col et order_clause sont garantis statiques ou paramétrés
            query = f"""
                SELECT
                    id, fournisseur, designation_raw, designation_fr,
                    famille, unite,
                    prix_brut_ht, remise_pct, prix_remise_ht, prix_ttc_iva21,
                    prix_ttc_remise, prix_ttc_non_remise, prix_conseille_vente,
                    numero_facture, date_facture, confidence, source,
                    updated_at,
                    {score_col},
                    (SELECT COUNT(*)::bigint FROM produits WHERE {where_base_sql}) AS total
                FROM produits
                WHERE {where_outer_sql}
                ORDER BY {order_clause}
                LIMIT ${limit_idx}
            """

            rows = await conn.fetch(query, *outer_params)
            has_more = len(rows) > limit
            items = rows[:limit]
            next_cursor = items[-1]["updated_at"].isoformat() if has_more and items else None

            if rows:
                total = int(rows[0]["total"])
            else:
                total = int(
                    await conn.fetchval(
                        f"SELECT COUNT(*)::bigint FROM produits WHERE {where_base_sql}",
                        *base_params,
                    )
                    or 0
                )

            return {
                "products": [dict(r) for r in items],
                "next_cursor": next_cursor,
                "has_more": has_more,
                "total": total,
            }

    @classmethod
    async def truncate(cls, user_id: int | None = None) -> int:
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            if user_id is not None:
                result = await conn.execute("DELETE FROM produits WHERE user_id = $1", user_id)
                return int(result.split()[-1]) if result else 0
            await conn.execute("TRUNCATE TABLE produits RESTART IDENTITY CASCADE")
            return 0

    @classmethod
    async def get_fournisseurs(cls, user_id: int | None = None) -> list[str]:
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            if user_id is not None:
                rows = await conn.fetch(
                    "SELECT DISTINCT fournisseur FROM produits WHERE user_id = $1 ORDER BY fournisseur",
                    user_id,
                )
            else:
                rows = await conn.fetch("SELECT DISTINCT fournisseur FROM produits ORDER BY fournisseur")
            return [r["fournisseur"] for r in rows]

    @classmethod
    async def compare_prices(cls, search: str, user_id: int | None = None) -> list[dict]:
        """Compare les prix d'un produit entre fournisseurs."""
        pool = await cls.get_pool()
        search_escaped = "%" + _escape_like(search) + "%"
        async with pool.acquire() as conn:
            user_clause = " AND user_id = $3" if user_id is not None else ""
            params: tuple = (
                (search_escaped, search, user_id) if user_id is not None else (search_escaped, search)
            )
            rows = await conn.fetch(
                "SELECT id, fournisseur, designation_fr, prix_remise_ht, prix_brut_ht, "
                "remise_pct, unite, numero_facture, date_facture, updated_at "
                "FROM produits "
                "WHERE (designation_fr ILIKE $1 ESCAPE E'\\\\' "
                "OR designation_raw ILIKE $1 ESCAPE E'\\\\' "
                "OR similarity(designation_fr, $2) > 0.3)" + user_clause + " "
                "ORDER BY prix_remise_ht ASC LIMIT 20",
                *params,
            )
            return [dict(r) for r in rows]

    @classmethod
    async def get_price_history(cls, product_id: int, user_id: int | None = None) -> list[dict]:
        """Historique de prix pour un produit."""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            if user_id is not None:
                rows = await conn.fetch(
                    """SELECT ph.prix_ht, ph.prix_brut, ph.remise_pct, ph.recorded_at
                    FROM prix_historique ph
                    JOIN produits p ON p.id = ph.produit_id AND p.user_id = $2
                    WHERE ph.produit_id = $1
                    ORDER BY ph.recorded_at ASC LIMIT 20""",
                    product_id, user_id,
                )
            else:
                rows = await conn.fetch(
                    """SELECT prix_ht, prix_brut, remise_pct, recorded_at
                    FROM prix_historique WHERE produit_id = $1
                    ORDER BY recorded_at ASC LIMIT 20""",
                    product_id,
                )
            return [dict(r) for r in rows]

    @classmethod
    async def compare_prices_with_history(cls, search: str, user_id: int | None = None) -> list[dict]:
        """Compare prices + batch-load history in 2 queries (fixes N+1)."""
        pool = await cls.get_pool()
        search_escaped = "%" + _escape_like(search) + "%"
        async with pool.acquire() as conn:
            user_clause = " AND user_id = $3" if user_id is not None else ""
            params: tuple = (
                (search_escaped, search, user_id) if user_id is not None else (search_escaped, search)
            )
            products = await conn.fetch(
                "SELECT id, fournisseur, designation_fr, prix_remise_ht, prix_brut_ht, "
                "remise_pct, unite, numero_facture, date_facture, updated_at "
                "FROM produits "
                "WHERE (designation_fr ILIKE $1 ESCAPE E'\\\\' "
                "OR designation_raw ILIKE $1 ESCAPE E'\\\\' "
                "OR similarity(designation_fr, $2) > 0.3)" + user_clause + " "
                "ORDER BY prix_remise_ht ASC LIMIT 20",
                *params,
            )
            if not products:
                return []

            product_ids = [r["id"] for r in products]
            hist_rows = await conn.fetch(
                """SELECT produit_id, prix_ht, prix_brut, remise_pct, recorded_at
                FROM prix_historique WHERE produit_id = ANY($1::int[])
                ORDER BY recorded_at ASC""",
                product_ids,
            )

            hist_by_id: dict[int, list[dict]] = {}
            for h in hist_rows:
                d = dict(h)
                pid = d.pop("produit_id")
                hist_by_id.setdefault(pid, []).append(d)

            return [{**dict(r), "price_history": hist_by_id.get(r["id"], [])} for r in products]
