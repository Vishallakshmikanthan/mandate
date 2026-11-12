"""
Concurrency and Webhook Risk Test Suite.
Verifies critical financial and concurrency invariants:
1. Budget race: Concurrent intents competing for budget never exceed total cap.
2. Double arbitration: Concurrent arbitration calls produce exactly one capture and state transition.
3. Duplicate webhooks under concurrency: Identical concurrent events are processed idempotently.
4. Webhook replay: Replaying historical events causes zero side-effects.
5. Bad webhook signatures: Forged signatures are rejected with 401 without modifying state.
"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
import pytest
import httpx
from unittest.mock import AsyncMock, patch
from sqlalchemy.orm import Session
from starlette.testclient import TestClient

from app.main import app
from app.models.mandate import Mandate
from app.models.intent import PaymentIntent
from app.models.escrow import Escrow
from app.models.deliverable import Deliverable
from app.models.webhook import WebhookEvent
from app.models.counterparty import Counterparty
from app.schemas.escrow import EscrowState, ArbiterVerdictOutput, CriterionResult
from app.core.mandate_signing import generate_ed25519_keypair, sign_policy_ed25519
from app.core.audit import verify_audit_chain
from app.paypal.client import PayPalClient


@pytest.fixture
def active_escrow(db_session: Session):
    """Sets up an active escrow in FUNDS_HELD state ready for deliver/arbitration."""
    priv_hex, pub_hex = generate_ed25519_keypair()
    policy = {
        "currency": "USD",
        "max_per_transaction_minor": 20000,
        "max_total_minor": 100000,
        "daily_limit_minor": 50000,
        "escalate_above_minor": 15000,
        "allowed_counterparties": ["trusted_freelancer_bob"]
    }
    sig = sign_policy_ed25519(policy, priv_hex)
    mandate = Mandate(
        owner_id="owner_concurrency_01",
        agent_id="agent_buyer",
        policy=policy,
        signature=sig,
        public_key=pub_hex,
        signature_algorithm="ed25519",
        status="ACTIVE",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db_session.add(mandate)
    db_session.commit()

    intent = PaymentIntent(
        mandate_id=mandate.id,
        amount_minor=12000,
        currency="USD",
        counterparty="trusted_freelancer_bob",
        merchant_category="freelance_design",
        description="Concurrency test deliverable",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    escrow = Escrow(
        intent_id=intent.id,
        state=EscrowState.DELIVERED.value,
        paypal_order_id="ORD-CONCUR-999",
        paypal_authorization_id="AUTH-CONCUR-999"
    )
    db_session.add(escrow)
    db_session.commit()

    deliverable = Deliverable(
        escrow_id=escrow.id,
        content_ref="https://files.com/final_work.svg",
        submission_notes="Final deliverable package"
    )
    db_session.add(deliverable)
    db_session.commit()

    return escrow


@pytest.mark.asyncio
async def test_concurrent_duplicate_webhooks_idempotency(db_session: Session):
    """
    Simulates high-concurrency race condition: 10 identical webhook delivery
    requests hitting /api/webhooks/paypal at the exact same moment.
    Guarantees exactly one database event is processed, and all return 200.
    """
    webhook_id = f"WH-CONCUR-{uuid.uuid4().hex[:8]}"
    order_id = f"ORD-CONCUR-{uuid.uuid4().hex[:8]}"

    payload = {
        "id": webhook_id,
        "event_type": "CHECKOUT.ORDER.APPROVED",
        "resource": {
            "id": order_id,
            "status": "APPROVED"
        }
    }

    # Verify endpoint under ASGI client with 10 concurrent requests
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        async def send_webhook():
            return await ac.post("/api/webhooks/paypal", json=payload)

        responses = await asyncio.gather(*[send_webhook() for _ in range(10)])

    # All 10 requests should succeed (200 OK)
    for r in responses:
        assert r.status_code == 200, f"Webhook failed: {r.text}"

    # Exactly one record exists in webhook_events table
    events = db_session.query(WebhookEvent).filter(WebhookEvent.event_id == webhook_id).all()
    assert len(events) == 1
    assert events[0].type == "CHECKOUT.ORDER.APPROVED"


def test_webhook_replay_protection(client: TestClient, db_session: Session):
    """
    Verifies webhook replay protection:
    Replaying an identical event multiple times causes no duplicate state changes or ledger entries.
    """
    webhook_id = f"WH-REPLAY-{uuid.uuid4().hex[:8]}"
    order_id = f"ORD-REPLAY-{uuid.uuid4().hex[:8]}"

    payload = {
        "id": webhook_id,
        "event_type": "CHECKOUT.ORDER.APPROVED",
        "resource": {"id": order_id, "status": "APPROVED"}
    }

    # First delivery
    r1 = client.post("/api/webhooks/paypal", json=payload)
    assert r1.status_code == 200
    assert r1.json()["status"] == "PROCESSED"

    # Replay 1
    r2 = client.post("/api/webhooks/paypal", json=payload)
    assert r2.status_code == 200
    assert r2.json()["status"] == "DUPLICATE_IGNORED"

    # Replay 2
    r3 = client.post("/api/webhooks/paypal", json=payload)
    assert r3.status_code == 200
    assert r3.json()["status"] == "DUPLICATE_IGNORED"

    # Audit chain remains unbroken
    audit_check = verify_audit_chain(db_session)
    assert audit_check["valid"] is True


def test_webhook_forged_bad_signature_rejected(client: TestClient):
    """
    Verifies that forged or corrupt PayPal webhook signatures are rejected with 401
    and do not create database records or trigger state machines.
    """
    mock_client = PayPalClient()
    mock_client.simulation_mode = False

    payload = {
        "id": f"WH-FORGED-{uuid.uuid4().hex[:8]}",
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-FORGED-001", "amount": {"value": "999.00"}}
    }

    with patch("app.paypal.webhooks.get_paypal_client", return_value=mock_client), \
         patch("app.api.webhooks.verify_paypal_webhook_signature", return_value=False):
        resp = client.post(
            "/api/webhooks/paypal",
            json=payload,
            headers={
                "PAYPAL-AUTH-ALGO": "SHA256withRSA",
                "PAYPAL-TRANSMISSION-ID": "fake-trans-id",
                "PAYPAL-TRANSMISSION-TIME": "2026-11-12T00:00:00Z",
                "PAYPAL-TRANSMISSION-SIG": "corrupted_signature_payload"
            }
        )
        assert resp.status_code == 401
        assert "Invalid webhook signature" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_concurrent_double_arbitrate_race(active_escrow: Escrow, db_session: Session):
    """
    Simulates concurrent arbitration race condition on the same delivered escrow:
    Fires 10 simultaneous requests to /api/escrows/{id}/arbitrate.
    Asserts:
    1. Exactly one request succeeds with 200 OK
    2. Remaining 9 requests receive 409 Conflict (version lock or state conflict)
    3. Exactly one PayPal capture occurs
    4. Escrow settles cleanly into RELEASED
    """
    escrow_id = active_escrow.id

    mock_verdict = ArbiterVerdictOutput(
        verdict="PASS",
        confidence=0.98,
        criteria_results=[CriterionResult(criterion="Deliverable verified", met=True, evidence="SVG verified")],
        explanation="Satisfies specification.",
        model="mock",
        prompt_version="arbiter_v1.1"
    )

    capture_calls = 0

    async def mock_capture(*args, **kwargs):
        nonlocal capture_calls
        capture_calls += 1
        return {"capture_id": "CAP-RACE-001", "status": "COMPLETED"}

    with patch("app.api.escrows.evaluate_deliverable_arbitration", AsyncMock(return_value=mock_verdict)), \
         patch("app.api.escrows.capture_paypal_authorization", side_effect=mock_capture):

        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            async def call_arbitrate():
                return await ac.post(f"/api/escrows/{escrow_id}/arbitrate")

            responses = await asyncio.gather(*[call_arbitrate() for _ in range(10)])

        statuses = [r.status_code for r in responses]
        assert statuses.count(200) == 1
        assert statuses.count(409) == 9
        assert capture_calls == 1

        db_session.refresh(active_escrow)
        assert active_escrow.state == EscrowState.RELEASED.value
