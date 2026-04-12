"""Table stripe_webhook_events (idempotence) + colonnes abonnement sur users.

Revision ID: a017
Revises: a016
Create Date: 2026-04-08
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a017"
down_revision: str | None = "a016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS stripe_webhook_events (
            event_id TEXT PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50)")
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ"
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id
        ON users (stripe_subscription_id)
        WHERE stripe_subscription_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_users_stripe_subscription_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS subscription_current_period_end")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS subscription_status")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS stripe_subscription_id")
    op.execute("DROP TABLE IF EXISTS stripe_webhook_events")
