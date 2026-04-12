"""Traitement idempotent des événements Stripe — aligné SPEC-SERVICE-PAYANT-2026."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from core.db_manager import DBManager

logger = logging.getLogger(__name__)


def _parse_user_id(session: dict[str, Any]) -> int | None:
    """Résout l’utilisateur interne depuis metadata.user_id ou client_reference_id."""
    meta = session.get("metadata") or {}
    if isinstance(meta, dict):
        raw = meta.get("user_id")
        if raw is not None and str(raw).strip().isdigit():
            return int(str(raw).strip())
    cref = session.get("client_reference_id")
    if cref is not None and str(cref).strip().isdigit():
        return int(str(cref).strip())
    return None


def _map_price_to_plan(price_id: str) -> str | None:
    """Mappe un Price ID Stripe vers un plan_tier interne."""
    if not price_id:
        return None
    if price_id == Config.STRIPE_PRICE_STARTER_9:
        return "starter_9"
    if price_id == Config.STRIPE_PRICE_PRO_19:
        return "pro_19"
    if price_id == Config.STRIPE_PRICE_ELITE_29:
        return "elite_29"
    if price_id == Config.STRIPE_PRICE_ID:
        return "starter_9"  # Fallback legacy
    return None


async def _handle_checkout_session_completed(conn: Any, session: dict[str, Any]) -> None:
    user_id = _parse_user_id(session)
    customer = session.get("customer")
    subscription = session.get("subscription")
    if not user_id:
        logger.warning(
            "checkout.session.completed sans user_id (metadata.user_id / client_reference_id) — ignoré"
        )
        return
    if not customer:
        logger.warning("checkout.session.completed sans customer — user_id=%s", user_id)
        return

    cust = str(customer).strip()
    sub = str(subscription).strip() if subscription else None
    status = "active" if subscription else None

    row = await conn.fetchrow(
        """
        UPDATE users SET
            stripe_customer_id = $1::text,
            stripe_subscription_id = COALESCE($2::text, stripe_subscription_id),
            subscription_status = COALESCE($3::text, subscription_status),
            updated_at = NOW()
        WHERE id = $4::bigint
        RETURNING id
        """,
        cust,
        sub,
        status,
        user_id,
    )
    if row is None:
        logger.warning(
            "checkout.session.completed : aucun user id=%s (inexistant ou autre filtre)",
            user_id,
        )


async def _handle_subscription(conn: Any, sub: dict[str, Any]) -> None:
    sub_id = sub.get("id")
    customer_id = sub.get("customer")
    status = sub.get("status")
    cpe = sub.get("current_period_end")
    if not sub_id or not customer_id:
        logger.warning("subscription event incomplet — ignoré")
        return

    sid = str(sub_id).strip()
    cust = str(customer_id).strip()
    st = str(status).strip() if status else None

    period_end: datetime | None = None
    if cpe is not None:
        try:
            ts = float(cpe)
            period_end = datetime.fromtimestamp(ts, tz=UTC)
        except (TypeError, ValueError, OSError):
            period_end = None

    # 2026 fix : match priorisé (plus spécifique d'abord), évite le OR dangereux
    # Récupération du plan via le Price ID du premier item de l'abonnement
    items = sub.get("items", {}).get("data", [])
    new_plan = None
    if items:
        price_id = items[0].get("price", {}).get("id")
        new_plan = _map_price_to_plan(price_id)

    row = await conn.fetchrow(
        """
        UPDATE users SET
            stripe_subscription_id = $1::text,
            stripe_customer_id = COALESCE(stripe_customer_id, $2::text),
            subscription_status = $3::text,
            subscription_current_period_end = $4::timestamptz,
            plan_tier = COALESCE($5::text, plan_tier),
            updated_at = NOW()
        WHERE stripe_subscription_id = $1::text
        RETURNING id
        """,
        sid,
        cust,
        st,
        period_end,
        new_plan,
    )
    if row is None:
        # Fallback par customer_id (premier abonnement, sub_id pas encore stocké)
        row = await conn.fetchrow(
            """
            UPDATE users SET
                stripe_subscription_id = $1::text,
                stripe_customer_id = $2::text,
                subscription_status = $3::text,
                subscription_current_period_end = $4::timestamptz,
                updated_at = NOW()
            WHERE stripe_customer_id = $2::text
            RETURNING id
            """,
            sid,
            cust,
            st,
            period_end,
        )
        if row:
            logger.info(
                "Subscription match par customer_id fallback : user_id=%s customer=%s",
                row["id"], cust,
            )
    if row is None:
        logger.warning(
            "Aucun user pour subscription customer=%s sub=%s — "
            "vérifier checkout (metadata.user_id) ou client_reference_id",
            cust,
            sid,
        )


async def _handle_invoice_paid(conn: Any, invoice: dict[str, Any]) -> None:
    customer_id = invoice.get("customer")
    if not customer_id:
        return
    cust = str(customer_id).strip()
    row = await conn.fetchrow(
        """
        UPDATE users SET
            subscription_status = 'active',
            updated_at = NOW()
        WHERE stripe_customer_id = $1::text
        RETURNING id
        """,
        cust,
    )
    if row is None:
        logger.warning("invoice.paid : aucun user pour customer=%s", cust)


async def _handle_invoice_payment_failed(conn: Any, invoice: dict[str, Any]) -> None:
    customer_id = invoice.get("customer")
    if not customer_id:
        return
    cust = str(customer_id).strip()
    await conn.execute(
        """
        UPDATE users SET
            subscription_status = 'past_due',
            updated_at = NOW()
        WHERE stripe_customer_id = $1::text
        """,
        cust,
    )


async def dispatch_stripe_event(conn: Any, payload: dict[str, Any]) -> str:
    """
    Traite l’événement dans une transaction déjà ouverte (après claim idempotence).

    Retourne une étiquette courte pour les logs : ``checkout``, ``subscription``, ``invoice``, ``noop``.
    """
    event_type = payload.get("type") or ""
    data_obj = (payload.get("data") or {}).get("object")
    if not isinstance(data_obj, dict):
        return "noop"

    if event_type == "checkout.session.completed":
        await _handle_checkout_session_completed(conn, data_obj)
        return "checkout"
    if event_type.startswith("customer.subscription."):
        await _handle_subscription(conn, data_obj)
        return "subscription"
    if event_type == "invoice.paid":
        await _handle_invoice_paid(conn, data_obj)
        return "invoice"
    if event_type == "invoice.payment_failed":
        await _handle_invoice_payment_failed(conn, data_obj)
        return "invoice_failed"
    logger.info("Événement Stripe non géré (ignoré) : %s", event_type)
    return "noop"


async def handle_stripe_webhook_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Idempotence + dispatch. À appeler après vérification de signature.

    Retour dict avec clés : duplicate, received, processed, detail, kind.
    """
    event_id = payload.get("id")
    if not event_id or not isinstance(event_id, str):
        return {
            "duplicate": False,
            "received": False,
            "processed": False,
            "detail": "Payload Stripe invalide : id d’événement manquant",
            "kind": "error",
        }

    pool = await DBManager.get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """
                INSERT INTO stripe_webhook_events (event_id)
                VALUES ($1::text)
                ON CONFLICT (event_id) DO NOTHING
                RETURNING event_id
                """,
                event_id,
            )
            if row is None:
                return {
                    "duplicate": True,
                    "received": True,
                    "processed": False,
                    "detail": "Événement déjà traité (idempotence)",
                    "kind": "duplicate",
                }

            kind = await dispatch_stripe_event(conn, payload)
            return {
                "duplicate": False,
                "received": True,
                "processed": True,
                "detail": f"Événement traité ({kind})",
                "kind": kind,
            }
