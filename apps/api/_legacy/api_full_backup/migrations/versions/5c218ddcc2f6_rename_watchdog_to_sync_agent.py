"""Rename watchdog to sync_agent

Revision ID: 5c218ddcc2f6
Revises: a018
Create Date: 2026-04-09 03:54:57

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c218ddcc2f6'
down_revision: Union[str, None] = 'a018'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update existing data
    op.execute("UPDATE produits SET source = 'sync_agent' WHERE source = 'watchdog'")
    op.execute("UPDATE jobs SET job_source = 'sync_agent' WHERE job_source = 'watchdog'")
    
    # 2. Drop old constraint and add new one
    op.execute("ALTER TABLE produits DROP CONSTRAINT IF EXISTS ck_produits_source")
    op.execute("""
        ALTER TABLE produits ADD CONSTRAINT ck_produits_source
        CHECK (source IN ('pc', 'mobile', 'sync_agent'))
    """)


def downgrade() -> None:
    # 1. Revert data
    op.execute("UPDATE produits SET source = 'watchdog' WHERE source = 'sync_agent'")
    op.execute("UPDATE jobs SET job_source = 'watchdog' WHERE job_source = 'sync_agent'")
    
    # 2. Revert constraint
    op.execute("ALTER TABLE produits DROP CONSTRAINT IF EXISTS ck_produits_source")
    op.execute("""
        ALTER TABLE produits ADD CONSTRAINT ck_produits_source
        CHECK (source IN ('pc', 'mobile', 'watchdog'))
    """)
