import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.models.mandate import Mandate
from app.models.spend_ledger import SpendLedger

logger = logging.getLogger("mandate.spend_ledger")


def get_mandate_for_update(db: Session, mandate_id: str) -> Optional[Mandate]:
    """
    Acquire a row-level lock on the Mandate entity to serialize concurrent budget allocations.
    Uses SELECT ... FOR UPDATE on PostgreSQL and BEGIN IMMEDIATE on SQLite.
    """
    bind = db.get_bind()
    dialect_name = bind.dialect.name if bind else ""
    if dialect_name == "sqlite":
        try:
            db.execute(text("BEGIN IMMEDIATE"))
        except Exception:
            pass
        return db.query(Mandate).filter(Mandate.id == mandate_id).first()
    else:
        return db.query(Mandate).filter(Mandate.id == mandate_id).with_for_update().first()


def record_spend_entry(
    db: Session,
    mandate_id: str,
    intent_id: str,
    amount_minor: int,
    kind: str
) -> SpendLedger:
    """
    Record an immutable entry in the spend ledger:
    - RESERVE: hold temporary allocation for approved intent / escrow.
    - COMMIT: confirm final capture / settlement.
    - RELEASE: return unused / refunded / voided allocation to budget.
    """
    entry = SpendLedger(
        mandate_id=mandate_id,
        intent_id=intent_id,
        amount_minor=amount_minor,
        kind=kind.upper()
    )
    db.add(entry)
    db.flush()
    return entry


def get_mandate_spend_metrics(
    db: Session,
    mandate_id: str,
    now_utc: Optional[datetime] = None
) -> Dict[str, int]:
    """
    Compute real-time mandate spend metrics from the immutable ledger.
    - spent_to_date_minor: total settled (COMMIT).
    - allocated_spend_minor: total committed + active outstanding reserves.
    - rolling_24h_spend_minor: spend allocated in the last 24 hours.
    - txns_in_last_hour: count of active transactions in the last hour.
    """
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)
    one_day_ago = now_utc - timedelta(hours=24)
    one_hour_ago = now_utc - timedelta(hours=1)

    entries = db.query(SpendLedger).filter(SpendLedger.mandate_id == mandate_id).all()

    intent_reserved: Dict[str, int] = {}
    intent_committed: Dict[str, int] = {}
    intent_released: Dict[str, int] = {}
    intent_created: Dict[str, datetime] = {}

    for e in entries:
        i_id = e.intent_id
        if i_id not in intent_created or e.created_at < intent_created[i_id]:
            intent_created[i_id] = e.created_at

        if e.kind == "RESERVE":
            intent_reserved[i_id] = intent_reserved.get(i_id, 0) + e.amount_minor
        elif e.kind == "COMMIT":
            intent_committed[i_id] = intent_committed.get(i_id, 0) + e.amount_minor
        elif e.kind == "RELEASE":
            intent_released[i_id] = intent_released.get(i_id, 0) + e.amount_minor

    all_intent_ids = set(intent_reserved.keys()).union(intent_committed.keys())

    total_committed = sum(intent_committed.values())
    total_allocated = 0
    rolling_24h_spend = 0
    txns_in_last_hour = 0

    for i_id in all_intent_ids:
        r = intent_reserved.get(i_id, 0)
        c = intent_committed.get(i_id, 0)
        rel = intent_released.get(i_id, 0)

        active_reserve = max(0, r - c - rel)
        intent_total = c + active_reserve
        total_allocated += intent_total

        created_at = intent_created.get(i_id, now_utc)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        if intent_total > 0:
            if created_at >= one_day_ago:
                rolling_24h_spend += intent_total
            if created_at >= one_hour_ago:
                txns_in_last_hour += 1

    return {
        "spent_to_date_minor": total_committed,
        "allocated_spend_minor": total_allocated,
        "rolling_24h_spend_minor": rolling_24h_spend,
        "txns_in_last_hour": txns_in_last_hour,
    }

