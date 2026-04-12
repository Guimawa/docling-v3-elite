"""Session portail client Stripe (Customer Portal) — aligné SPEC-SERVICE-PAYANT-2026."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException

from core.config import Config
from core.db_manager import DBManager
from domains.billing.stripe_checkout_service import _absolute_pwa_base
from domains.billing.stripe_http import make_idempotency_key, stripe_post

logger = logging.getLogger(__name__)

_STRIPE_BILLING_PORTAL_SESSIONS = "https://api.stripe.com/v1/billing_portal/sessions"


def _portal_return_url() -> str:
    base = _absolute_pwa_base()
    path = (Config.STRIPE_PORTAL_RETURN_PATH or "/settings").strip()
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{base}{path}"


async def create_billing_portal_url(user_id: int) -> str:
    """
    Crée une session ``billing_portal/sessions`` et renvoie l'URL hébergée Stripe.

    Lève ``HTTPException`` si pas de client Stripe, configuration ou appel Stripe insuffisant.
    """
    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT stripe_customer_id::text AS stripe_customer_id
            FROM users WHERE id = $1::bigint
            """,
            user_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    stripe_customer_id = (row["stripe_customer_id"] or "").strip()
    if not stripe_customer_id:
        raise HTTPException(
            status_code=409,
            detail="Aucun client Stripe — souscrivez d'abord via la page Tarifs.",
        )

    return_url = _portal_return_url()
    form: dict[str, Any] = {
        "customer": stripe_customer_id,
        "return_url": return_url,
    }

    # Idempotency-Key : empêche les sessions portail dupliquées
    idem_key = make_idempotency_key("portal", user_id)

    data = await stripe_post(
        _STRIPE_BILLING_PORTAL_SESSIONS,
        form,
        idempotency_key=idem_key,
        error_context="Stripe Portal",
    )

    url = data.get("url")
    if not url or not isinstance(url, str):
        raise HTTPException(status_code=502, detail="Réponse Stripe sans URL de portail")

    return url
