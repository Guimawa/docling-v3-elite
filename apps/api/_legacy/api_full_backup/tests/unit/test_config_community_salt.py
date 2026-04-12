"""Validation COMMUNITY_SALT au démarrage (production uniquement)."""

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


def test_production_community_salt_missing_exits(monkeypatch: pytest.MonkeyPatch) -> None:
    _minimal_prod_env(monkeypatch)
    monkeypatch.setenv("COMMUNITY_SALT", "")
    s = _Settings()
    with pytest.raises(SystemExit):
        s.validate_startup()


def test_production_community_salt_too_short_exits(monkeypatch: pytest.MonkeyPatch) -> None:
    _minimal_prod_env(monkeypatch)
    monkeypatch.setenv("COMMUNITY_SALT", "x" * 31)
    s = _Settings()
    with pytest.raises(SystemExit):
        s.validate_startup()


def test_production_community_salt_default_string_exits(monkeypatch: pytest.MonkeyPatch) -> None:
    _minimal_prod_env(monkeypatch)
    monkeypatch.setenv("COMMUNITY_SALT", "docling-default-salt")
    s = _Settings()
    with pytest.raises(SystemExit):
        s.validate_startup()


def test_production_community_salt_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    _minimal_prod_env(monkeypatch)
    monkeypatch.setenv("COMMUNITY_SALT", "c" * 32)
    s = _Settings()
    s.validate_startup()


def test_development_allows_empty_community_salt(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/docling_test")
    monkeypatch.setenv("JWT_SECRET", "a" * 32)
    monkeypatch.setenv("JWT_REFRESH_SECRET", "b" * 32)
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("COMMUNITY_SALT", "")
    monkeypatch.setenv("FREE_ACCESS_MODE", "true")
    monkeypatch.setenv("DEFAULT_AI_MODEL", "gemini-3-flash-preview")
    s = _Settings()
    s.validate_startup()


def test_production_rejects_whitespace_only_community_salt(monkeypatch: pytest.MonkeyPatch) -> None:
    """En prod, salt uniquement espaces = absent."""
    _minimal_prod_env(monkeypatch)
    monkeypatch.setenv("COMMUNITY_SALT", "   \t  ")
    s = _Settings()
    with pytest.raises(SystemExit):
        s.validate_startup()


def test_development_whitespace_salt_ok_for_startup(monkeypatch: pytest.MonkeyPatch) -> None:
    """En dev, pas d'exigence COMMUNITY_SALT : validate_startup ne vérifie pas le salt."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/docling_test")
    monkeypatch.setenv("JWT_SECRET", "a" * 32)
    monkeypatch.setenv("JWT_REFRESH_SECRET", "b" * 32)
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("COMMUNITY_SALT", "   \t  ")
    monkeypatch.setenv("FREE_ACCESS_MODE", "true")
    monkeypatch.setenv("DEFAULT_AI_MODEL", "gemini-3-flash-preview")
    s = _Settings()
    s.validate_startup()
