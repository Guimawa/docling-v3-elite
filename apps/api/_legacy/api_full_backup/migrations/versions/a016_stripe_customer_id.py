"""Colonne users.stripe_customer_id — amorce monétisation Stripe.

Revision ID: a016
Revises: a015
Create Date: 2026-04-08
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a016"
down_revision: str | None = "a015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id "
        "ON users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_users_stripe_customer_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id")
