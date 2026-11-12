import pytest
import concurrent.futures
from unittest.mock import AsyncMock, patch
from app.models.escrow import Escrow
from app.models.intent import PaymentIntent
from app.models.deliverable import Deliverable
from app.core.audit import verify_audit_chain, log_audit_event
from app.schemas.escrow import ArbiterVerdictOutput, CriterionResult


def test_double_deliver_returns_409(client, sample_mandate, db_session):
    intent = PaymentIntent(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="freelance_design",
        amount_minor=10000,
        currency="USD",
        description="Delivery locking test",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    escrow = Escrow(
        intent_id=intent.id,
        state="FUNDS_HELD",
        paypal_authorization_id="AUTH-DELIVER-TEST"
    )
    db_session.add(escrow)
    db_session.commit()

    payload = {"content_ref": "https://assets.example.com/logo.svg", "submission_notes": "First submission"}

    # First deliver -> 200 OK
    resp1 = client.post(f"/api/escrows/{escrow.id}/deliver", json=payload)
    assert resp1.status_code == 200
    assert resp1.json()["state"] == "DELIVERED"

    # Second deliver on already DELIVERED escrow -> 409 Conflict
    resp2 = client.post(f"/api/escrows/{escrow.id}/deliver", json=payload)
    assert resp2.status_code == 409
    assert "expected 'FUNDS_HELD'" in resp2.json()["detail"]


def test_invalid_human_decision_state_returns_409(client, sample_mandate, db_session):
    intent = PaymentIntent(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="freelance_design",
        amount_minor=5000,
        currency="USD",
        description="Human decision lock test",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    escrow = Escrow(
        intent_id=intent.id,
        state="RELEASED",
        paypal_capture_id="CAP-SETTLED"
    )
    db_session.add(escrow)
    db_session.commit()

    resp = client.post(f"/api/escrows/{escrow.id}/human-decision", json={"action": "APPROVE"})
    assert resp.status_code == 409
    assert "Cannot approve escrow in state RELEASED" in resp.json()["detail"]


def test_concurrent_arbitration_calls_single_capture_and_valid_audit(client, sample_mandate, db_session):
    intent = PaymentIntent(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="freelance_design",
        amount_minor=12000,
        currency="USD",
        description="Concurrency test escrow",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    escrow = Escrow(
        intent_id=intent.id,
        state="DELIVERED",
        paypal_authorization_id="AUTH-CONCURRENT-001"
    )
    db_session.add(escrow)
    db_session.commit()

    deliverable = Deliverable(
        escrow_id=escrow.id,
        content_ref="https://files.com/final_design.svg",
        submission_notes="Final deliverables"
    )
    db_session.add(deliverable)
    db_session.commit()

    mock_verdict = ArbiterVerdictOutput(
        verdict="PASS",
        confidence=0.95,
        criteria_results=[CriterionResult(criterion="Deliverable provided", met=True, evidence="SVG delivered")],
        explanation="Satisfies specification.",
        model="mock",
        prompt_version="arbiter_v1.0"
    )

    capture_count = 0

    async def mock_capture(*args, **kwargs):
        nonlocal capture_count
        capture_count += 1
        return {"capture_id": "CAP-CONCURRENT-999", "status": "COMPLETED"}

    with patch("app.api.escrows.evaluate_deliverable_arbitration", AsyncMock(return_value=mock_verdict)), \
         patch("app.api.escrows.capture_paypal_authorization", side_effect=mock_capture):

        def call_arbitrate():
            return client.post(f"/api/escrows/{escrow.id}/arbitrate")

        # Fire 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(call_arbitrate) for _ in range(10)]
            responses = [f.result() for f in futures]

        status_codes = [r.status_code for r in responses]

        # Exactly one request should succeed (200), and the remaining 9 should be rejected with 409 Conflict
        assert status_codes.count(200) == 1
        assert status_codes.count(409) == 9

        # Exactly one PayPal capture occurred
        assert capture_count == 1

        # Escrow is in single terminal state: RELEASED
        db_session.refresh(escrow)
        assert escrow.state == "RELEASED"

        # The cryptographic hash-chained audit trail remains completely valid
        audit_res = verify_audit_chain(db_session)
        assert audit_res["valid"] is True
        assert audit_res["total_records"] > 0
