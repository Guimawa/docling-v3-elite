"""Table app_dedup_cache (distributed fingerprinting).

Revision ID: a018
Revises: a017
Create Date: 2026-04-09
"""

from collections.abc import Sequence
from alembic import op

revision: str = "a018"
down_revision: str | None = "a017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS app_dedup_cache (
            dedup_key TEXT PRIMARY KEY,
            job_id UUID NOT NULL,
            user_id BIGINT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_dedup_cleanup ON app_dedup_cache (created_at)")

def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS app_dedup_cache")
