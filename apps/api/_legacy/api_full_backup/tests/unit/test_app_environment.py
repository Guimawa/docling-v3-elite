"""Alignement `main._app_environment()` sur `Config.ENVIRONMENT` (R-14-2 doc/tests)."""

import pytest

from core import config as config_module


def test_app_environment_defaults_to_development_when_empty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(config_module._settings, "ENVIRONMENT", "")
    from main import _app_environment

    assert _app_environment() == "development"


def test_app_environment_strips_and_lowercases(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config_module._settings, "ENVIRONMENT", "  PRODUCTION  ")
    from main import _app_environment

    assert _app_environment() == "production"


def test_app_environment_development_explicit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config_module._settings, "ENVIRONMENT", "development")
    from main import _app_environment

    assert _app_environment() == "development"
