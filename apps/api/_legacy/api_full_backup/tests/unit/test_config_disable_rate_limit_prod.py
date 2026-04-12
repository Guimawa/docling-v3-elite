"""Garde-fou production : DISABLE_RATE_LIMIT."""

import pytest

from core.config import _Settings


def _minimal_prod_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/docling_test")
    monkeypatch.setenv("JWT_SECRET", "a" * 32)
    monkeypatch.setenv("JWT_REFRESH_SECRET", "b" * 32)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("FREE_ACCESS_MODE", "false")
    monkeypatch.setenv("DISABLE_RATE_LIMIT", "false")
    monkeypatch.setenv("DEFAULT_AI_MODEL", "gemini-3-flash-preview")
    monkeypatch.setenv("COMMUNITY_SALT", "c" * 32)


def test_production_disable_rate_limit_exits(monkeypatch: pytest.MonkeyPatch) -> None:
    _minimal_prod_env(monkeypatch)
    monkeypatch.setenv("DISABLE_RATE_LIMIT", "true")
    s = _Settings()
    with pytest.raises(SystemExit):
        s.validate_startup()


def test_development_allows_disable_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/docling_test")
    monkeypatch.setenv("JWT_SECRET", "a" * 32)
    monkeypatch.setenv("JWT_REFRESH_SECRET", "b" * 32)
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("FREE_ACCESS_MODE", "true")
    monkeypatch.setenv("DISABLE_RATE_LIMIT", "true")
    monkeypatch.setenv("DEFAULT_AI_MODEL", "gemini-3-flash-preview")
    s = _Settings()
    s.validate_startup()
