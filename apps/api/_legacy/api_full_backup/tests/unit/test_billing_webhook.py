"""Webhook billing — signature Stripe."""

import hashlib
import hmac
import time

import pytest
from httpx import ASGITransport, AsyncClient

from core.config import settings
from main import app


def _stripe_sig_header(payload: str, secret: str, ts: int | None = None) -> str:
    """Construit un en-tête Stripe-Signature valide (même logique que stripe-python)."""
    if ts is None:
        ts = int(time.time())
    signed = f"{ts}.{payload}"
    digest = hmac.new(
        secret.encode("utf-8"),
        signed.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"t={ts},v1={digest}"


@pytest.mark.asyncio
async def test_stripe_webhook_returns_503_without_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post("/api/v1/billing/webhook", content=b"{}")
    assert r.status_code == 503
    assert "non défini" in r.json().get("detail", "")


@pytest.mark.asyncio
async def test_stripe_webhook_returns_400_without_signature_header(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "STRIPE_WEBHOOK_SECRET",
        "whsec_test_secret_32_chars_minimum_x",
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post("/api/v1/billing/webhook", content=b"{}")
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_stripe_webhook_returns_400_on_bad_signature(monkeypatch: pytest.MonkeyPatch) -> None:
    secret = "whsec_test_secret_32_chars_minimum_x"
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", secret)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/api/v1/billing/webhook",
            content=b'{"type":"ping"}',
            headers={"stripe-signature": "t=1,v1=deadbeef"},
        )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_stripe_webhook_returns_200_when_signature_valid(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    secret = "whsec_test_secret_32_chars_minimum_x"
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", secret)

    async def fake_handle(_payload: dict) -> dict:
        return {
            "duplicate": False,
            "received": True,
            "processed": True,
            "detail": "Événement traité (noop)",
            "kind": "noop",
        }

    monkeypatch.setattr(
        "domains.billing.router.handle_stripe_webhook_payload",
        fake_handle,
    )

    body = '{"id":"evt_test_webhook","object":"event","type":"ping"}'
    hdr = _stripe_sig_header(body, secret)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/api/v1/billing/webhook",
            content=body.encode("utf-8"),
            headers={"stripe-signature": hdr},
        )
    assert r.status_code == 200
    data = r.json()
    assert data.get("received") is True
    # 2026 : kind/processed ne sont plus exposés dans la réponse HTTP (logs uniquement)

