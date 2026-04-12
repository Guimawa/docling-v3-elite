"""Création de session Stripe Checkout — abonnement (SPEC-SERVICE-PAYANT-2026)."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException

from core.config import Config
from core.db_manager import DBManager
from domains.billing.stripe_http import make_idempotency_key, stripe_post

logger = logging.getLogger(__name__)

_STRIPE_CHECKOUT_SESSIONS = "https://api.stripe.com/v1/checkout/sessions"


def _absolute_pwa_base() -> str:
    p = (Config.PWA_URL or "").strip().rstrip("/")
    if p:
        return p
    return "http://localhost:5173"


def _success_and_cancel_urls() -> tuple[str, str]:
    base = _absolute_pwa_base()
    success_path = (Config.STRIPE_CHECKOUT_SUCCESS_PATH or "/settings?checkout=success").strip()
    if not success_path.startswith("/"):
        success_path = f"/{success_path}"
    cancel_path = (Config.STRIPE_CHECKOUT_CANCEL_PATH or "/tarifs").strip()
    if not cancel_path.startswith("/"):
        cancel_path = f"/{cancel_path}"
    sep = "&" if "?" in success_path else "?"
    success_url = f"{base}{success_path}{sep}session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{base}{cancel_path}"
    return success_url, cancel_url


async def create_checkout_session_url(user_id: int, plan_tier: str | None = None) -> str:
    """
    Crée une session Checkout mode ``subscription`` et renvoie l'URL hébergée Stripe.
    Mappe le ``plan_tier`` (starter_9, pro_19, elite_29) vers le bon Price ID Stripe.
    """
    # Résolution dynamique du Price ID
    price_id = (Config.STRIPE_PRICE_ID or "").strip()
    if plan_tier == "starter_9":
        price_id = Config.STRIPE_PRICE_STARTER_9 or price_id
    elif plan_tier == "pro_19":
        price_id = Config.STRIPE_PRICE_PRO_19 or price_id
    elif plan_tier == "elite_29":
        price_id = Config.STRIPE_PRICE_ELITE_29 or price_id

    if not price_id:
        raise HTTPException(
            status_code=503,
            detail="Stripe Price ID non configuré pour ce palier. Contactez le support.",
        )

    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT email::text AS email, stripe_customer_id::text AS stripe_customer_id
            FROM users WHERE id = $1::bigint
            """,
            user_id,
        )
    if row is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    email = (row["email"] or "").strip()
    stripe_customer_id = (row["stripe_customer_id"] or "").strip()

    success_url, cancel_url = _success_and_cancel_urls()
    form: dict[str, Any] = {
        "mode": "subscription",
        "line_items[0][price]": price_id,
        "line_items[0][quantity]": "1",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": str(user_id),
        "metadata[user_id]": str(user_id),
    }
    if stripe_customer_id:
        form["customer"] = stripe_customer_id
    elif email:
        form["customer_email"] = email

    # Idempotency-Key : empêche les doubles sessions en cas de retry réseau
    idem_key = make_idempotency_key("checkout", user_id)

    data = await stripe_post(
        _STRIPE_CHECKOUT_SESSIONS,
        form,
        idempotency_key=idem_key,
        error_context="Stripe Checkout",
    )

    url = data.get("url")
    if not url or not isinstance(url, str):
        raise HTTPException(status_code=502, detail="Réponse Stripe sans URL de paiement")

    return url
