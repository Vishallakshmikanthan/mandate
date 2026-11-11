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
    If in simulation mode or unconfigured webhook ID, passes for testing purposes.
    """
    client = get_paypal_client()
    if client.simulation_mode or not settings.PAYPAL_WEBHOOK_ID:
        return True

    auth_algo = headers.get("paypal-auth-algo") or headers.get("PAYPAL-AUTH-ALGO")
    cert_url = headers.get("paypal-cert-url") or headers.get("PAYPAL-CERT-URL")
    transmission_id = headers.get("paypal-transmission-id") or headers.get("PAYPAL-TRANSMISSION-ID")
    transmission_sig = headers.get("paypal-transmission-sig") or headers.get("PAYPAL-TRANSMISSION-SIG")
    transmission_time = headers.get("paypal-transmission-time") or headers.get("PAYPAL-TRANSMISSION-TIME")

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
    Record webhook event and ensure strict deduplication.
    Returns True if this is a new event, False if it was already processed.
    """
    existing = db.query(WebhookEvent).filter(WebhookEvent.event_id == event_id).first()
    if existing:
        logger.info("Ignoring duplicate webhook event ID: %s", event_id)
        return False

    new_event = WebhookEvent(
        event_id=event_id,
        type=event_type,
        payload=payload,
        processed_at=datetime.now(timezone.utc)
    )
    db.add(new_event)
    db.commit()
    return True
