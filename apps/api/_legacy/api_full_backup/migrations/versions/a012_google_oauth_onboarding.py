"""Google OAuth state table, user onboarding columns, nullable password for OAuth

Revision ID: a012
Revises: a011
Create Date: 2026-04-03
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a012"
down_revision: str | None = "a011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Safety net: some test/staging databases were stamped beyond a009 without
    # actually creating refresh_tokens. Keep this idempotent to avoid strict-auth
    # login 500s (UndefinedTableError) during E2E.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id         SERIAL PRIMARY KEY,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            jti        TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked    BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens(jti)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS oauth_google_states (
            jti          TEXT PRIMARY KEY,
            expires_at   TIMESTAMPTZ NOT NULL
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_oauth_google_states_expires "
        "ON oauth_google_states(expires_at)"
    )

    op.execute("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL")
    op.execute(
        """
        ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255)
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub_unique "
        "ON users(google_sub) WHERE google_sub IS NOT NULL"
    )
    op.execute(
        """
        ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20)
            DEFAULT 'local'
        """
    )
    op.execute("UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL")
    op.execute(
        """
        ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0
        """
    )
    op.execute(
        """
        ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE
        """
    )
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(200)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS company_size VARCHAR(50)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS job_role VARCHAR(100)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_goal VARCHAR(100)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()")
    op.execute(
        """
        ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_password_or_google
        """
    )
    op.execute(
        """
        ALTER TABLE users ADD CONSTRAINT chk_users_password_or_google
        CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL)
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_password_or_google")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS updated_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS primary_goal")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS job_role")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS company_size")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS company_name")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS onboarding_completed")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS onboarding_step")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS auth_provider")
    op.execute("DROP INDEX IF EXISTS idx_users_google_sub_unique")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS google_sub")
    op.execute(
        """
        UPDATE users SET password_hash = ''
        WHERE password_hash IS NULL
        """
    )
    op.execute("ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL")
    op.execute("DROP INDEX IF EXISTS idx_oauth_google_states_expires")
    op.execute("DROP TABLE IF EXISTS oauth_google_states")
