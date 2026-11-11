import logging
from typing import Dict, Any
from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.paypal.webhooks import verify_paypal_webhook_signature, record_webhook_event
from app.models.escrow import Escrow
from app.schemas.escrow import EscrowState
from app.core.escrow_machine import transition_escrow_state

logger = logging.getLogger("mandate.webhooks")
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/paypal")
async def handle_paypal_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle PayPal incoming webhook notifications.
    Verifies signature, dedupes event ID, and reconciles escrow state.
    """
    try:
        raw_body: Dict[str, Any] = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON body")

    headers = dict(request.headers)

    # 1. Verify PayPal signature
    is_valid = await verify_paypal_webhook_signature(headers, raw_body)
    if not is_valid:
        logger.warning("Rejected unverified PayPal webhook.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    event_id = raw_body.get("id")
    event_type = raw_body.get("event_type")
    if not event_id or not event_type:
        raise HTTPException(status_code=400, detail="Missing required event fields")

    # 2. Deduplicate event
    is_new = record_webhook_event(db, event_id, event_type, raw_body)
    if not is_new:
        return {"status": "DUPLICATE_IGNORED", "event_id": event_id}

    # 3. State reconciliation
    resource = raw_body.get("resource", {})
    custom_id = resource.get("custom_id") or resource.get("invoice_id")
    order_id = resource.get("id") if "checkout" in event_type.lower() else None

    # Locate escrow contract if possible
    escrow = None
    if order_id:
        escrow = db.query(Escrow).filter(Escrow.paypal_order_id == order_id).first()

    if escrow:
        if event_type == "CHECKOUT.ORDER.APPROVED" and escrow.state == EscrowState.ORDER_CREATED.value:
            await transition_escrow_state(
                db=db,
                escrow=escrow,
                new_state=EscrowState.BUYER_APPROVED.value,
                actor="paypal",
                reason="PayPal webhook: Buyer approved order."
            )
        elif event_type == "PAYMENT.AUTHORIZATION.CREATED" and escrow.state == EscrowState.BUYER_APPROVED.value:
            auth_id = resource.get("id")
            escrow.paypal_authorization_id = auth_id
            db.commit()
            await transition_escrow_state(
                db=db,
                escrow=escrow,
                new_state=EscrowState.FUNDS_HELD.value,
                actor="paypal",
                reason=f"PayPal webhook: Authorization created ({auth_id})."
            )

    return {"status": "PROCESSED", "event_id": event_id, "event_type": event_type}
