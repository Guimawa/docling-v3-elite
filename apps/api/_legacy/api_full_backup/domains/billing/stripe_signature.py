"""Vérification Stripe-Signature — alignée sur stripe-python (sans dépendance stripe)."""

from __future__ import annotations

import hmac
import time
from hashlib import sha256


def _parse_header(sig_header: str) -> tuple[int, list[str]]:
    """Extrait le timestamp et les signatures schéma v1 depuis Stripe-Signature."""
    timestamp: int | None = None
    signatures: list[str] = []
    for part in sig_header.split(","):
        part = part.strip()
        if "=" not in part:
            continue
        key, _, value = part.partition("=")
        key = key.strip()
        value = value.strip()
        if key == "t":
            timestamp = int(value)
        elif key == "v1":
            signatures.append(value)
    if timestamp is None:
        msg = "timestamp Stripe-Signature manquant"
        raise ValueError(msg)
    if not signatures:
        msg = "aucune signature v1 dans Stripe-Signature"
        raise ValueError(msg)
    return timestamp, signatures


def verify_stripe_signature(
    payload: bytes,
    sig_header: str,
    secret: str,
    *,
    tolerance_sec: int = 300,
) -> None:
    """
    Lève ValueError si la signature est invalide ou hors fenêtre temporelle.

    ``payload`` : corps brut tel que reçu (bytes), sans ré-encodage JSON.
    ``secret`` : secret du endpoint (ex. whsec_...), même chaîne que dans le Dashboard / Stripe CLI.
    """
    if not sig_header or not sig_header.strip():
        msg = "en-tête Stripe-Signature vide"
        raise ValueError(msg)
    secret = (secret or "").strip()
    if not secret:
        msg = "secret webhook vide"
        raise ValueError(msg)

    try:
        payload_str = payload.decode("utf-8")
    except UnicodeDecodeError as e:
        msg = "corps webhook non UTF-8"
        raise ValueError(msg) from e

    timestamp, signatures = _parse_header(sig_header)
    signed_payload = f"{timestamp}.{payload_str}"
    expected = hmac.new(
        secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        sha256,
    ).hexdigest()

    if not any(hmac.compare_digest(expected, s) for s in signatures):
        msg = "signature Stripe-Signature invalide"
        raise ValueError(msg)

    now = int(time.time())
    if timestamp < now - tolerance_sec:
        msg = "horodatage webhook trop ancien (replay ?)"
        raise ValueError(msg)
    if timestamp > now + tolerance_sec:
        msg = "horodatage webhook dans le futur"
        raise ValueError(msg)
