"""Normalisation DSN PostgreSQL (Neon + channel_binding)."""

from core.db_url import neon_or_ssl_required, strip_postgresql_dsn_query


def test_strip_removes_query_without_corrupting_db_name() -> None:
    raw = (
        "postgresql://u:p@ep-test.eu-central-1.aws.neon.tech/neondb"
        "?sslmode=require&channel_binding=require"
    )
    assert strip_postgresql_dsn_query(raw) == (
        "postgresql://u:p@ep-test.eu-central-1.aws.neon.tech/neondb"
    )


def test_neon_or_ssl_required() -> None:
    assert neon_or_ssl_required("postgresql://x@y.neon.tech/db?sslmode=require")
    assert neon_or_ssl_required("postgresql://localhost/db?sslmode=verify-full")
    assert not neon_or_ssl_required("postgresql://localhost/docling_test")
