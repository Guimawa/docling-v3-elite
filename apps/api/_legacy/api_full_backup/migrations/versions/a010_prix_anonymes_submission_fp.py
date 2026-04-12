"""Add submission_fp dedup column and partial unique index on prix_anonymes

Revision ID: a010
Revises: a009
Create Date: 2026-03-22

- Colonne nullable submission_fp (empreinte soumission) pour dédoublonnage
- Index UNIQUE partiel (submission_fp, produit_hash, prix_ht) WHERE submission_fp IS NOT NULL
  (PostgreSQL 15+ pour INSERT ... ON CONFLICT avec index partiel)
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a010"
down_revision: str | None = "a009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE prix_anonymes ADD COLUMN IF NOT EXISTS submission_fp VARCHAR(64)")
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_prix_anonymes_submission_dedup
        ON prix_anonymes (submission_fp, produit_hash, prix_ht)
        WHERE submission_fp IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_prix_anonymes_submission_dedup")
    op.execute("ALTER TABLE prix_anonymes DROP COLUMN IF EXISTS submission_fp")
