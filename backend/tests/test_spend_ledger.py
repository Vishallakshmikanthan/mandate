import asyncio
import pytest
import concurrent.futures
from datetime import datetime, timezone, timedelta
from app.models.mandate import Mandate
from app.models.escrow import Escrow
from app.core.mandate_signing import sign_policy
from app.core.spend_ledger import get_mandate_spend_metrics
from app.config import settings


def create_budget_mandate(db_session, total_budget_minor=20000, per_txn_minor=5000):
    policy = {
        "version": 1,
        "currency": "USD",
        "max_total_minor": total_budget_minor,       # $200.00
        "max_per_transaction_minor": per_txn_minor, # $50.00
        "daily_limit_minor": total_budget_minor,
        "allowed_merchant_categories": ["freelance_design"],
        "allowed_counterparties": ["seller_agent_acme"],
        "blocked_counterparties": [],
        "allowed_hours_utc": {"start": "00:00", "end": "23:59"},
        "velocity": {"max_txns_per_hour": 50},
        "escalate_above_minor": 15000,
        "require_escrow": True,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat().replace("+00:00", "Z")
    }
    sig = sign_policy(policy, settings.MANDATE_SIGNING_KEY)
    mandate = Mandate(
        owner_id="owner_budget_test",
        agent_id="buyer_agent_beta",
        policy=policy,
        signature=sig,
        status="ACTIVE",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db_session.add(mandate)
    db_session.commit()
    db_session.refresh(mandate)
    return mandate


@pytest.mark.asyncio
async def test_concurrent_intents_respect_budget_cap(client, db_session):
    # Total budget $200 (20000 minor units).
    # Each intent is $50 (5000 minor units).
    # Exactly 4 intents (4 * 50 = $200) can be approved; the other 16 must be blocked.
    mandate = create_budget_mandate(db_session, total_budget_minor=20000, per_txn_minor=5000)

    import httpx
    from app.main import app

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        async def submit_intent(i):
            payload = {
                "mandate_id": mandate.id,
                "counterparty": "seller_agent_acme",
                "merchant_category": "freelance_design",
                "amount_minor": 5000,
                "currency": "USD",
                "description": f"Design service task {i}"
            }
            return await ac.post("/api/intents", json=payload)

        responses = await asyncio.gather(*[submit_intent(i) for i in range(20)])

    decisions = [r.json().get("decision") for r in responses]

    approved_count = decisions.count("APPROVED")
    blocked_count = decisions.count("BLOCKED")

    assert approved_count == 4
    assert blocked_count == 16

    # Verify metrics from ledger
    metrics = get_mandate_spend_metrics(db_session, mandate.id)
    assert metrics["allocated_spend_minor"] == 20000


def test_voiding_escrow_frees_budget(client, db_session):
    # Mandate with $100 budget
    mandate = create_budget_mandate(db_session, total_budget_minor=10000, per_txn_minor=10000)

    # 1. First intent of $100 consumes the entire budget
    payload1 = {
        "mandate_id": mandate.id,
        "counterparty": "seller_agent_acme",
        "merchant_category": "freelance_design",
        "amount_minor": 10000,
        "currency": "USD",
        "description": "Full budget intent"
    }
    r1 = client.post("/api/intents", json=payload1)
    assert r1.status_code == 201
    assert r1.json()["decision"] == "APPROVED"
    escrow_id = r1.json()["escrow_id"]

    # 2. Second intent of $50 is blocked due to budget cap
    payload2 = {
        "mandate_id": mandate.id,
        "counterparty": "seller_agent_acme",
        "merchant_category": "freelance_design",
        "amount_minor": 5000,
        "currency": "USD",
        "description": "Excess intent"
    }
    r2 = client.post("/api/intents", json=payload2)
    assert r2.status_code == 201
    assert r2.json()["decision"] == "BLOCKED"

    # 3. Deliver deliverable so escrow is delivered, then reject via human-decision (voids hold)
    client.post(f"/api/escrows/{escrow_id}/approval-return")
    client.post(f"/api/escrows/{escrow_id}/deliver", json={"content_ref": "https://bad.deliverable.com"})
    reject_res = client.post(f"/api/escrows/{escrow_id}/human-decision", json={"action": "REJECT", "notes": "Unsatisfactory"})
    assert reject_res.status_code == 200
    assert reject_res.json()["state"] == "REFUNDED"

    # 4. Now budget is freed! Second intent of $50 should now succeed!
    r3 = client.post("/api/intents", json=payload2)
    assert r3.status_code == 201
    assert r3.json()["decision"] == "APPROVED"


def test_human_approved_escalation_consumes_budget(client, db_session):
    # Budget $300, escalate above $100 (10000)
    mandate = create_budget_mandate(db_session, total_budget_minor=30000, per_txn_minor=25000)

    # Submit intent of $180 -> exceeds escalation threshold $100 -> ESCALATED
    payload = {
        "mandate_id": mandate.id,
        "counterparty": "seller_agent_acme",
        "merchant_category": "freelance_design",
        "amount_minor": 18000,
        "currency": "USD",
        "description": "High value design package"
    }
    resp = client.post("/api/intents", json=payload)
    assert resp.status_code == 201
    assert resp.json()["decision"] == "ESCALATED"
    escrow_id = resp.json()["escrow_id"]

    # Before human approval, budget is NOT yet consumed
    metrics_before = get_mandate_spend_metrics(db_session, mandate.id)
    assert metrics_before["allocated_spend_minor"] == 0

    # Human approves escalation
    app_res = client.post(f"/api/escrows/{escrow_id}/human-decision", json={"action": "APPROVE", "notes": "Approved by supervisor"})
    assert app_res.status_code == 200
    assert app_res.json()["state"] == "ORDER_CREATED"

    # Now budget is consumed by the approved escalation
    metrics_after = get_mandate_spend_metrics(db_session, mandate.id)
    assert metrics_after["allocated_spend_minor"] == 18000

    # UI mandate view reflects the consumed budget
    mandate_view = client.get(f"/api/mandates/{mandate.id}").json()
    assert mandate_view["remaining_budget_minor"] == 12000
