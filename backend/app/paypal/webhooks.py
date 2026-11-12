import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.paypal.client import get_paypal_client
from app.models.webhook import WebhookEvent

logger = logging.getLogger("mandate.webhooks")


async def verify_paypal_webhook_signature(
    headers: Dict[str, str],
    raw_body: Dict[str, Any]
) -> bool:
    """
    Verify incoming PayPal webhook signature using PayPal's verification endpoint.
    Fails closed: if not in simulation mode and PAYPAL_WEBHOOK_ID is unset,
    never returns True.
    """
    client = get_paypal_client()
    if client.simulation_mode:
        return True

    if not settings.PAYPAL_WEBHOOK_ID:
        logger.error("PAYPAL_WEBHOOK_ID is unset and not in simulation mode. Rejecting webhook.")
        return False

    # Extract headers (case-insensitive lookup)
    h_lower = {k.lower(): v for k, v in headers.items()}
    auth_algo = h_lower.get("paypal-auth-algo")
    cert_url = h_lower.get("paypal-cert-url")
    transmission_id = h_lower.get("paypal-transmission-id")
    transmission_sig = h_lower.get("paypal-transmission-sig")
    transmission_time = h_lower.get("paypal-transmission-time")

    if not all([auth_algo, cert_url, transmission_id, transmission_sig, transmission_time]):
        logger.warning("Missing required PayPal webhook verification headers.")
        return False

    payload = {
        "auth_algo": auth_algo,
        "cert_url": cert_url,
        "transmission_id": transmission_id,
        "transmission_sig": transmission_sig,
        "transmission_time": transmission_time,
        "webhook_id": settings.PAYPAL_WEBHOOK_ID,
        "webhook_event": raw_body
    }

    try:
        resp = await client.request("POST", "/v1/notifications/verify-webhook-signature", json_data=payload)
        return resp.get("verification_status") == "SUCCESS"
    except Exception as exc:
        logger.error("Failed to verify webhook signature: %s", exc)
        return False


def record_webhook_event(db: Session, event_id: str, event_type: str, payload: Dict[str, Any]) -> bool:
    """
    Record webhook event and check deduplication.
    Returns True if this event should be processed (new or retried from failed),
    False if it was already successfully processed.
    """
    existing = db.query(WebhookEvent).filter(WebhookEvent.event_id == event_id).first()
    if existing and existing.status == "PROCESSED":
        logger.info("Ignoring already processed duplicate webhook event ID: %s", event_id)
        return False

    if not existing:
        new_event = WebhookEvent(
            event_id=event_id,
            type=event_type,
            payload=payload,
            status="RECEIVED"
        )
        db.add(new_event)
        db.commit()

    return True
