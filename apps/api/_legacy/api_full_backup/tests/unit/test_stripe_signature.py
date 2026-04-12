"""Tests unitaires — domains.billing.stripe_signature."""

import hashlib
import hmac
import time

import pytest

from domains.billing.stripe_signature import verify_stripe_signature


def _sig(payload: str, secret: str, ts: int) -> str:
    signed = f"{ts}.{payload}"
    d = hmac.new(secret.encode("utf-8"), signed.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"t={ts},v1={d}"


def test_verify_stripe_signature_ok() -> None:
    secret = "whsec_unit_test_secret_value_xx"
    payload = '{"x":1}'
    ts = int(time.time())
    header = _sig(payload, secret, ts)
    verify_stripe_signature(payload.encode("utf-8"), header, secret)


def test_verify_stripe_signature_rejects_wrong_secret() -> None:
    secret = "whsec_unit_test_secret_value_xx"
    payload = '{"x":1}'
    ts = int(time.time())
    header = _sig(payload, secret, ts)
    with pytest.raises(ValueError, match="signature"):
        verify_stripe_signature(payload.encode("utf-8"), header, "other_secret")


def test_verify_stripe_signature_rejects_old_timestamp() -> None:
    secret = "whsec_unit_test_secret_value_xx"
    payload = '{"x":1}'
    ts = int(time.time()) - 400
    header = _sig(payload, secret, ts)
    with pytest.raises(ValueError, match="ancien"):
        verify_stripe_signature(payload.encode("utf-8"), header, secret, tolerance_sec=300)
