"""JSONB attributes + optional media columns on produits (facettes catalogue).

Revision ID: a013
Revises: a012
Create Date: 2026-04-04
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a013"
down_revision: str | None = "a012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        """
        ALTER TABLE produits
            ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS photo_url TEXT,
            ADD COLUMN IF NOT EXISTS description_ia TEXT,
            ADD COLUMN IF NOT EXISTS fournisseur_adresse TEXT,
            ADD COLUMN IF NOT EXISTS fournisseur_tel TEXT,
            ADD COLUMN IF NOT EXISTS fournisseur_site TEXT
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_produits_attributes_gin
            ON produits USING GIN (attributes)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_produits_attributes_gin")
    for col in (
        "fournisseur_site",
        "fournisseur_tel",
        "fournisseur_adresse",
        "description_ia",
        "photo_url",
        "attributes",
    ):
        op.execute(f"ALTER TABLE produits DROP COLUMN IF EXISTS {col}")
