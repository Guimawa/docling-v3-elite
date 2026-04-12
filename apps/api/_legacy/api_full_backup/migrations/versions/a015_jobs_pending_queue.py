"""Jobs file d'attente async : statut pending + payload stockage + métadonnées scan.

Revision ID: a015
Revises: a014
Create Date: 2026-04-04
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a015"
down_revision: str | None = "a014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE jobs DROP CONSTRAINT IF EXISTS ck_jobs_status")
    op.execute(
        """
        ALTER TABLE jobs ADD CONSTRAINT ck_jobs_status
        CHECK (status IN ('pending', 'processing', 'completed', 'error'))
        """
    )
    op.execute(
        """
        ALTER TABLE jobs
            ADD COLUMN IF NOT EXISTS input_storage_key TEXT,
            ADD COLUMN IF NOT EXISTS input_filename TEXT,
            ADD COLUMN IF NOT EXISTS model_id TEXT,
            ADD COLUMN IF NOT EXISTS job_source TEXT,
            ADD COLUMN IF NOT EXISTS content_type TEXT,
            ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs (status, created_at) "
        "WHERE status = 'pending'"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_jobs_status_created")
    op.execute(
        """
        ALTER TABLE jobs
            DROP COLUMN IF EXISTS input_storage_key,
            DROP COLUMN IF EXISTS input_filename,
            DROP COLUMN IF EXISTS model_id,
            DROP COLUMN IF EXISTS job_source,
            DROP COLUMN IF EXISTS content_type,
            DROP COLUMN IF EXISTS claimed_at,
            DROP COLUMN IF EXISTS attempts
        """
    )
    op.execute("ALTER TABLE jobs DROP CONSTRAINT IF EXISTS ck_jobs_status")
    op.execute(
        """
        ALTER TABLE jobs ADD CONSTRAINT ck_jobs_status
        CHECK (status IN ('processing', 'completed', 'error'))
        """
    )
