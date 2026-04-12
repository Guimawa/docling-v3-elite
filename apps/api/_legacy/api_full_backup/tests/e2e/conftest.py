"""
Fixtures E2E — Playwright centralisé.
Toute la configuration (viewport, locale, headless, timeouts) est ici.
Les tests n'ont qu'à utiliser la fixture `page` ou `browser_context`.
"""

import os

import httpx
import pytest
from playwright.sync_api import sync_playwright

from tests.skip_reasons import (
    E2E_DISABLED,
    frontend_e2e_http_error,
    frontend_e2e_unreachable,
    playwright_unavailable,
)

TEST_FRONTEND_URL = os.getenv("TEST_FRONTEND_URL", "http://localhost:5173")

VIEWPORT = {"width": 1280, "height": 720}
LOCALE = "fr-FR"
HEADLESS = os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() != "false"
DEFAULT_NAV_TIMEOUT = 15_000
DEFAULT_EXPECT_TIMEOUT = 10_000


def pytest_collection_modifyitems(config, items):
    """E2E opt-in: skip par défaut sauf si RUN_E2E=true."""
    if os.getenv("RUN_E2E", "false").lower() == "true":
        return
    skip_e2e = pytest.mark.skip(reason=E2E_DISABLED)
    for item in items:
        item_path = str(item.fspath).replace("\\", "/")
        if "/tests/e2e/" in item_path:
            item.add_marker(skip_e2e)


@pytest.fixture(scope="module")
def frontend_url():
    try:
        resp = httpx.get(TEST_FRONTEND_URL, timeout=3)
        if resp.status_code >= 500:
            pytest.skip(
                frontend_e2e_http_error(TEST_FRONTEND_URL, resp.status_code),
                allow_module_level=True,
            )
    except Exception:
        pytest.skip(
            frontend_e2e_unreachable(TEST_FRONTEND_URL),
            allow_module_level=True,
        )
    return TEST_FRONTEND_URL


@pytest.fixture(scope="module")
def browser():
    """Lance un navigateur Chromium partagé pour le module."""
    with sync_playwright() as pw:
        try:
            b = pw.chromium.launch(headless=HEADLESS)
        except Exception as exc:
            pytest.skip(playwright_unavailable(exc), allow_module_level=True)
        yield b
        b.close()


@pytest.fixture(scope="function")
def browser_context(browser):
    """Contexte isolé par test (cookies, storage vierges)."""
    ctx = browser.new_context(
        viewport=VIEWPORT,
        locale=LOCALE,
    )
    ctx.set_default_navigation_timeout(DEFAULT_NAV_TIMEOUT)
    ctx.set_default_timeout(DEFAULT_EXPECT_TIMEOUT)
    yield ctx
    ctx.close()


@pytest.fixture(scope="function")
def page(browser_context):
    """Page prête à l'emploi, nettoyée après chaque test."""
    p = browser_context.new_page()
    yield p
    p.close()
