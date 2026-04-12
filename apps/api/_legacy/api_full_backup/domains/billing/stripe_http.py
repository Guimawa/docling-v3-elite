"""Client HTTP Stripe partagé — élimine la duplication checkout/portal.

Quick wins 2026 :
- Idempotency-Key sur chaque appel write (anti double facturation)
- AsyncClient réutilisé (connection pool, skip TLS handshake)
- Retry basique on 429/5xx
- Logging centralisé
"""

from __future__ import annotations

import logging
import secrets
from typing import Any

import httpx
from fastapi import HTTPException

from core.config import Config

logger = logging.getLogger(__name__)

# ── Client partagé (connection pool) ──────────────────────────────────────────
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    """Singleton httpx.AsyncClient — réutilise le pool TCP/TLS vers Stripe."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=30.0,
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
        )
    return _client


async def stripe_post(
    endpoint: str,
    form: dict[str, Any],
    *,
    idempotency_key: str | None = None,
    error_context: str = "Stripe",
) -> dict[str, Any]:
    """
    POST form-urlencoded vers l'API Stripe avec :
    - Idempotency-Key (si fourni)
    - Retry 1× sur 429/5xx
    - Logging d'erreur centralisé

    Retourne le JSON parsé. Lève HTTPException 502/503 en cas d'échec.
    """
    secret = (Config.STRIPE_SECRET_KEY or "").strip()
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="STRIPE_SECRET_KEY non défini — fonctionnalité paiement indisponible",
        )

    headers: dict[str, str] = {
        "Authorization": f"Bearer {secret}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key

    client = _get_client()
    last_response: httpx.Response | None = None

    # Retry simple : 1 tentative de plus sur 429 ou 5xx
    for attempt in range(2):
        r = await client.post(endpoint, headers=headers, data=form)
        last_response = r
        if r.status_code < 400:
            break
        if r.status_code in (429, 500, 502, 503) and attempt == 0:
            logger.info(
                "%s retry (HTTP %s) : %s", error_context, r.status_code, r.text[:200]
            )
            continue
        break

    assert last_response is not None
    if last_response.status_code >= 400:
        logger.warning(
            "%s erreur HTTP %s : %s",
            error_context,
            last_response.status_code,
            last_response.text[:500],
        )
        raise HTTPException(
            status_code=502,
            detail=f"{error_context} a refusé la requête (HTTP {last_response.status_code})",
        )

    try:
        return last_response.json()
    except Exception:
        raise HTTPException(status_code=502, detail=f"Réponse {error_context} invalide") from None


def make_idempotency_key(prefix: str, user_id: int) -> str:
    """Clé idempotence : prefix + user_id + nonce court (évite les collisions en cas de retry)."""
    nonce = secrets.token_hex(8)
    return f"{prefix}_{user_id}_{nonce}"
