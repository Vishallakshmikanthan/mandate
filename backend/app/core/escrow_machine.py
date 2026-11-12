import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Set
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.models.escrow import Escrow
from app.schemas.escrow import EscrowState
from app.core.audit import log_audit_event
from app.core.stream_broadcaster import emit_timeline_event

logger = logging.getLogger("mandate.escrow_machine")


class InvalidStateTransitionError(Exception):
    """Raised when an illegal transition is attempted on an escrow entity."""
    pass


def get_escrow_for_update(db: Session, escrow_id: str) -> Optional[Escrow]:
    """
    Acquire a row-level lock on the escrow record.
    Uses SELECT ... FOR UPDATE on PostgreSQL and BEGIN IMMEDIATE on SQLite.
    """
    bind = db.get_bind()
    dialect_name = bind.dialect.name if bind else ""
    if dialect_name == "sqlite":
        try:
            db.execute(text("BEGIN IMMEDIATE"))
        except Exception:
            pass
        return db.query(Escrow).filter(Escrow.id == escrow_id).first()
    else:
        return db.query(Escrow).filter(Escrow.id == escrow_id).with_for_update().first()


VALID_TRANSITIONS: Dict[str, Set[str]] = {
    EscrowState.INTENT_RECEIVED.value: {
        EscrowState.BLOCKED.value,
        EscrowState.ESCALATED.value,
        EscrowState.ORDER_CREATED.value,
    },
    EscrowState.BLOCKED.value: set(),  # Terminal
    EscrowState.ESCALATED.value: {
        EscrowState.ORDER_CREATED.value,  # Human approves
        EscrowState.BLOCKED.value,        # Human rejects
    },
    EscrowState.ORDER_CREATED.value: {
        EscrowState.BUYER_APPROVED.value,
        EscrowState.EXPIRED.value,
        EscrowState.BLOCKED.value,
    },
    EscrowState.BUYER_APPROVED.value: {
        EscrowState.FUNDS_HELD.value,
        EscrowState.EXPIRED.value,
    },
    EscrowState.FUNDS_HELD.value: {
        EscrowState.DELIVERED.value,
        EscrowState.RELEASED.value,
        EscrowState.NEEDS_HUMAN.value,
        EscrowState.REFUNDED.value,
        EscrowState.EXPIRED.value,
    },
    EscrowState.DELIVERED.value: {
        EscrowState.UNDER_ARBITRATION.value,
        EscrowState.RELEASED.value,
        EscrowState.NEEDS_HUMAN.value,
        EscrowState.REFUNDED.value,
        EscrowState.EXPIRED.value,
    },
    EscrowState.UNDER_ARBITRATION.value: {
        EscrowState.RELEASED.value,
        EscrowState.PARTIALLY_RELEASED.value,
        EscrowState.REFUNDED.value,
        EscrowState.NEEDS_HUMAN.value,
        EscrowState.EXPIRED.value,
    },
    EscrowState.NEEDS_HUMAN.value: {
        EscrowState.RELEASED.value,
        EscrowState.PARTIALLY_RELEASED.value,
        EscrowState.REFUNDED.value,
        EscrowState.EXPIRED.value,
    },
    EscrowState.RELEASED.value: set(),          # Terminal
    EscrowState.PARTIALLY_RELEASED.value: set(),# Terminal
    EscrowState.REFUNDED.value: set(),          # Terminal
    EscrowState.EXPIRED.value: set(),           # Terminal
}


async def transition_escrow_state(
    db: Session,
    escrow: Escrow,
    new_state: str,
    actor: str,
    reason: str,
    metadata: Optional[Dict[str, Any]] = None,
    scenario: Optional[str] = None,
    commit: bool = True
) -> Escrow:
    """
    Execute a validated state transition on an escrow contract.
    Atomically updates state and records to the cryptographic audit trail in a single transaction.
    """
    curr_state = escrow.state
    allowed = VALID_TRANSITIONS.get(curr_state, set())

    if new_state not in allowed:
        err_msg = f"Invalid escrow state transition from '{curr_state}' to '{new_state}'."
        logger.error(err_msg)
        raise InvalidStateTransitionError(err_msg)

    escrow.state = new_state
    escrow.updated_at = datetime.now(timezone.utc)
    escrow.version = (escrow.version or 0) + 1

    # Record to cryptographic audit chain in the same transaction
    audit_payload = {
        "escrow_id": escrow.id,
        "from_state": curr_state,
        "to_state": new_state,
        "reason": reason,
        "paypal_order_id": escrow.paypal_order_id,
        "paypal_authorization_id": escrow.paypal_authorization_id,
        "paypal_capture_id": escrow.paypal_capture_id,
        "version": escrow.version,
        "metadata": metadata or {}
    }
    log_audit_event(
        db=db,
        actor=actor,
        event=f"ESCROW_{new_state}",
        payload=audit_payload,
        commit=commit
    )

    if commit:
        db.commit()
        db.refresh(escrow)

    # Determine status color for dashboard
    status_map = {
        EscrowState.RELEASED.value: "SUCCESS",
        EscrowState.PARTIALLY_RELEASED.value: "SUCCESS",
        EscrowState.REFUNDED.value: "WARNING",
        EscrowState.BLOCKED.value: "DANGER",
        EscrowState.ESCALATED.value: "WARNING",
        EscrowState.NEEDS_HUMAN.value: "WARNING",
        EscrowState.FUNDS_HELD.value: "INFO",
    }
    event_status = status_map.get(new_state, "INFO")

    # Broadcast to live SSE stream
    await emit_timeline_event(
        scenario=scenario,
        event_type=f"ESCROW_{new_state}",
        actor=actor,
        step=f"Escrow: {new_state}",
        summary=reason,
        status=event_status,
        data={
            "escrow_id": escrow.id,
            "from_state": curr_state,
            "to_state": new_state,
            "paypal_order_id": escrow.paypal_order_id,
            "paypal_authorization_id": escrow.paypal_authorization_id,
            "paypal_capture_id": escrow.paypal_capture_id
        }
    )

    return escrow
