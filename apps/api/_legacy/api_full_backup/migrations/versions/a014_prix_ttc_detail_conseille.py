"""TTC remisé / non remisé + prix conseillé vente catalogue.

Revision ID: a014
Revises: a013
Create Date: 2026-04-04
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a014"
down_revision: str | None = "a013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE produits
            ADD COLUMN IF NOT EXISTS prix_ttc_remise NUMERIC(10,4),
            ADD COLUMN IF NOT EXISTS prix_ttc_non_remise NUMERIC(10,4),
            ADD COLUMN IF NOT EXISTS prix_conseille_vente NUMERIC(10,4)
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE produits
            DROP COLUMN IF EXISTS prix_ttc_remise,
            DROP COLUMN IF EXISTS prix_ttc_non_remise,
            DROP COLUMN IF EXISTS prix_conseille_vente
        """
    )
