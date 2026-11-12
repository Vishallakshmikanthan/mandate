import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.core.mandate_signing import canonicalize_policy

GENESIS_HASH = "0" * 64


def normalize_ts(ts: Any) -> str:
    """Normalize datetime to consistent ISO string across all DB backends."""
    if isinstance(ts, datetime):
        if ts.tzinfo is not None:
            ts = ts.astimezone(timezone.utc).replace(tzinfo=None)
        return ts.strftime("%Y-%m-%dT%H:%M:%S.%f")
    return str(ts)


def compute_audit_hash(prev_hash: str, ts: datetime, actor: str, event: str, payload: Dict[str, Any]) -> str:
    """Compute cryptographic SHA-256 hash chaining audit records."""
    ts_str = normalize_ts(ts)
    canonical_payload = canonicalize_policy(payload) if isinstance(payload, dict) else str(payload)
    chain_input = f"{prev_hash}|{ts_str}|{actor}|{event}|{canonical_payload}"
    return hashlib.sha256(chain_input.encode("utf-8")).hexdigest()


def log_audit_event(
    db: Session,
    actor: str,
    event: str,
    payload: Dict[str, Any],
    ts: Optional[datetime] = None,
    commit: bool = True,
    max_retries: int = 5
) -> AuditLog:
    """
    Append a tamper-evident event to the cryptographic audit chain.
    If commit=False, flushes entry in current transaction without committing.
    Retries on prev_hash uniqueness conflicts to serialize concurrent writes.
    """
    if ts is None:
        ts = datetime.now(timezone.utc)

    for attempt in range(max_retries):
        sp = db.begin_nested()
        try:
            # Get the latest audit log entry to establish the chain link
            latest = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
            prev_hash = latest.hash if latest else GENESIS_HASH

            node_hash = compute_audit_hash(prev_hash, ts, actor, event, payload)

            entry = AuditLog(
                ts=ts,
                actor=actor,
                event=event,
                payload=payload,
                prev_hash=prev_hash,
                hash=node_hash
            )
            db.add(entry)
            db.flush()
            sp.commit()
            if commit:
                db.commit()
                db.refresh(entry)
            return entry
        except IntegrityError:
            sp.rollback()
            if attempt == max_retries - 1:
                raise


def verify_audit_chain(db: Session) -> Dict[str, Any]:
    """
    Verify the integrity of the audit chain from genesis to head.
    Detects any payload tampering, missing records, or hash falsification.
    """
    entries = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    if not entries:
        return {
            "valid": True,
            "total_records": 0,
            "head_hash": GENESIS_HASH,
            "verified_at": datetime.now(timezone.utc),
            "message": "Audit chain is empty. Genesis integrity intact."
        }

    expected_prev = GENESIS_HASH
    for entry in entries:
        if entry.prev_hash != expected_prev:
            return {
                "valid": False,
                "total_records": len(entries),
                "broken_link_id": entry.id,
                "verified_at": datetime.now(timezone.utc),
                "message": f"Hash chain broken at record ID {entry.id}: previous hash mismatch."
            }

        recalculated = compute_audit_hash(entry.prev_hash, entry.ts, entry.actor, entry.event, entry.payload)
        if entry.hash != recalculated:
            return {
                "valid": False,
                "total_records": len(entries),
                "broken_link_id": entry.id,
                "verified_at": datetime.now(timezone.utc),
                "message": f"Tampered record detected at ID {entry.id}: payload or hash modified."
            }

        expected_prev = entry.hash

    return {
        "valid": True,
        "total_records": len(entries),
        "head_hash": entries[-1].hash,
        "verified_at": datetime.now(timezone.utc),
        "message": f"All {len(entries)} audit events verified cryptographically."
    }
