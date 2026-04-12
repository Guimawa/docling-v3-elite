"""CSRF : double-submit ou Origin autorisé (SPA cross-origin)."""

from unittest.mock import patch

import pytest
from fastapi import HTTPException

from domains.shared.dependencies import _csrf_valid, require_csrf_for_cookie_request


class _Hdr:
    def __init__(self, d: dict[str, str]) -> None:
        self._d = d

    def get(self, key: str, default: str = "") -> str:
        return self._d.get(key, default)


class _Ck:
    def __init__(self, d: dict[str, str]) -> None:
        self._d = d

    def get(self, key: str, default: str = "") -> str:
        return self._d.get(key, default)


class _Req:
    def __init__(self, cookies: dict[str, str], headers: dict[str, str]) -> None:
        self.cookies = _Ck(cookies)
        self.headers = _Hdr(headers)


def test_csrf_cookie_header_match() -> None:
    req = _Req({"csrf_token": "abc"}, {"X-CSRF-Token": "abc", "Origin": ""})
    assert _csrf_valid(req) is True


def test_csrf_origin_allowed() -> None:
    req = _Req(
        {"csrf_token": "x"}, {"X-CSRF-Token": "y", "Origin": "https://docling-agent.netlify.app"}
    )
    with patch(
        "domains.shared.dependencies.Config.ALLOWED_ORIGINS",
        ["https://docling-agent.netlify.app"],
    ):
        assert _csrf_valid(req) is True


def test_csrf_rejects_bad_origin() -> None:
    req = _Req({"csrf_token": "x"}, {"X-CSRF-Token": "y", "Origin": "https://evil.example"})
    with patch(
        "domains.shared.dependencies.Config.ALLOWED_ORIGINS",
        ["https://docling-agent.netlify.app"],
    ):
        assert _csrf_valid(req) is False


def test_csrf_rejects_missing_origin_when_header_mismatch() -> None:
    req = _Req({"csrf_token": "a"}, {"X-CSRF-Token": "b", "Origin": ""})
    with patch("domains.shared.dependencies.Config.ALLOWED_ORIGINS", []):
        assert _csrf_valid(req) is False


def test_require_csrf_for_cookie_request_raises_403_without_valid_csrf() -> None:
    req = _Req({}, {"Origin": ""})
    with pytest.raises(HTTPException) as exc_info:
        require_csrf_for_cookie_request(req)  # type: ignore[arg-type]
    assert exc_info.value.status_code == 403


def test_require_csrf_for_cookie_request_ok_with_allowed_origin() -> None:
    req = _Req({}, {"Origin": "http://localhost:5173"})
    with patch(
        "domains.shared.dependencies.Config.ALLOWED_ORIGINS",
        ["http://localhost:5173"],
    ):
        require_csrf_for_cookie_request(req)  # type: ignore[arg-type]
