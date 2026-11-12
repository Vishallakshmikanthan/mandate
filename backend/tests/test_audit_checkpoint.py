import pytest
from datetime import datetime, timezone
from app.models.audit import AuditLog
from app.core.audit import log_audit_event, verify_audit_chain, compute_audit_hash, GENESIS_HASH
from app.core.checkpoint import (
    publish_checkpoint,
    get_latest_external_checkpoint,
    verify_checkpoint_signature,
    verify_audit_against_checkpoints,
    clear_checkpoints_for_testing,
)


@pytest.fixture(autouse=True)
def clean_checkpoints():
    clear_checkpoints_for_testing()
    yield
    clear_checkpoints_for_testing()


def test_publish_and_verify_external_checkpoint(db_session):
    # Log 3 events
    for i in range(3):
        log_audit_event(db_session, actor="test", event=f"EVENT_{i}", payload={"step": i})

    chk = publish_checkpoint(db_session)
    assert chk["record_count"] == 3
    assert chk["algorithm"] == "ed25519"
    assert verify_checkpoint_signature(chk) is True

    # Verify audit chain against checkpoint
    res = verify_audit_against_checkpoints(db_session)
    assert res["valid"] is True
    assert res["checkpoint_verified"] is True
    assert res["total_records"] == 3
    assert res["external_checkpoint"]["checkpoint_id"] == chk["checkpoint_id"]


def test_database_truncation_detected_by_checkpoint(db_session):
    # Log 4 events
    for i in range(4):
        log_audit_event(db_session, actor="test", event=f"EVENT_{i}", payload={"step": i})

    # Anchor at 4 records
    publish_checkpoint(db_session)

    # Attacker drops the last 2 records
    last_two = db_session.query(AuditLog).order_by(AuditLog.id.desc()).limit(2).all()
    for e in last_two:
        db_session.delete(e)
    db_session.commit()

    # Verify: must detect truncation
    res = verify_audit_against_checkpoints(db_session)
    assert res["valid"] is False
    assert res["checkpoint_verified"] is False
    assert "Database truncation detected" in res["message"]


def test_rewriting_entire_chain_in_db_detected_by_checkpoint(db_session):
    """
    Acceptance criterion: rewriting the entire chain in the DB is detected
    by checkpoint mismatch.
    """
    # 1. Populate initial genuine audit chain
    for i in range(5):
        log_audit_event(
            db_session,
            actor="human",
            event=f"GENUINE_EVENT_{i}",
            payload={"amount": 100 * (i + 1), "authorized": True}
        )

    # 2. Publish external signed anchor checkpoint for the 5 events
    checkpoint = publish_checkpoint(db_session)
    anchor_hash = checkpoint["head_hash"]
    assert checkpoint["record_count"] == 5

    # Verify that before rewrite, chain is valid against checkpoint
    res_before = verify_audit_against_checkpoints(db_session)
    assert res_before["valid"] is True
    assert res_before["checkpoint_verified"] is True

    # 3. Adversary rewrites the ENTIRE chain in the database:
    # Deletes all legitimate records and inserts forged records with
    # newly recalculated, mathematically valid hash links from genesis.
    db_session.query(AuditLog).delete()
    db_session.commit()

    prev_h = GENESIS_HASH
    for i in range(5):
        ts = datetime(2026, 1, 1, 12, i, 0)
        actor = "adversary"
        event = f"FORGED_EVENT_{i}"
        payload = {"amount": 999999, "authorized": True, "forged": True}
        h = compute_audit_hash(prev_h, ts, actor, event, payload)
        entry = AuditLog(
            ts=ts,
            actor=actor,
            event=event,
            payload=payload,
            prev_hash=prev_h,
            hash=h
        )
        db_session.add(entry)
        prev_h = h
    db_session.commit()

    # The internal DB chain on its own looks 100% valid because hashes link cleanly:
    internal_res = verify_audit_chain(db_session)
    assert internal_res["valid"] is True, "Adversary successfully forged a mathematically continuous internal chain"

    # 4. BUT verification against the external checkpoint MUST DETECT THE REWRITE:
    res_after = verify_audit_against_checkpoints(db_session)
    assert res_after["valid"] is False
    assert res_after["checkpoint_verified"] is False
    assert "Entire chain rewrite detected" in res_after["message"]


def test_checkpoint_signature_tampering_fails(db_session):
    log_audit_event(db_session, actor="test", event="INIT", payload={})
    chk = publish_checkpoint(db_session)

    # Tamper with checkpoint payload
    tampered_chk = dict(chk)
    tampered_chk["record_count"] = 999
    assert verify_checkpoint_signature(tampered_chk) is False


def test_audit_api_checkpoint_and_verify_endpoints(client, db_session):
    # Register supervisor
    resp_reg = client.post("/api/auth/register", json={
        "email": "auditor@example.com",
        "password": "strongpassword123"
    })
    token = resp_reg.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add audit event
    log_audit_event(db_session, actor="test_user", event="MANDATE_CREATED", payload={"id": "mnd_123"})

    # Trigger checkpoint endpoint
    chk_resp = client.post("/api/audit/checkpoint", headers=headers)
    assert chk_resp.status_code == 201
    chk_data = chk_resp.json()
    assert chk_data["record_count"] >= 1
    assert "signature" in chk_data

    # Get latest checkpoint
    latest_resp = client.get("/api/audit/checkpoint/latest", headers=headers)
    assert latest_resp.status_code == 200
    assert latest_resp.json()["checkpoint_id"] == chk_data["checkpoint_id"]

    # Verify endpoint returns checkpoint verification
    verify_resp = client.get("/api/audit/verify", headers=headers)
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()
    assert verify_data["valid"] is True
    assert verify_data["checkpoint_verified"] is True
    assert verify_data["external_checkpoint"]["checkpoint_id"] == chk_data["checkpoint_id"]

