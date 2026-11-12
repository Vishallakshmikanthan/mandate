import json
import logging
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.telemetry import (
    metrics,
    StructuredJsonFormatter,
    request_id_ctx,
    escrow_id_ctx,
    intent_id_ctx,
    mandate_id_ctx
)
from app.core.cost_control import (
    cost_controller,
    CostController,
    LLMCostCapExceededError,
    NegotiationTurnCapExceededError
)
from app.models.escrow import Escrow
from app.models.intent import PaymentIntent
from app.models.mandate import Mandate
from app.models.webhook import WebhookEvent
from app.models.audit import AuditLog
from app.schemas.escrow import EscrowState
from app.core.mandate_signing import sign_policy
from app.config import settings


def test_structured_json_formatter():
    formatter = StructuredJsonFormatter()
    record = logging.LogRecord(
        name="mandate.test",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Test log message",
        args=(),
        exc_info=None
    )

    # Set correlation contextvars
    token_req = request_id_ctx.set("req-12345")
    token_escrow = escrow_id_ctx.set("escrow-999")
    token_intent = intent_id_ctx.set("intent-888")
    token_mandate = mandate_id_ctx.set("mandate-777")

    try:
        formatted = formatter.format(record)
        data = json.loads(formatted)
        assert data["level"] == "INFO"
        assert data["logger"] == "mandate.test"
        assert data["message"] == "Test log message"
        assert data["request_id"] == "req-12345"
        assert data["escrow_id"] == "escrow-999"
        assert data["intent_id"] == "intent-888"
        assert data["mandate_id"] == "mandate-777"
        assert "timestamp" in data
    finally:
        request_id_ctx.reset(token_req)
        escrow_id_ctx.reset(token_escrow)
        intent_id_ctx.reset(token_intent)
        mandate_id_ctx.reset(token_mandate)


def test_telemetry_middleware_headers(client):
    # Test that custom X-Request-Id is preserved and X-Response-Time-Ms is attached
    resp = client.get("/api/health", headers={"X-Request-Id": "custom-trace-uuid-1"})
    assert resp.status_code == 200
    assert resp.headers.get("X-Request-Id") == "custom-trace-uuid-1"
    assert "X-Response-Time-Ms" in resp.headers
    dur = float(resp.headers["X-Response-Time-Ms"])
    assert dur >= 0.0

    # Test that missing X-Request-Id is automatically generated
    resp2 = client.get("/api/health")
    assert resp2.status_code == 200
    assert resp2.headers.get("X-Request-Id") is not None
    assert len(resp2.headers.get("X-Request-Id")) > 10


def test_metrics_collection_summary(client):
    # Record synthetic telemetry events
    metrics.record_decision("APPROVED")
    metrics.record_decision("BLOCKED")
    metrics.record_paypal_call("/v2/checkout/orders", 120.5, success=True)
    metrics.record_paypal_call("/v2/checkout/orders", 450.0, success=False)
    metrics.record_llm_call(latency_ms=250.0, prompt_tokens=100, completion_tokens=50, cost_cents=0.15)
    metrics.record_webhook("CHECKOUT.ORDER.APPROVED", "processed")
    metrics.record_webhook("PAYMENT.AUTHORIZATION.CREATED", "duplicate")

    resp = client.get("/api/metrics")
    assert resp.status_code == 200
    data = resp.json()

    assert data["decisions"]["APPROVED"] >= 1
    assert data["decisions"]["BLOCKED"] >= 1
    assert data["paypal"]["total_calls"] >= 2
    assert data["paypal"]["errors_total"].get("/v2/checkout/orders", 0) >= 1
    assert data["llm"]["total_calls"] >= 1
    assert data["llm"]["tokens"]["total_tokens"] >= 150
    assert data["webhooks"]["processed"] >= 1
    assert data["webhooks"]["duplicate"] >= 1


def test_alerts_endpoint_clean_state(client, db_session):
    resp = client.get("/api/alerts")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "total_active_alerts" in data
    assert "alerts" in data


def test_alerts_detection_stuck_escrows_and_expiring_holds(client, db_session, sample_mandate):
    now = datetime.now(timezone.utc)
    # Create valid intents to satisfy foreign keys
    intent1 = PaymentIntent(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="freelance_design",
        amount_minor=5000,
        currency="USD",
        description="Intent for stuck escrow test",
        decision="APPROVED",
        decision_reasons=[],
        risk_score=0.1
    )
    intent2 = PaymentIntent(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="freelance_design",
        amount_minor=6000,
        currency="USD",
        description="Intent for expiring escrow test",
        decision="APPROVED",
        decision_reasons=[],
        risk_score=0.1
    )
    db_session.add(intent1)
    db_session.add(intent2)
    db_session.commit()

    # 1. Create a stuck escrow (ORDER_CREATED > 48h ago)
    stuck_escrow = Escrow(
        intent_id=intent1.id,
        state=EscrowState.ORDER_CREATED.value,
        paypal_order_id="TEST_STUCK_ORDER",
        created_at=now - timedelta(hours=50)
    )
    # 2. Create an expiring hold (FUNDS_HELD, expires in 12 hours)
    expiring_escrow = Escrow(
        intent_id=intent2.id,
        state=EscrowState.FUNDS_HELD.value,
        paypal_authorization_id="TEST_EXPIRING_AUTH",
        hold_expires_at=now + timedelta(hours=12),
        created_at=now - timedelta(hours=2)
    )
    # 3. Create a failed webhook
    failed_webhook = WebhookEvent(
        event_id="WH_FAIL_001",
        type="PAYMENT.AUTHORIZATION.CREATED",
        payload={"dummy": True},
        status="FAILED",
        error_message="Simulation failure in processing"
    )

    db_session.add(stuck_escrow)
    db_session.add(expiring_escrow)
    db_session.add(failed_webhook)
    db_session.commit()

    try:
        resp = client.get("/api/alerts")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "warning"
        alert_ids = [a["alert_id"] for a in data["alerts"]]
        assert "ALERT_STUCK_ESCROWS" in alert_ids
        assert "ALERT_HOLD_EXPIRING_SOON" in alert_ids
        assert "ALERT_WEBHOOK_FAILURES" in alert_ids
    finally:
        db_session.delete(stuck_escrow)
        db_session.delete(expiring_escrow)
        db_session.delete(failed_webhook)
        db_session.delete(intent1)
        db_session.delete(intent2)
        db_session.commit()


def test_llm_cost_cap_controller():
    controller = CostController(default_daily_cost_cap_cents=100.0)
    mandate_id = "test-mandate-cost-1"

    # Initial spend: 30 cents -> OK
    spent = controller.check_and_record_llm_cost(mandate_id, 30.0)
    assert spent == 30.0

    # Additional 40 cents -> total 70 cents -> OK
    spent = controller.check_and_record_llm_cost(mandate_id, 40.0)
    assert spent == 70.0

    # Additional 40 cents -> total 110 cents > 100 cents -> Raises LLMCostCapExceededError
    with pytest.raises(LLMCostCapExceededError) as exc_info:
        controller.check_and_record_llm_cost(mandate_id, 40.0)
    assert "exceeded" in str(exc_info.value).lower()

    # Custom policy override cap
    custom_policy = {"daily_llm_cost_cap_cents": 200.0}
    # With higher cap, projected 70 + 40 = 110 < 200 -> OK
    spent = controller.check_and_record_llm_cost(mandate_id, 40.0, mandate_policy=custom_policy)
    assert spent == 110.0


def test_negotiation_turn_cap_controller():
    controller = CostController(default_max_turns=3)
    session_id = "agent-conv-abc"

    # Turn 1
    t1 = controller.increment_and_check_turns(session_id)
    assert t1 == 1

    # Turn 2
    t2 = controller.increment_and_check_turns(session_id)
    assert t2 == 2

    # Turn 3
    t3 = controller.increment_and_check_turns(session_id)
    assert t3 == 3

    # Turn 4 > 3 -> Raises NegotiationTurnCapExceededError
    with pytest.raises(NegotiationTurnCapExceededError) as exc_info:
        controller.increment_and_check_turns(session_id)
    assert "exceeded maximum allowable turns" in str(exc_info.value).lower()

    # Reset clears counter
    controller.reset_session(session_id)
    assert controller.increment_and_check_turns(session_id) == 1


def test_intent_daily_llm_cost_cap_enforcement(client, db_session, sample_mandate):
    from app.core.auth import create_session_token, hash_password
    from app.models.user import User

    # Ensure user exists in test DB
    user = db_session.query(User).filter(User.id == sample_mandate.owner_id).first()
    if not user:
        user = User(
            id=sample_mandate.owner_id,
            email="owner@costcontrol.com",
            password_hash=hash_password("SecurePassword123!"),
            role="USER",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()

    token = create_session_token(
        user_id=sample_mandate.owner_id,
        email="owner@costcontrol.com",
        role="USER"
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate mandate reaching its daily LLM cost cap
    day_key = cost_controller._get_day_key(sample_mandate.id)
    cost_controller._daily_costs_cents[day_key] = 10000.0  # Above default cap

    payload = {
        "mandate_id": sample_mandate.id,
        "counterparty": "seller_agent_acme",
        "merchant_category": "freelance_design",
        "amount_minor": 5000,
        "currency": "USD",
        "description": "Logo design test",
        "source_context": "Safe negotiation"
    }

    try:
        resp = client.post("/api/intents", json=payload, headers=headers)
        assert resp.status_code == 429
        data = resp.json()
        assert "daily llm cost cap" in data["detail"].lower()
    finally:
        cost_controller._daily_costs_cents.pop(day_key, None)

