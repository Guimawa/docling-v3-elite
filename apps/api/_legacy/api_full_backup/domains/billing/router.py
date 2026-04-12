"""Routes facturation — webhook Stripe (signature vérifiée, traitement idempotent)."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from core.config import Config
from domains.billing.stripe_checkout_service import create_checkout_session_url
from domains.billing.stripe_portal_service import create_billing_portal_url
from domains.billing.stripe_signature import verify_stripe_signature
from domains.billing.stripe_webhook_service import handle_stripe_webhook_payload
from domains.shared.dependencies import get_current_user, user_id_from_auth_payload
from domains.shared.state import GUEST_USER_EMAIL

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])


class CheckoutSessionResponse(BaseModel):
    """URL hébergée Stripe pour rediriger le navigateur."""

    url: str = Field(..., min_length=8, description="URL absolue Stripe Checkout")


class PortalSessionResponse(BaseModel):
    """URL hébergée Stripe Customer Portal."""

    url: str = Field(..., min_length=8, description="URL absolue portail client Stripe")


class CheckoutBody(BaseModel):
    plan_tier: str = Field(default="starter_9", pattern="^(starter_9|pro_19|elite_29)$")


@router.post("/checkout-session", response_model=CheckoutSessionResponse)
async def post_checkout_session(
    body: CheckoutBody, user: dict = Depends(get_current_user)
) -> CheckoutSessionResponse:
    """
    Crée une session Stripe Checkout (abonnement).
    Prend le ``plan_tier`` souhaité (starter_9, pro_19, elite_29).
    """
    # ... checks ...
    uid = user_id_from_auth_payload(user)
    if uid is None:
        raise HTTPException(status_code=403, detail="Identité requise")
    
    url = await create_checkout_session_url(uid, plan_tier=body.plan_tier)
    return CheckoutSessionResponse(url=url)


@router.post("/portal-session", response_model=PortalSessionResponse)
async def post_portal_session(user: dict = Depends(get_current_user)) -> PortalSessionResponse:
    """
    Crée une session du portail client Stripe (facturation, moyen de paiement, annulation).
    Nécessite un ``stripe_customer_id`` (après au moins un checkout réussi).
    """
    email = (user.get("email") or "").strip().lower()
    if email == GUEST_USER_EMAIL.lower():
        raise HTTPException(
            status_code=403,
            detail="Connexion requise pour gérer l’abonnement (compte invité non éligible).",
        )
    uid = user_id_from_auth_payload(user)
    if uid is None:
        raise HTTPException(
            status_code=403,
            detail="Identité utilisateur requise pour le portail",
        )
    url = await create_billing_portal_url(uid)
    return PortalSessionResponse(url=url)


@router.post("/webhook")
async def stripe_webhook(request: Request) -> JSONResponse:
    """Réception événements Stripe — vérifie Stripe-Signature ; traitement métier ensuite."""
    secret = (Config.STRIPE_WEBHOOK_SECRET or "").strip()
    if not secret:
        return JSONResponse(
            status_code=503,
            content={
                "detail": "STRIPE_WEBHOOK_SECRET non défini — webhook désactivé",
            },
        )
    raw = await request.body()
    sig_header = (
        request.headers.get("stripe-signature") or request.headers.get("Stripe-Signature") or ""
    )

    try:
        verify_stripe_signature(raw, sig_header, secret)
    except ValueError as e:
        logger.warning("Webhook Stripe rejeté : %s", e)
        return JSONResponse(status_code=400, content={"detail": str(e)})

    try:
        payload = json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        return JSONResponse(
            status_code=400,
            content={"detail": f"Corps JSON invalide : {e}"},
        )

    try:
        result = await handle_stripe_webhook_payload(payload)
    except Exception:
        logger.exception("Erreur traitement webhook Stripe")
        return JSONResponse(
            status_code=500,
            content={"detail": "Erreur serveur lors du traitement du webhook"},
        )

    event_id = payload.get("id")
    event_type = payload.get("type", "")
    logger.info(
        "Webhook Stripe OK : event_id=%s type=%s kind=%s duplicate=%s",
        event_id,
        event_type,
        result.get("kind"),
        result.get("duplicate"),
    )

    # 2026 best practice : réponse minimale, debug dans les logs uniquement
    return JSONResponse(status_code=200, content={"received": True})
