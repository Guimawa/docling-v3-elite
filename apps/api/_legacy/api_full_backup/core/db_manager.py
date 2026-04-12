"""
DBManager — Façade rétrocompatible.

Délègue aux repositories spécialisés sans casser les 25+ imports existants.
Toute la logique métier vit désormais dans :
  - db_base.py         → BaseRepository (pool, migrations)
  - db_products.py     → ProductRepository (upsert, catalogue, prix)
  - db_factures.py     → FactureRepository (log, historique, RGPD)
  - db_jobs.py         → JobRepository (create, claim, update)
  - db_stats.py        → StatsRepository (dashboard, observabilité)
  - db_community.py    → CommunityRepository (prefs communautaires)

Neon 2026 : utiliser l'URL avec -pooler (ex: ep-xxx-pooler.region.neon.tech)
pour PgBouncer → jusqu'à 10k connexions, meilleure résilience.
"""

from __future__ import annotations

from typing import Any

# ── Re-exports pour la rétrocompatibilité (tests, services) ───────────────────
from core.db_product_utils import _escape_like, _parse_date, _safe_float  # noqa: F401
from core.db_product_utils import _upsert_params  # noqa: F401
from core.db_products import UPSERT_PRODUCTS_CHUNK_SIZE as _UPSERT_PRODUCTS_CHUNK_SIZE  # noqa: F401

# ── Repositories ──────────────────────────────────────────────────────────────
from core.db_base import BaseRepository
from core.db_community import CommunityRepository
from core.db_factures import FactureRepository
from core.db_jobs import JobRepository
from core.db_products import ProductRepository
from core.db_stats import StatsRepository


class DBManager(BaseRepository):
    """Façade — même API publique qu'avant, délègue aux repositories."""

    # ── Pool & migrations (hérité de BaseRepository) ──────────────────────────
    # get_pool, close_pool, run_migrations sont hérités directement.

    # ── Products ──────────────────────────────────────────────────────────────

    @classmethod
    async def upsert_products_batch(
        cls, products: list[dict], source: str = "pc", user_id: int | None = None
    ) -> tuple[int, int]:
        return await ProductRepository.upsert_batch(products, source, user_id)

    @classmethod
    async def update_product(
        cls, product_id: int, updates: dict, user_id: int | None = None
    ) -> dict | None:
        return await ProductRepository.update(product_id, updates, user_id)

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
        return await ProductRepository.get_catalogue(
            famille=famille, fournisseur=fournisseur,
            search=search, limit=limit, cursor=cursor, user_id=user_id,
        )

    @classmethod
    async def truncate_products(cls, user_id: int | None = None) -> int:
        return await ProductRepository.truncate(user_id)

    @classmethod
    async def get_fournisseurs(cls, user_id: int | None = None) -> list[str]:
        return await ProductRepository.get_fournisseurs(user_id)

    @classmethod
    async def compare_prices(cls, search: str, user_id: int | None = None) -> list[dict]:
        return await ProductRepository.compare_prices(search, user_id)

    @classmethod
    async def get_price_history_by_product_id(
        cls, product_id: int, user_id: int | None = None
    ) -> list[dict]:
        return await ProductRepository.get_price_history(product_id, user_id)

    @classmethod
    async def compare_prices_with_history(
        cls, search: str, user_id: int | None = None
    ) -> list[dict]:
        return await ProductRepository.compare_prices_with_history(search, user_id)

    # ── Factures ──────────────────────────────────────────────────────────────

    # ── Déduplication Distribuée (PostgreSQL Cache) ──────────────────────────

    @classmethod
    async def dedup_get(cls, dedup_key: str, ttl_minutes: int = 10) -> str | None:
        return await JobRepository.dedup_get(dedup_key, ttl_minutes)

    @classmethod
    async def dedup_set(cls, dedup_key: str, job_id: str, user_id: int | None = None) -> None:
        return await JobRepository.dedup_set(dedup_key, job_id, user_id)

    @classmethod
    async def dedup_cleanup(cls, older_than_hours: int = 24) -> int:
        return await JobRepository.dedup_cleanup(older_than_hours)

    @classmethod
    async def get_factures_history(cls, limit: int = 50, user_id: int | None = None) -> list[dict]:
        return await FactureRepository.get_history(limit, user_id)

    @classmethod
    async def log_facture(
        cls,
        filename: str,
        statut: str,
        nb_produits: int,
        cout_usd: float,
        modele_ia: str,
        source: str = "pc",
        pdf_url: str | None = None,
        user_id: int | None = None,
    ) -> int:
        return await FactureRepository.log(
            filename, statut, nb_produits, cout_usd, modele_ia, source, pdf_url, user_id,
        )

    @classmethod
    async def get_facture_pdf_url(cls, facture_id: int, user_id: int | None = None) -> str | None:
        return await FactureRepository.get_pdf_url(facture_id, user_id)

    @classmethod
    async def get_user_export_data(cls, user_id: int) -> dict:
        return await FactureRepository.get_user_export_data(user_id)

    # ── Jobs ──────────────────────────────────────────────────────────────────

    @classmethod
    async def create_job(
        cls,
        job_id: str,
        status: str = "processing",
        user_id: int | None = None,
        *,
        input_storage_key: str | None = None,
        input_filename: str | None = None,
        model_id: str | None = None,
        job_source: str | None = None,
        content_type: str | None = None,
        ocr_engine: str | None = None,
        preprocess_mode: str | None = None,
    ) -> None:
        return await JobRepository.create(
            job_id, status, user_id,
            input_storage_key=input_storage_key,
            input_filename=input_filename,
            model_id=model_id,
            job_source=job_source,
            content_type=content_type,
            ocr_engine=ocr_engine,
            preprocess_mode=preprocess_mode,
        )

    @classmethod
    async def claim_next_job(cls) -> dict | None:
        return await JobRepository.claim_next()

    @classmethod
    async def update_job(
        cls,
        job_id: str,
        status: str,
        result: dict | None = None,
        error: str | None = None,
    ) -> None:
        return await JobRepository.update(job_id, status, result, error)

    @classmethod
    async def get_job(cls, job_id: str, user_id: int | None = None) -> dict | None:
        return await JobRepository.get(job_id, user_id)

    # ── Stats & Observabilité ─────────────────────────────────────────────────

    @classmethod
    async def get_stats(cls, user_id: int | None = None) -> dict:
        return await StatsRepository.get_stats(user_id)

    @classmethod
    async def get_observability_summary(cls, hours: int = 24, user_id: int | None = None) -> dict:
        return await StatsRepository.get_observability_summary(hours, user_id)

    # ── Community ─────────────────────────────────────────────────────────────

    @classmethod
    async def get_user_community_prefs(cls, user_id: int | None) -> tuple[bool, str | None]:
        return await CommunityRepository.get_user_prefs(user_id)

    @classmethod
    async def update_user_community_prefs(
        cls, user_id: int, community_consent: bool | None = None, zone_geo: str | None = None
    ) -> None:
        return await CommunityRepository.update_user_prefs(user_id, community_consent, zone_geo)
