import pytest
from unittest.mock import AsyncMock, patch
from app.models.escrow import Escrow
from app.models.intent import PaymentIntent
from app.models.webhook import WebhookEvent
from app.paypal.client import PayPalClient


def create_test_escrow(db_session, sample_mandate, state="ORDER_CREATED", order_id="ORD-WH-001", auth_id=None, cap_id=None):
    intent = PaymentIntent(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="freelance_design",
        amount_minor=10000,
        currency="USD",
        description="Webhook test intent",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    escrow = Escrow(
        intent_id=intent.id,
        state=state,
        paypal_order_id=order_id,
        paypal_authorization_id=auth_id,
        paypal_capture_id=cap_id
    )
    db_session.add(escrow)
    db_session.commit()
    db_session.refresh(escrow)
    return escrow


def test_webhook_mismatched_signature_returns_401(client):
    mock_client = PayPalClient()
    mock_client.simulation_mode = False

    payload = {
        "id": "WH-INVALID-001",
        "event_type": "CHECKOUT.ORDER.APPROVED",
        "resource": {"id": "ORD-123"}
    }

    with patch("app.paypal.webhooks.get_paypal_client", return_value=mock_client), \
         patch("app.api.webhooks.verify_paypal_webhook_signature", return_value=False):
        resp = client.post("/api/webhooks/paypal", json=payload, headers={"PAYPAL-AUTH-ALGO": "SHA256withRSA"})
        assert resp.status_code == 401
        assert "Invalid webhook signature" in resp.json()["detail"]


def test_webhook_order_approved_and_deduplication(client, sample_mandate, db_session):
    escrow = create_test_escrow(db_session, sample_mandate, state="ORDER_CREATED", order_id="ORD-APPROVED-99")

    webhook_payload = {
        "id": "WH-EVT-APPROVED-001",
        "event_type": "CHECKOUT.ORDER.APPROVED",
        "resource": {
            "id": "ORD-APPROVED-99",
            "status": "APPROVED"
        }
    }

    with patch("app.api.webhooks.verify_paypal_webhook_signature", return_value=True):
        # First delivery
        resp1 = client.post("/api/webhooks/paypal", json=webhook_payload)
        assert resp1.status_code == 200
        assert resp1.json()["status"] == "PROCESSED"

        db_session.refresh(escrow)
        assert escrow.state == "BUYER_APPROVED"

        # Check webhook record status
        wh = db_session.query(WebhookEvent).filter(WebhookEvent.event_id == "WH-EVT-APPROVED-001").first()
        assert wh is not None
        assert wh.status == "PROCESSED"

        # Replay the same payload
        resp2 = client.post("/api/webhooks/paypal", json=webhook_payload)
        assert resp2.status_code == 200
        assert resp2.json()["status"] == "DUPLICATE_IGNORED"

        # State remains BUYER_APPROVED (changed once)
        db_session.refresh(escrow)
        assert escrow.state == "BUYER_APPROVED"


def test_webhook_authorization_created_using_supplementary_data(client, sample_mandate, db_session):
    escrow = create_test_escrow(db_session, sample_mandate, state="BUYER_APPROVED", order_id="ORD-AUTH-002")

    webhook_payload = {
        "id": "WH-EVT-AUTH-002",
        "event_type": "PAYMENT.AUTHORIZATION.CREATED",
        "resource": {
            "id": "AUTH-WH-222",
            "status": "CREATED",
            "expiration_time": "2026-12-25T12:00:00Z",
            "supplementary_data": {
                "related_ids": {
                    "order_id": "ORD-AUTH-002"
                }
            }
        }
    }

    with patch("app.api.webhooks.verify_paypal_webhook_signature", return_value=True):
        resp = client.post("/api/webhooks/paypal", json=webhook_payload)
        assert resp.status_code == 200
        assert resp.json()["status"] == "PROCESSED"

        db_session.refresh(escrow)
        assert escrow.state == "FUNDS_HELD"
        assert escrow.paypal_authorization_id == "AUTH-WH-222"
        assert escrow.hold_expires_at is not None


def test_webhook_capture_completed_using_related_ids(client, sample_mandate, db_session):
    escrow = create_test_escrow(
        db_session,
        sample_mandate,
        state="FUNDS_HELD",
        order_id="ORD-CAP-003",
        auth_id="AUTH-WH-333"
    )

    webhook_payload = {
        "id": "WH-EVT-CAP-003",
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {
            "id": "CAP-WH-333",
            "status": "COMPLETED",
            "supplementary_data": {
                "related_ids": {
                    "order_id": "ORD-CAP-003",
                    "authorization_id": "AUTH-WH-333"
                }
            }
        }
    }

    with patch("app.api.webhooks.verify_paypal_webhook_signature", return_value=True):
        resp = client.post("/api/webhooks/paypal", json=webhook_payload)
        assert resp.status_code == 200

        db_session.refresh(escrow)
        assert escrow.state == "RELEASED"
        assert escrow.paypal_capture_id == "CAP-WH-333"


def test_webhook_authorization_voided(client, sample_mandate, db_session):
    escrow = create_test_escrow(
        db_session,
        sample_mandate,
        state="FUNDS_HELD",
        order_id="ORD-VOID-004",
        auth_id="AUTH-WH-444"
    )

    webhook_payload = {
        "id": "WH-EVT-VOID-004",
        "event_type": "PAYMENT.AUTHORIZATION.VOIDED",
        "resource": {
            "id": "AUTH-WH-444",
            "supplementary_data": {
                "related_ids": {
                    "order_id": "ORD-VOID-004"
                }
            }
        }
    }

    with patch("app.api.webhooks.verify_paypal_webhook_signature", return_value=True):
        resp = client.post("/api/webhooks/paypal", json=webhook_payload)
        assert resp.status_code == 200

        db_session.refresh(escrow)
        assert escrow.state == "REFUNDED"


def test_webhook_capture_denied(client, sample_mandate, db_session):
    escrow = create_test_escrow(
        db_session,
        sample_mandate,
        state="FUNDS_HELD",
        order_id="ORD-DENIED-005",
        auth_id="AUTH-WH-555"
    )

    webhook_payload = {
        "id": "WH-EVT-DENIED-005",
        "event_type": "PAYMENT.CAPTURE.DENIED",
        "resource": {
            "id": "CAP-DENIED-555",
            "supplementary_data": {
                "related_ids": {
                    "order_id": "ORD-DENIED-005"
                }
            }
        }
    }

    with patch("app.api.webhooks.verify_paypal_webhook_signature", return_value=True):
        resp = client.post("/api/webhooks/paypal", json=webhook_payload)
        assert resp.status_code == 200

        db_session.refresh(escrow)
        assert escrow.state == "NEEDS_HUMAN"


def test_webhook_unknown_event_stored_and_ignored(client, sample_mandate, db_session):
    webhook_payload = {
        "id": "WH-EVT-UNKNOWN-999",
        "event_type": "CUSTOMER.DISPUTE.CREATED",
        "resource": {"dispute_id": "DSP-123"}
    }

    with patch("app.api.webhooks.verify_paypal_webhook_signature", return_value=True):
        resp = client.post("/api/webhooks/paypal", json=webhook_payload)
        assert resp.status_code == 200

        wh = db_session.query(WebhookEvent).filter(WebhookEvent.event_id == "WH-EVT-UNKNOWN-999").first()
        assert wh is not None
        assert wh.status == "PROCESSED"


def test_webhook_failure_rolls_back_and_marks_failed(client, sample_mandate, db_session):
    escrow = create_test_escrow(db_session, sample_mandate, state="ORDER_CREATED", order_id="ORD-FAIL-007")

    webhook_payload = {
        "id": "WH-EVT-FAIL-007",
        "event_type": "CHECKOUT.ORDER.APPROVED",
        "resource": {"id": "ORD-FAIL-007"}
    }

    with patch("app.api.webhooks.verify_paypal_webhook_signature", return_value=True), \
         patch("app.api.webhooks.transition_escrow_state", side_effect=RuntimeError("Simulated DB error")):
        resp = client.post("/api/webhooks/paypal", json=webhook_payload)
        assert resp.status_code == 500

        # Confirm escrow state was rolled back and NOT changed
        db_session.refresh(escrow)
        assert escrow.state == "ORDER_CREATED"

        # WebhookEvent is marked FAILED so retry can occur
        wh = db_session.query(WebhookEvent).filter(WebhookEvent.event_id == "WH-EVT-FAIL-007").first()
        assert wh is not None
        assert wh.status == "FAILED"
        assert "Simulated DB error" in wh.error_message
