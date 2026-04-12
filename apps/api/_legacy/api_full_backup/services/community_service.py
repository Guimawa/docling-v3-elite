# services/community_service.py
"""
CommunityService — Base prix communautaire anonyme "Elite 2026".
Collecte et agrégation des prix avec k-anonymité et validation Pydantic V2.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import time
import unicodedata
from datetime import date as date_type
from typing import Any, List, Optional, Annotated

from pydantic import BaseModel, Field, RootModel
import asyncpg

from core.config import Config
from core.db_manager import _escape_like

logger = logging.getLogger(__name__)

# --- SCHÉMAS PYDANTIC V2 ---

class CommunityPriceInput(BaseModel):
    designation: str = Field(..., min_length=1)
    fournisseur: str = Field(..., min_length=1)
    prix_ht: float = Field(..., gt=0)
    date_facture: Optional[date_type] = None

class CommunityStats(BaseModel):
    produit_hash: str
    fournisseur: str
    zone_geo: str
    pays: str
    prix_moyen: float
    prix_min: float
    prix_max: float
    nb_contributions: int

class GeoPriceStats(BaseModel):
    fournisseur_geohash: str
    city: str
    country: str
    famille: str
    sample_size: int
    avg_price: float
    min_price: float
    max_price: float

# --- CACHE LOCAL 2026 ---
_STATS_TTL_SEC = 60.0
_MAX_CACHE_ENTRIES = 256
_stats_cache: dict[tuple[Any, ...], tuple[float, List[CommunityStats]]] = {}
_stats_cache_lock = asyncio.Lock()

# --- UTILITAIRES ---

def _normalize(s: str) -> str:
    if not s: return ""
    s = str(s).strip().lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"\s+", " ", s)
    return s

def _hash_produit(designation: str, fournisseur: str) -> str:
    salt = Config.COMMUNITY_SALT or "docling-default-salt"
    norm = _normalize(designation) + "|" + _normalize(fournisseur)
    return hashlib.sha256((salt + norm).encode()).hexdigest()

# --- SERVICE ---

class CommunityService:
    @classmethod
    async def insert_anonymous_prices_batch(
        cls,
        conn: asyncpg.Connection,
        rows: List[CommunityPriceInput],
        zone_geo: str,
        pays: str,
        submission_fp: Optional[str] = None,
    ) -> int:
        """Batch insert sécurisé et typé."""
        if not Config.COMMUNITY_SALT or not zone_geo or not pays or not rows:
            return 0

        records = []
        for p in rows:
            ph = _hash_produit(p.designation, p.fournisseur)
            records.append((
                ph,
                p.fournisseur[:200],
                zone_geo[:10],
                pays[:2],
                p.prix_ht,
                p.date_facture,
                submission_fp[:64] if submission_fp else None
            ))

        try:
            # Usage de unnest pour performance maximale sur asyncpg
            ph_a, fo_a, zo_a, pa_a, pr_a, da_a, sf_a = zip(*records)
            
            inserted = await conn.fetch(
                """
                INSERT INTO prix_anonymes (
                    produit_hash, fournisseur, zone_geo, pays, prix_ht, date_facture, submission_fp
                )
                SELECT * FROM unnest(
                    $1::text[], $2::varchar(200)[], $3::varchar(10)[], 
                    $4::bpchar(2)[], $5::numeric[], $6::date[], $7::varchar(64)[]
                )
                ON CONFLICT (submission_fp, produit_hash, prix_ht) 
                WHERE submission_fp IS NOT NULL
                DO NOTHING
                RETURNING 1
                """,
                list(ph_a), list(fo_a), list(zo_a), list(pa_a), list(pr_a), list(da_a), list(sf_a)
            )
            return len(inserted)
        except Exception as e:
            logger.error(f"Community batch failed: {e}", exc_info=True)
            return 0

    @classmethod
    async def get_stats(
        cls,
        zone: Optional[str] = None,
        pays: Optional[str] = None,
        fournisseur: Optional[str] = None,
        limit: int = 50,
    ) -> List[CommunityStats]:
        """Agrégats avec k-anonymité et cache."""
        cache_key = (zone, pays, fournisseur, limit)
        now = time.monotonic()
        
        async with _stats_cache_lock:
            cached = _stats_cache.get(cache_key)
            if cached and now < cached[0]:
                return cached[1]

        pool = await cls._get_pool()
        conditions = []
        params = []
        
        if zone:
            params.append(zone)
            conditions.append(f"p.zone_geo = ${len(params)}")
        if pays:
            params.append(pays[:2])
            conditions.append(f"p.pays = ${len(params)}")
        if fournisseur:
            params.append(f"%{_escape_like(fournisseur)}%")
            conditions.append(f"p.fournisseur ILIKE ${len(params)} ESCAPE E'\\\\'")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # Injection sécurisée des paramètres de seuil et limite
        params.append(Config.COMMUNITY_K_ANONYMITY_MIN)
        k_min_idx = len(params)
        params.append(limit)
        limit_idx = len(params)

        query = f"""
            WITH agg AS (
                SELECT
                    produit_hash, fournisseur, zone_geo, pays,
                    AVG(prix_ht)::float AS prix_moyen,
                    MIN(prix_ht)::float AS prix_min,
                    MAX(prix_ht)::float AS prix_max,
                    COUNT(*) AS cnt
                FROM prix_anonymes p
                {where_clause}
                GROUP BY produit_hash, fournisseur, zone_geo, pays
                HAVING COUNT(*) >= ${k_min_idx}
            )
            SELECT produit_hash, fournisseur, zone_geo, pays,
                   prix_moyen, prix_min, prix_max, cnt AS nb_contributions
            FROM agg
            ORDER BY nb_contributions DESC
            LIMIT ${limit_idx}
        """

        async with pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
        
        results = [CommunityStats(**dict(r)) for r in rows]
        
        # Gestion Cache
        async with _stats_cache_lock:
            if len(_stats_cache) >= _MAX_CACHE_ENTRIES:
                _stats_cache.clear() # Flush simple pour 2026
            _stats_cache[cache_key] = (now + _STATS_TTL_SEC, results)
            
        return results

    @classmethod
    async def _get_pool(cls):
        from core.db_manager import DBManager
        return await DBManager.get_pool()

    @classmethod
    async def get_geo_price_map(
        cls,
        geohash_prefix: Optional[str] = None,
        famille: Optional[str] = None,
        limit: int = 100,
    ) -> List[GeoPriceStats]:
        """Vue communautaire géolocalisée."""
        pool = await cls._get_pool()
        params = []
        where = ["fournisseur_geohash IS NOT NULL", "prix_remise_ht > 0"]
        
        if geohash_prefix:
            params.append(f"{_escape_like(geohash_prefix)}%")
            where.append(f"fournisseur_geohash LIKE ${len(params)}")
        if famille:
            params.append(famille)
            where.append(f"famille = ${len(params)}")
            
        params.append(Config.COMMUNITY_K_ANONYMITY_MIN)
        k_min_idx = len(params)
        params.append(min(max(limit, 1), 200))
        limit_idx = len(params)

        query = f"""
            SELECT
                fournisseur_geohash, city, country, famille,
                COUNT(*)::int AS sample_size,
                AVG(prix_remise_ht)::float AS avg_price,
                MIN(prix_remise_ht)::float AS min_price,
                MAX(prix_remise_ht)::float AS max_price
            FROM produits
            WHERE {" AND ".join(where)}
            GROUP BY fournisseur_geohash, city, country, famille
            HAVING COUNT(*) >= ${k_min_idx}
            ORDER BY sample_size DESC
            LIMIT ${limit_idx}
        """

        async with pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
        return [GeoPriceStats(**dict(r)) for r in rows]
