import pytest
from unittest.mock import AsyncMock, patch
from app.paypal.orders import create_paypal_order
from app.paypal.client import PayPalClient
from app.models.counterparty import Counterparty


@pytest.mark.asyncio
async def test_create_paypal_order_simulation_payee():
    res = await create_paypal_order(
        intent_id="intent_test_123",
        amount_minor=5000,
        currency="USD",
        payee_email="seller@example.com",
        payee_merchant_id="SANDBOX_SELLER_1"
    )
    assert res["status"] == "CREATED"
    assert "order_id" in res
    assert res["payee"] == {
        "email_address": "seller@example.com",
        "merchant_id": "SANDBOX_SELLER_1"
    }


@pytest.mark.asyncio
async def test_create_paypal_order_real_payload_contains_payee():
    mock_client = PayPalClient()
    mock_client.simulation_mode = False
    mock_client.request = AsyncMock(return_value={
        "id": "ORD-LIVE-999",
        "status": "CREATED",
        "links": [{"rel": "approve", "href": "https://www.paypal.com/checkoutnow?token=ORD-LIVE-999"}]
    })

    with patch("app.paypal.orders.get_paypal_client", return_value=mock_client):
        res = await create_paypal_order(
            intent_id="intent_live_456",
            amount_minor=12500,
            currency="USD",
            description="Logo service",
            payee_email="artist@studio.com",
            payee_merchant_id="ARTIST_MERCH_ID"
        )

        assert res["order_id"] == "ORD-LIVE-999"
        mock_client.request.assert_called_once()
        call_kwargs = mock_client.request.call_args.kwargs
        json_payload = call_kwargs["json_data"]

        assert "purchase_units" in json_payload
        pu = json_payload["purchase_units"][0]
        assert pu["reference_id"] == "intent_live_456"
        assert pu["amount"]["value"] == "125.00"
        assert pu["payee"] == {
            "email_address": "artist@studio.com",
            "merchant_id": "ARTIST_MERCH_ID"
        }


def test_intent_blocked_on_unverified_counterparty(client, sample_mandate, db_session):
    # Register an unverified counterparty
    cp = Counterparty(
        handle="unverified_freelancer",
        paypal_email="unverified@example.com",
        status="UNVERIFIED"
    )
    db_session.add(cp)
    db_session.commit()

    # Attempt to submit payment intent to unverified counterparty
    payload = {
        "mandate_id": sample_mandate.id,
        "counterparty": "unverified_freelancer",
        "merchant_category": "freelance_design",
        "amount_minor": 5000,
        "currency": "USD",
        "description": "Design concept draft"
    }

    resp = client.post("/api/intents", json=payload)
    assert resp.status_code == 201
    data = resp.json()

    assert data["decision"] == "BLOCKED"
    r5_result = next((r for r in data["decision_reasons"] if r["rule"] == "R5_COUNTERPARTY"), None)
    assert r5_result is not None
    assert r5_result["passed"] is False
    assert "not verified" in r5_result["detail"]

    # Verify escrow is BLOCKED with zero PayPal order created
    from app.models.escrow import Escrow
    escrow = db_session.query(Escrow).filter(Escrow.id == data["escrow_id"]).first()
    assert escrow is not None
    assert escrow.state == "BLOCKED"
    assert escrow.paypal_order_id is None


def test_intent_approved_on_verified_counterparty(client, sample_mandate, db_session):
    from app.models.escrow import Escrow

    # Update seller_agent_acme counterparty in session
    cp = db_session.query(Counterparty).filter(Counterparty.handle == "seller_agent_acme").first()
    if not cp:
        cp = Counterparty(
            handle="seller_agent_acme",
            paypal_email="seller-acme@example.com",
            paypal_merchant_id="MERCHANT_ACME_123",
            status="VERIFIED"
        )
        db_session.add(cp)
    else:
        cp.status = "VERIFIED"
        cp.paypal_merchant_id = "MERCHANT_ACME_123"
    db_session.commit()

    payload = {
        "mandate_id": sample_mandate.id,
        "counterparty": "seller_agent_acme",
        "merchant_category": "freelance_design",
        "amount_minor": 5000,
        "currency": "USD",
        "description": "Approved vector design"
    }

    resp = client.post("/api/intents", json=payload)
    assert resp.status_code == 201
    data = resp.json()

    assert data["decision"] == "APPROVED"
    r5_result = next((r for r in data["decision_reasons"] if r["rule"] == "R5_COUNTERPARTY"), None)
    assert r5_result is not None
    assert r5_result["passed"] is True
    assert data["escrow_id"] is not None

    escrow = db_session.query(Escrow).filter(Escrow.id == data["escrow_id"]).first()
    assert escrow is not None
    assert escrow.state == "ORDER_CREATED"
    assert escrow.paypal_order_id is not None


def test_counterparty_crud_and_verification_api(client, db_session):
    # 1. Register a new counterparty
    payload = {
        "handle": "designer_bob",
        "paypal_email": "bob@freelance.org",
        "paypal_merchant_id": "BOB_MERCHANT_123"
    }
    resp = client.post("/api/counterparties", json=payload)
    assert resp.status_code == 201
    cp_data = resp.json()
    assert cp_data["handle"] == "designer_bob"
    assert cp_data["status"] == "UNVERIFIED"
    assert cp_data["verified_at"] is None

    # 2. Get counterparty
    get_resp = client.get(f"/api/counterparties/{cp_data['id']}")
    assert get_resp.status_code == 200
    assert get_resp.json()["handle"] == "designer_bob"

    # 3. Verify counterparty
    verify_resp = client.post(f"/api/counterparties/{cp_data['id']}/verify")
    assert verify_resp.status_code == 200
    assert verify_resp.json()["status"] == "VERIFIED"
    assert verify_resp.json()["verified_at"] is not None

    # 4. List counterparties
    list_resp = client.get("/api/counterparties")
    assert list_resp.status_code == 200
    handles = [c["handle"] for c in list_resp.json()]
    assert "designer_bob" in handles


@pytest.mark.asyncio
async def test_create_paypal_order_sets_experience_context_urls():
    mock_client = PayPalClient()
    mock_client.simulation_mode = False
    mock_client.request = AsyncMock(return_value={
        "id": "ORD-URL-123",
        "status": "CREATED",
        "links": [{"rel": "approve", "href": "https://www.sandbox.paypal.com/checkoutnow?token=ORD-URL-123"}]
    })

    with patch("app.paypal.orders.get_paypal_client", return_value=mock_client):
        res = await create_paypal_order(
            intent_id="intent_url_test",
            amount_minor=8000,
            currency="USD",
            return_url="https://platform.com/app/escrows/esc_123?approved=true",
            cancel_url="https://platform.com/app/escrows/esc_123?cancelled=true"
        )

        assert res["order_id"] == "ORD-URL-123"
        call_kwargs = mock_client.request.call_args.kwargs
        json_payload = call_kwargs["json_data"]

        assert "payment_source" in json_payload
        exp_ctx = json_payload["payment_source"]["paypal"]["experience_context"]
        assert exp_ctx["return_url"] == "https://platform.com/app/escrows/esc_123?approved=true"
        assert exp_ctx["cancel_url"] == "https://platform.com/app/escrows/esc_123?cancelled=true"
        assert exp_ctx["user_action"] == "CONTINUE"
        assert exp_ctx["shipping_preference"] == "NO_SHIPPING"


def test_approval_return_rejects_unapproved_order(client, sample_mandate, db_session):
    from app.models.escrow import Escrow
    from app.models.intent import PaymentIntent

    intent = PaymentIntent(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="freelance_design",
        amount_minor=6000,
        currency="USD",
        description="Logo escrow test",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    escrow = Escrow(
        intent_id=intent.id,
        state="ORDER_CREATED",
        paypal_order_id="ORD-UNAPPROVED-99"
    )
    db_session.add(escrow)
    db_session.commit()

    mock_client = PayPalClient()
    mock_client.simulation_mode = False
    mock_client.request = AsyncMock(return_value={"id": "ORD-UNAPPROVED-99", "status": "CREATED"})

    with patch("app.api.escrows.get_paypal_client", return_value=mock_client):
        resp = client.get(f"/api/escrows/{escrow.id}/approval-return")
        assert resp.status_code == 400
        assert "not approved" in resp.json()["detail"]


def test_approval_return_authorizes_approved_order(client, sample_mandate, db_session):
    from app.models.escrow import Escrow
    from app.models.intent import PaymentIntent

    intent = PaymentIntent(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="freelance_design",
        amount_minor=7500,
        currency="USD",
        description="Vector design hold",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    escrow = Escrow(
        intent_id=intent.id,
        state="ORDER_CREATED",
        paypal_order_id="ORD-APPROVED-100"
    )
    db_session.add(escrow)
    db_session.commit()

    mock_client = PayPalClient()
    mock_client.simulation_mode = False

    async def mock_request(method, endpoint, **kwargs):
        if method == "GET" and "/v2/checkout/orders/" in endpoint:
            return {"id": "ORD-APPROVED-100", "status": "APPROVED"}
        if method == "POST" and "/authorize" in endpoint:
            return {
                "id": "ORD-APPROVED-100",
                "status": "COMPLETED",
                "purchase_units": [
                    {
                        "payments": {
                            "authorizations": [
                                {
                                    "id": "AUTH-LIVE-100",
                                    "status": "CREATED",
                                    "expiration_time": "2026-12-10T12:00:00Z"
                                }
                            ]
                        }
                    }
                ]
            }
        return {}

    mock_client.request = AsyncMock(side_effect=mock_request)

    with patch("app.api.escrows.get_paypal_client", return_value=mock_client), \
         patch("app.paypal.orders.get_paypal_client", return_value=mock_client):
        resp = client.get(f"/api/escrows/{escrow.id}/approval-return")
        assert resp.status_code == 200
        data = resp.json()

        assert data["state"] == "FUNDS_HELD"
        assert data["paypal_authorization_id"] == "AUTH-LIVE-100"
        assert data["hold_expires_at"] is not None

        # Confirm persisted in DB
        db_session.refresh(escrow)
        assert escrow.state == "FUNDS_HELD"
        assert escrow.paypal_authorization_id == "AUTH-LIVE-100"


@pytest.mark.asyncio
async def test_orchestrator_waits_for_buyer_approval_in_non_simulation_mode(db_session, sample_mandate):
    from app.agents.orchestrator import AgentOrchestrator

    mock_client = PayPalClient()
    mock_client.simulation_mode = False
    mock_client.request = AsyncMock(return_value={
        "id": "ORD-REAL-1234",
        "status": "CREATED",
        "links": [{"rel": "approve", "href": "https://www.sandbox.paypal.com/checkoutnow?token=ORD-REAL-1234"}]
    })

    orchestrator = AgentOrchestrator(db_session, scenario_name="test_approval_flow")

    with patch("app.paypal.orders.get_paypal_client", return_value=mock_client), \
         patch("app.agents.orchestrator.get_paypal_client", return_value=mock_client):
        result = await orchestrator.run_scenario(sample_mandate.id, mode="honest")

        assert result["status"] == "WAITING_FOR_BUYER_APPROVAL"
        assert result["paypal_order_id"] == "ORD-REAL-1234"
        assert "checkoutnow?token=ORD-REAL-1234" in result["approve_url"]
