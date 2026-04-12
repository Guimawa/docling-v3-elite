"""Add storage preference and plan tiers to users

Revision ID: 1d896cdc84b6
Revises: 5c218ddcc2f6
Create Date: 2026-04-09 04:00:10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1d896cdc84b6'
down_revision: Union[str, None] = '5c218ddcc2f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Colonnes de Stockage (Souveraineté)
    op.execute("ALTER TABLE users ADD COLUMN storage_type VARCHAR(20) DEFAULT 'managed'")
    op.execute("ALTER TABLE users ADD COLUMN storage_config JSONB DEFAULT '{}'")
    
    # 2. Colonne de Tarification (Business Model 2026)
    op.execute("ALTER TABLE users ADD COLUMN plan_tier VARCHAR(20) DEFAULT 'free'")
    
    # 3. Contraintes CHECK
    op.execute("""
        ALTER TABLE users ADD CONSTRAINT ck_users_storage_type
        CHECK (storage_type IN ('managed', 'personal'))
    """)
    op.execute("""
        ALTER TABLE users ADD CONSTRAINT ck_users_plan_tier
        CHECK (plan_tier IN ('free', 'starter_9', 'pro_19', 'elite_29'))
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_plan_tier")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_storage_type")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS plan_tier")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS storage_config")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS storage_type")
