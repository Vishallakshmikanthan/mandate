import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.escrow import Escrow
from app.schemas.escrow import EscrowState
from app.core.escrow_machine import transition_escrow_state
from app.core.spend_ledger import record_spend_entry
from app.paypal.orders import void_paypal_authorization
from app.core.stream_broadcaster import emit_timeline_event

logger = logging.getLogger("mandate.expiry")

# ==============================================================================
# PayPal Authorization Validity Reference:
# - Honor Period: Guaranteed 3 days from authorization creation.
# - Total Validity Period: Maximum 29 days from creation.
# - If an authorization hold is not captured within 29 days, PayPal expires it.
# - Checkout orders that are never approved typically expire within 3 hours.
# ==============================================================================


async def process_expired_escrows(
    db: Session,
    now: Optional[datetime] = None,
    warn_threshold_hours: int = 24
) -> List[Dict[str, Any]]:
    """
    Find escrows whose hold_expires_at has passed or is approaching.
    1. Warn on approaching expiries within warn_threshold_hours.
    2. Move expired escrows to EXPIRED state and release reserved budget in spend_ledger.
    3. Best-effort void authorization on PayPal.
    """
    current_time = now or datetime.now(timezone.utc)
    expired_results: List[Dict[str, Any]] = []

    active_states = [
        EscrowState.ORDER_CREATED.value,
        EscrowState.BUYER_APPROVED.value,
        EscrowState.FUNDS_HELD.value,
        EscrowState.DELIVERED.value,
        EscrowState.UNDER_ARBITRATION.value,
        EscrowState.NEEDS_HUMAN.value,
    ]

    active_escrows = db.query(Escrow).filter(
        Escrow.state.in_(active_states),
        Escrow.hold_expires_at.isnot(None)
    ).all()

    for escrow in active_escrows:
        exp_time = escrow.hold_expires_at
        if exp_time.tzinfo is None:
            exp_time = exp_time.replace(tzinfo=timezone.utc)

        # Check for expired holds
        if exp_time <= current_time:
            logger.warning(
                "Escrow %s hold expired at %s (current: %s). Transitioning to EXPIRED.",
                escrow.id, exp_time.isoformat(), current_time.isoformat()
            )
            intent = escrow.intent
            amount = intent.amount_minor if intent else 0
            mandate_id = intent.mandate_id if intent else None

            # 1. Best effort void on PayPal
            if escrow.paypal_authorization_id:
                try:
                    await void_paypal_authorization(
                        authorization_id=escrow.paypal_authorization_id,
                        intent_id=escrow.intent_id,
                        amount_minor=amount,
                        escrow_id=escrow.id,
                        db=db
                    )
                except Exception as exc:
                    logger.info("Void on expired authorization %s: %s", escrow.paypal_authorization_id, exc)

            # 2. Release reserved budget in spend ledger
            if mandate_id and intent:
                record_spend_entry(
                    db=db,
                    mandate_id=mandate_id,
                    intent_id=intent.id,
                    amount_minor=amount,
                    kind="RELEASE"
                )

            # 3. Transition to EXPIRED
            await transition_escrow_state(
                db=db,
                escrow=escrow,
                new_state=EscrowState.EXPIRED.value,
                actor="system",
                reason=f"PayPal authorization hold expired at {exp_time.isoformat()}. Funds released to buyer mandate."
            )

            await emit_timeline_event(
                event_type="ESCROW_EXPIRED",
                actor="system",
                step="Hold Expired",
                summary=f"Escrow {escrow.id} expired at {exp_time.isoformat()}. Released ${amount/100:.2f} back to mandate.",
                status="WARNING",
                data={"escrow_id": escrow.id, "amount_minor": amount, "hold_expires_at": exp_time.isoformat()}
            )

            expired_results.append({
                "escrow_id": escrow.id,
                "amount_minor": amount,
                "expired_at": exp_time.isoformat(),
                "action": "EXPIRED_AND_RELEASED"
            })

        # Check for warning threshold (approaching within warn_threshold_hours)
        elif exp_time <= current_time + timedelta(hours=warn_threshold_hours):
            remaining = exp_time - current_time
            hours_left = max(0, int(remaining.total_seconds() / 3600))
            logger.info("Escrow %s hold will expire in ~%d hours (%s).", escrow.id, hours_left, exp_time.isoformat())

    return expired_results


async def run_expiry_loop(interval_seconds: int = 60):
    """Periodic background loop checking for expired escrows every interval_seconds."""
    logger.info("Starting escrow hold expiry loop (interval=%ds)...", interval_seconds)
    while True:
        try:
            import app.db as db_mod
            with db_mod.SessionLocal() as session:
                await process_expired_escrows(session)
        except asyncio.CancelledError:
            logger.info("Escrow hold expiry background loop cancelled.")
            break
        except Exception as exc:
            logger.error("Error in escrow hold expiry loop: %s", exc, exc_info=True)

        try:
            await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            logger.info("Escrow hold expiry loop sleep cancelled.")
            break

