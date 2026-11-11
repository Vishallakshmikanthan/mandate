import pytest
from app.core.audit import log_audit_event, verify_audit_chain, GENESIS_HASH
from app.models.audit import AuditLog


def test_audit_log_chaining_and_tamper_detection(db_session):
    # Empty audit log
    empty_res = verify_audit_chain(db_session)
    assert empty_res["valid"] is True
    assert empty_res["total_records"] == 0

    # Append 3 valid events
    e1 = log_audit_event(db_session, "human", "MANDATE_CREATED", {"budget": 50000})
    assert e1.prev_hash == GENESIS_HASH

    e2 = log_audit_event(db_session, "gateway", "INTENT_APPROVED", {"amount": 12000})
    assert e2.prev_hash == e1.hash

    e3 = log_audit_event(db_session, "paypal", "FUNDS_HELD", {"order_id": "ORD-123"})
    assert e3.prev_hash == e2.hash

    # Verify chain integrity
    verify_res = verify_audit_chain(db_session)
    assert verify_res["valid"] is True
    assert verify_res["total_records"] == 3
    assert verify_res["head_hash"] == e3.hash

    # Tampering test: Attacker modifies payload of e2
    e2.payload = {"amount": 90000}  # Altered!
    db_session.commit()

    tampered_res = verify_audit_chain(db_session)
    assert tampered_res["valid"] is False
    assert tampered_res["broken_link_id"] == e2.id
    assert "Tampered record detected" in tampered_res["message"]
