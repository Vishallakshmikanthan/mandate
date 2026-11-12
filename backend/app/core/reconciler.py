import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.escrow import Escrow
from app.schemas.escrow import EscrowState
from app.core.escrow_machine import transition_escrow_state
from app.paypal.client import get_paypal_client
from app.paypal.orders import authorize_paypal_order

logger = logging.getLogger("mandate.reconciler")


async def reconcile_stuck_escrows(
    db: Session,
    max_age_minutes: int = 15
) -> List[Dict[str, Any]]:
    """
    Polls PayPal for escrows stuck in non-terminal transient states beyond max_age_minutes.
    Corrects state based on authoritative PayPal order / authorization status.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=max_age_minutes)
    stuck_escrows = db.query(Escrow).filter(
        Escrow.state.in_([
            EscrowState.ORDER_CREATED.value,
            EscrowState.BUYER_APPROVED.value
        ]),
        Escrow.updated_at <= cutoff,
        Escrow.paypal_order_id.isnot(None)
    ).all()

    client = get_paypal_client()
    results = []

    for escrow in stuck_escrows:
        try:
            if client.simulation_mode:
                continue

            order_data = await client.request("GET", f"/v2/checkout/orders/{escrow.paypal_order_id}")
            paypal_status = order_data.get("status")

            if paypal_status == "APPROVED" and escrow.state == EscrowState.ORDER_CREATED.value:
                # Order approved on PayPal: authorize and transition to FUNDS_HELD
                auth_res = await authorize_paypal_order(escrow.paypal_order_id, escrow.intent_id)
                escrow.paypal_authorization_id = auth_res["authorization_id"]
                if auth_res.get("hold_expires_at"):
                    try:
                        exp_str = auth_res["hold_expires_at"].replace("Z", "+00:00")
                        escrow.hold_expires_at = datetime.fromisoformat(exp_str)
                    except Exception:
                        pass
                db.commit()
                await transition_escrow_state(
                    db=db,
                    escrow=escrow,
                    new_state=EscrowState.FUNDS_HELD.value,
                    actor="reconciler",
                    reason="Reconciler detected APPROVED order; authorized hold to FUNDS_HELD."
                )
                results.append({"escrow_id": escrow.id, "reconciled_to": "FUNDS_HELD"})
            elif paypal_status == "VOIDED":
                await transition_escrow_state(
                    db=db,
                    escrow=escrow,
                    new_state=EscrowState.REFUNDED.value,
                    actor="reconciler",
                    reason="Reconciler detected VOIDED order on PayPal."
                )
                results.append({"escrow_id": escrow.id, "reconciled_to": "REFUNDED"})
        except Exception as exc:
            logger.error("Reconciler failed for escrow %s: %s", escrow.id, exc)

    return results

