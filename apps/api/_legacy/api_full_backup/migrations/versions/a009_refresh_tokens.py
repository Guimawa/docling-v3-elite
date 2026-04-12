"""Add refresh_tokens table for secure token rotation

Revision ID: a009
Revises: a008
Create Date: 2026-03-18

- Table refresh_tokens : stockage des refresh tokens (révocation, rotation)
- Index sur jti (unique) et user_id + expires_at (purge)
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a009"
down_revision: str | None = "a008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id         SERIAL PRIMARY KEY,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            jti        TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked    BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens(jti)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS refresh_tokens")
