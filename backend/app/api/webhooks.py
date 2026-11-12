import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.paypal.webhooks import verify_paypal_webhook_signature
from app.models.webhook import WebhookEvent
from app.models.escrow import Escrow
from app.schemas.escrow import EscrowState
from app.core.escrow_machine import transition_escrow_state
from app.core.telemetry import metrics

logger = logging.getLogger("mandate.webhooks")
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def resolve_escrow_from_webhook(db: Session, event_type: str, resource: Dict[str, Any]) -> Optional[Escrow]:
    """
    Resolve the matching escrow contract per PayPal event type.
    - CHECKOUT.ORDER.APPROVED -> resource.id
    - Authorization & Capture events -> related order_id in resource.supplementary_data.related_ids,
      falling back to matching authorization_id / capture_id / custom_id.
    """
    supp = resource.get("supplementary_data")
    related_ids = supp.get("related_ids", {}) if isinstance(supp, dict) else {}

    order_id = None
    authorization_id = None
    capture_id = None

    if event_type.startswith("CHECKOUT.ORDER."):
        order_id = resource.get("id")
    else:
        order_id = related_ids.get("order_id")

    if event_type.startswith("PAYMENT.AUTHORIZATION."):
        authorization_id = resource.get("id")
    else:
        authorization_id = related_ids.get("authorization_id")

    if event_type.startswith("PAYMENT.CAPTURE."):
        capture_id = resource.get("id")
    else:
        capture_id = related_ids.get("capture_id")

    # 1. Match by Order ID
    if order_id:
        e = db.query(Escrow).filter(Escrow.paypal_order_id == order_id).first()
        if e:
            return e

    # 2. Match by Authorization ID
    if authorization_id:
        e = db.query(Escrow).filter(Escrow.paypal_authorization_id == authorization_id).first()
        if e:
            return e

    # 3. Match by Capture ID
    if capture_id:
        e = db.query(Escrow).filter(Escrow.paypal_capture_id == capture_id).first()
        if e:
            return e

    # 4. Fallback: custom_id or invoice_id
    custom_id = resource.get("custom_id") or resource.get("invoice_id")
    if custom_id:
        e = db.query(Escrow).filter((Escrow.id == custom_id) | (Escrow.intent_id == custom_id)).first()
        if e:
            return e

    return None


@router.post("/paypal")
async def handle_paypal_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle PayPal incoming webhook notifications.
    Verifies signature, dedupes event ID, resolves escrow,
    and updates state in a single atomic transaction.
    """
    try:
        raw_body: Dict[str, Any] = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON body")

    headers = dict(request.headers)

    # 1. Verify PayPal signature (fail-closed)
    is_valid = await verify_paypal_webhook_signature(headers, raw_body)
    if not is_valid:
        logger.warning("Rejected unverified PayPal webhook.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    event_id = raw_body.get("id")
    event_type = raw_body.get("event_type")
    if not event_id or not event_type:
        raise HTTPException(status_code=400, detail="Missing required event fields")

    # 2. Check deduplication
    existing_event = db.query(WebhookEvent).filter(WebhookEvent.event_id == event_id).first()
    if existing_event and existing_event.status == "PROCESSED":
        logger.info("Ignoring duplicate webhook event ID: %s", event_id)
        metrics.record_webhook(event_type, "duplicate")
        return {"status": "DUPLICATE_IGNORED", "event_id": event_id}

    if not existing_event:
        webhook_record = WebhookEvent(
            event_id=event_id,
            type=event_type,
            payload=raw_body,
            status="RECEIVED"
        )
        db.add(webhook_record)
        db.flush()
    else:
        webhook_record = existing_event

    resource = raw_body.get("resource", {})
    escrow = resolve_escrow_from_webhook(db, event_type, resource)

    # 3. State reconciliation within single transaction
    try:
        if escrow:
            if event_type == "CHECKOUT.ORDER.APPROVED":
                if escrow.state == EscrowState.ORDER_CREATED.value:
                    await transition_escrow_state(
                        db=db,
                        escrow=escrow,
                        new_state=EscrowState.BUYER_APPROVED.value,
                        actor="paypal",
                        reason="PayPal webhook: Buyer approved order."
                    )
            elif event_type == "PAYMENT.AUTHORIZATION.CREATED":
                auth_id = resource.get("id")
                if auth_id:
                    escrow.paypal_authorization_id = auth_id
                if resource.get("expiration_time"):
                    try:
                        exp_str = resource["expiration_time"].replace("Z", "+00:00")
                        escrow.hold_expires_at = datetime.fromisoformat(exp_str)
                    except Exception:
                        pass
                if escrow.state in (EscrowState.ORDER_CREATED.value, EscrowState.BUYER_APPROVED.value):
                    await transition_escrow_state(
                        db=db,
                        escrow=escrow,
                        new_state=EscrowState.FUNDS_HELD.value,
                        actor="paypal",
                        reason=f"PayPal webhook: Authorization created ({auth_id}).",
                        metadata=resource
                    )
            elif event_type == "PAYMENT.AUTHORIZATION.VOIDED":
                if escrow.state in (
                    EscrowState.FUNDS_HELD.value,
                    EscrowState.BUYER_APPROVED.value,
                    EscrowState.UNDER_ARBITRATION.value
                ):
                    await transition_escrow_state(
                        db=db,
                        escrow=escrow,
                        new_state=EscrowState.REFUNDED.value,
                        actor="paypal",
                        reason="PayPal webhook: Authorization voided."
                    )
            elif event_type == "PAYMENT.CAPTURE.COMPLETED":
                cap_id = resource.get("id")
                if cap_id:
                    escrow.paypal_capture_id = cap_id
                if escrow.state in (
                    EscrowState.FUNDS_HELD.value,
                    EscrowState.DELIVERED.value,
                    EscrowState.UNDER_ARBITRATION.value
                ):
                    await transition_escrow_state(
                        db=db,
                        escrow=escrow,
                        new_state=EscrowState.RELEASED.value,
                        actor="paypal",
                        reason="PayPal webhook: Capture completed."
                    )
            elif event_type == "PAYMENT.CAPTURE.DENIED":
                if escrow.state not in (
                    EscrowState.RELEASED.value,
                    EscrowState.REFUNDED.value,
                    EscrowState.BLOCKED.value
                ):
                    await transition_escrow_state(
                        db=db,
                        escrow=escrow,
                        new_state=EscrowState.NEEDS_HUMAN.value,
                        actor="paypal",
                        reason="PayPal webhook: Capture denied. Human review required."
                    )

        # Mark event as PROCESSED in the same transaction
        webhook_record.status = "PROCESSED"
        webhook_record.processed_at = datetime.now(timezone.utc)
        webhook_record.error_message = None
        db.commit()
        metrics.record_webhook(event_type, "processed")

    except Exception as exc:
        db.rollback()
        metrics.record_webhook(event_type, "failed")
        # Record failure state so retry can be traced
        try:
            fail_event = db.query(WebhookEvent).filter(WebhookEvent.event_id == event_id).first()
            if not fail_event:
                fail_event = WebhookEvent(
                    event_id=event_id,
                    type=event_type,
                    payload=raw_body,
                    status="FAILED",
                    error_message=str(exc)[:500]
                )
                db.add(fail_event)
            else:
                fail_event.status = "FAILED"
                fail_event.error_message = str(exc)[:500]
            db.commit()
        except Exception:
            db.rollback()

        logger.error("Error processing webhook %s: %s", event_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing error: {str(exc)}"
        )

    return {"status": "PROCESSED", "event_id": event_id, "event_type": event_type}
