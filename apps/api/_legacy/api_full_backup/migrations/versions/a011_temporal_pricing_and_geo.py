"""Temporal pricing safety and supplier geo enrichment

Revision ID: a011
Revises: a010
Create Date: 2026-04-02
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a011"
down_revision: str | None = "a010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_produits_unique_designation_fournisseur_user")
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_produits_designation_fournisseur_user "
        "ON produits (designation_raw, fournisseur, user_id)"
    )
    op.execute("ALTER TABLE produits ADD COLUMN IF NOT EXISTS product_key TEXT")
    op.execute(
        """
        WITH keyed AS (
            SELECT
                id,
                user_id,
                LOWER(
                    COALESCE(NULLIF(TRIM(fournisseur), ''), 'na')
                    || '::' ||
                    COALESCE(NULLIF(TRIM(designation_fr), ''), NULLIF(TRIM(designation_raw), ''), 'na')
                    || '::' ||
                    COALESCE(NULLIF(TRIM(unite), ''), 'unite')
                ) AS base_key,
                ROW_NUMBER() OVER (
                    PARTITION BY user_id,
                    LOWER(
                        COALESCE(NULLIF(TRIM(fournisseur), ''), 'na')
                        || '::' ||
                        COALESCE(NULLIF(TRIM(designation_fr), ''), NULLIF(TRIM(designation_raw), ''), 'na')
                        || '::' ||
                        COALESCE(NULLIF(TRIM(unite), ''), 'unite')
                    )
                    ORDER BY id
                ) AS rn
            FROM produits
        )
        UPDATE produits p
        SET product_key = CASE
            WHEN k.rn = 1 THEN k.base_key
            ELSE k.base_key || '::dup' || k.rn::text
        END
        FROM keyed k
        WHERE p.id = k.id AND (p.product_key IS NULL OR TRIM(p.product_key) = '')
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_produits_product_key_user "
        "ON produits (product_key, user_id) NULLS NOT DISTINCT"
    )
    op.execute("ALTER TABLE prix_historique ADD COLUMN IF NOT EXISTS source_date_facture DATE")

    # Supplier geolocation enrichment (best effort)
    op.execute("ALTER TABLE produits ADD COLUMN IF NOT EXISTS fournisseur_city VARCHAR(120)")
    op.execute("ALTER TABLE produits ADD COLUMN IF NOT EXISTS fournisseur_country VARCHAR(2)")
    op.execute("ALTER TABLE produits ADD COLUMN IF NOT EXISTS fournisseur_lat DOUBLE PRECISION")
    op.execute("ALTER TABLE produits ADD COLUMN IF NOT EXISTS fournisseur_lng DOUBLE PRECISION")
    op.execute("ALTER TABLE produits ADD COLUMN IF NOT EXISTS fournisseur_geohash VARCHAR(12)")
    op.execute("ALTER TABLE produits ADD COLUMN IF NOT EXISTS geo_confidence VARCHAR(10)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_produits_supplier_geohash ON produits (fournisseur_geohash)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_produits_designation_fournisseur_user")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_produits_unique_designation_fournisseur_user "
        "ON produits (designation_raw, fournisseur, user_id) NULLS NOT DISTINCT"
    )
    op.execute("DROP INDEX IF EXISTS idx_produits_supplier_geohash")
    op.execute("ALTER TABLE produits DROP COLUMN IF EXISTS geo_confidence")
    op.execute("ALTER TABLE produits DROP COLUMN IF EXISTS fournisseur_geohash")
    op.execute("ALTER TABLE produits DROP COLUMN IF EXISTS fournisseur_lng")
    op.execute("ALTER TABLE produits DROP COLUMN IF EXISTS fournisseur_lat")
    op.execute("ALTER TABLE produits DROP COLUMN IF EXISTS fournisseur_country")
    op.execute("ALTER TABLE produits DROP COLUMN IF EXISTS fournisseur_city")
    op.execute("ALTER TABLE prix_historique DROP COLUMN IF EXISTS source_date_facture")
    op.execute("DROP INDEX IF EXISTS idx_produits_product_key_user")
    op.execute("ALTER TABLE produits DROP COLUMN IF EXISTS product_key")
