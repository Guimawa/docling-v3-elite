"""
FactureRepository — log, historique, pdf_url, export RGPD.
"""

import logging
from typing import Any

from core.db_base import BaseRepository

logger = logging.getLogger(__name__)


class FactureRepository(BaseRepository):
    """Opérations sur les factures (log, historique, export)."""

    @classmethod
    async def get_history(cls, limit: int = 50, user_id: int | None = None) -> list[dict]:
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT id, filename, statut, nb_produits_extraits,
                       cout_api_usd, modele_ia, source, pdf_url, created_at
                FROM factures
                WHERE ($1::bigint IS NULL OR user_id = $1)
                ORDER BY created_at DESC LIMIT $2""",
                user_id, limit,
            )
            return [dict(r) for r in rows]

    @classmethod
    async def log(
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
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """INSERT INTO factures
                    (filename, statut, nb_produits_extraits, cout_api_usd, modele_ia, source, pdf_url, user_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id""",
                filename, statut, nb_produits, cout_usd, modele_ia, source, pdf_url, user_id,
            )
            return row["id"]

    @classmethod
    async def get_pdf_url(cls, facture_id: int, user_id: int | None = None) -> str | None:
        """Retourne pdf_url si la facture existe et appartient à l'utilisateur."""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            if user_id is not None:
                row = await conn.fetchrow(
                    "SELECT pdf_url FROM factures WHERE id = $1 AND user_id = $2",
                    facture_id, user_id,
                )
            else:
                row = await conn.fetchrow("SELECT pdf_url FROM factures WHERE id = $1", facture_id)
            return row["pdf_url"] if row and row["pdf_url"] else None

    @classmethod
    async def get_user_export_data(cls, user_id: int) -> dict:
        """Retourne toutes les données utilisateur pour export RGPD."""
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            produits = await conn.fetch(
                """SELECT id, fournisseur, designation_raw, designation_fr, famille, unite,
                          prix_brut_ht, remise_pct, prix_remise_ht, prix_ttc_iva21,
                          prix_ttc_remise, prix_ttc_non_remise, prix_conseille_vente,
                          numero_facture, date_facture, confidence, source, updated_at
                   FROM produits WHERE user_id = $1 ORDER BY updated_at DESC""",
                user_id,
            )
            factures = await conn.fetch(
                """SELECT id, filename, statut, nb_produits_extraits, cout_api_usd,
                          modele_ia, source, pdf_url, created_at
                   FROM factures WHERE user_id = $1 ORDER BY created_at DESC""",
                user_id,
            )
            return {
                "produits": [dict(r) for r in produits],
                "factures": [dict(r) for r in factures],
            }
