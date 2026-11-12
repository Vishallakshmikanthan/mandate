"""
Test Suite for Mandate Python SDK and MCP Server.
Verifies:
1. Agent can check mandate balance via SDK.
2. Agent makes end-to-end payment request through SDK.
3. A BLOCKED intent surfaces rule reasons to the agent cleanly.
4. Deliverable submission and status tracking through SDK.
5. MCP Server tool handlers execute correctly with scoped agent permissions and no PayPal credentials.
"""
import sys
import os
import pytest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session
from starlette.testclient import TestClient

# Add SDK path to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "sdk", "python")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "mcp")))

from mandate_sdk import (
    MandateClient,
    IntentBlockedError,
    MandateBalanceResult,
    PaymentIntentResult,
    DeliverableResult
)
from app.main import app
from app.models.mandate import Mandate
from app.models.intent import PaymentIntent
from app.models.escrow import Escrow
from app.models.counterparty import Counterparty
from app.models.user import User
from app.schemas.escrow import EscrowState
from app.core.auth import create_session_token, hash_password


@pytest.fixture
def test_client_transport(client, sample_mandate, db_session):
    """
    Creates a MandateClient configured to route requests directly
    through Starlette TestClient with valid authorization.
    """
    # Ensure owner user exists
    user = db_session.query(User).filter(User.id == sample_mandate.owner_id).first()
    if not user:
        user = User(
            id=sample_mandate.owner_id,
            email="agent_owner@sdktest.com",
            password_hash=hash_password("Pass1234!"),
            role="USER",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()

    token = create_session_token(
        user_id=sample_mandate.owner_id,
        email="agent_owner@sdktest.com",
        role="USER"
    )

    sdk_client = MandateClient(api_key=token, base_url="http://testserver")

    # Patch httpx.Client in the SDK to forward requests to the TestClient
    original_client_cm = httpx_client_context(client)
    return sdk_client, client


def httpx_client_context(test_client):
    import httpx

    class TestClientTransport(httpx.BaseTransport):
        def handle_request(self, request):
            content = request.read()
            resp = test_client.request(
                method=request.method,
                url=str(request.url).replace("http://testserver", ""),
                headers=dict(request.headers),
                content=content
            )
            return httpx.Response(
                status_code=resp.status_code,
                headers=dict(resp.headers),
                content=resp.content,
                request=request
            )

    return TestClientTransport()


@pytest.fixture
def sdk_client(client, sample_mandate, db_session):
    import httpx
    from mandate_sdk import client as sdk_client_module

    user = db_session.query(User).filter(User.id == sample_mandate.owner_id).first()
    if not user:
        user = User(
            id=sample_mandate.owner_id,
            email="agent_owner@sdktest.com",
            password_hash=hash_password("Pass1234!"),
            role="USER",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()

    token = create_session_token(
        user_id=sample_mandate.owner_id,
        email="agent_owner@sdktest.com",
        role="USER"
    )

    transport = httpx_client_context(client)
    sdk = MandateClient(api_key=token, base_url="http://testserver")

    # Patch httpx.Client inside mandate_sdk.client
    original_httpx_client = httpx.Client

    def mocked_httpx_client(*args, **kwargs):
        kwargs["transport"] = transport
        return original_httpx_client(*args, **kwargs)

    with patch.object(sdk_client_module.httpx, "Client", side_effect=mocked_httpx_client):
        yield sdk


def test_sdk_get_mandate_balance(sdk_client, sample_mandate):
    balance = sdk_client.get_mandate_balance(sample_mandate.id)
    assert isinstance(balance, MandateBalanceResult)
    assert balance.mandate_id == sample_mandate.id
    assert balance.currency == "USD"
    assert balance.max_total_minor == 50000
    assert balance.remaining_budget_minor > 0
    assert balance.is_active is True


def test_sdk_payment_request_end_to_end_approved(sdk_client, sample_mandate):
    # Compliant intent with verified counterparty
    payment = sdk_client.request_payment(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        amount_minor=8000,  # $80.00
        merchant_category="freelance_design",
        description="Logo Design Package (3 concepts + SVGs)"
    )

    assert isinstance(payment, PaymentIntentResult)
    assert payment.is_approved is True
    assert payment.decision == "APPROVED"
    assert payment.amount_minor == 8000
    assert payment.escrow_id is not None
    assert payment.risk_score < 0.2


def test_sdk_payment_request_blocked_surfaces_reasons(sdk_client, sample_mandate):
    # Submitting payment to blocked counterparty
    payment = sdk_client.request_payment(
        mandate_id=sample_mandate.id,
        counterparty="unverified_seller_66",
        amount_minor=5000,
        merchant_category="freelance_design",
        description="Design work from unverified party",
        raise_on_blocked=False
    )

    assert payment.is_blocked is True
    assert payment.decision == "BLOCKED"
    assert len(payment.blocking_reasons) > 0
    assert any("counterparty" in r.lower() for r in payment.blocking_reasons)

    # With raise_on_blocked=True, must raise IntentBlockedError with reasons
    with pytest.raises(IntentBlockedError) as exc_info:
        sdk_client.request_payment(
            mandate_id=sample_mandate.id,
            counterparty="unverified_seller_66",
            amount_minor=5000,
            merchant_category="freelance_design",
            description="Design work from unverified party",
            raise_on_blocked=True
        )

    assert len(exc_info.value.reasons) > 0
    assert exc_info.value.risk_score >= 0.0


def test_sdk_get_intent_status(sdk_client, sample_mandate):
    # Create intent
    payment = sdk_client.request_payment(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        amount_minor=6000,
        merchant_category="freelance_design",
        description="Banner ads"
    )

    # Query status
    status = sdk_client.get_intent_status(payment.intent_id)
    assert status.intent_id == payment.intent_id
    assert status.decision == payment.decision
    assert status.amount_minor == 6000


def test_sdk_submit_deliverable(sdk_client, sample_mandate, db_session):
    # Create approved intent and escrow
    payment = sdk_client.request_payment(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        amount_minor=7000,
        merchant_category="freelance_design",
        description="Vector assets"
    )

    # Transition escrow to FUNDS_HELD to allow deliverable submission
    escrow = db_session.query(Escrow).filter(Escrow.id == payment.escrow_id).first()
    escrow.state = EscrowState.FUNDS_HELD.value
    db_session.commit()

    deliv_res = sdk_client.submit_deliverable(
        escrow_id=payment.escrow_id,
        content_ref="https://s3.amazonaws.com/seller-assets/logo-v1.zip",
        submission_notes="Final deliverables submitted per spec."
    )

    assert isinstance(deliv_res, DeliverableResult)
    assert deliv_res.escrow_id == payment.escrow_id
    assert deliv_res.status == EscrowState.DELIVERED.value


def test_mcp_server_tools_execution(sdk_client, sample_mandate):
    from mcp.server import handle_tool_call, get_client
    import mcp.server as mcp_module

    # Inject initialized sdk_client into MCP server
    mcp_module._client = sdk_client

    # 1. Test mandate_get_balance tool
    bal_res = handle_tool_call("mandate_get_balance", {"mandate_id": sample_mandate.id})
    assert bal_res["mandate_id"] == sample_mandate.id
    assert bal_res["is_active"] is True
    assert bal_res["currency"] == "USD"

    # 2. Test mandate_request_payment tool (approved)
    req_res = handle_tool_call("mandate_request_payment", {
        "mandate_id": sample_mandate.id,
        "counterparty": "seller_agent_acme",
        "amount_minor": 9000,
        "description": "API integration work",
        "merchant_category": "software_services"
    })
    assert req_res["decision"] == "APPROVED"
    assert req_res["is_approved"] is True
    assert req_res["escrow_id"] is not None

    # 3. Test mandate_request_payment tool (blocked)
    blocked_res = handle_tool_call("mandate_request_payment", {
        "mandate_id": sample_mandate.id,
        "counterparty": "unverified_seller_66",
        "amount_minor": 9000,
        "description": "Suspicious request",
        "merchant_category": "software_services"
    })
    assert blocked_res["decision"] == "BLOCKED"
    assert blocked_res["is_blocked"] is True
    assert len(blocked_res["blocking_reasons"]) > 0

    # 4. Test mandate_get_intent_status tool
    status_res = handle_tool_call("mandate_get_intent_status", {"intent_id": req_res["intent_id"]})
    assert status_res["intent_id"] == req_res["intent_id"]
    assert status_res["decision"] == "APPROVED"


def test_example_agent_quickstart_execution(sdk_client, sample_mandate):
    """
    Directly tests the under-20-line quickstart workflow:
    1. Check mandate balance
    2. Request payment end-to-end
    3. Verify BLOCKED intent surfaces failure reasons to the agent
    """
    # 1. Check remaining treasury budget
    balance = sdk_client.get_mandate_balance(sample_mandate.id)
    assert balance.remaining_budget_minor > 0

    # 2. Approved payment request end to end
    payment = sdk_client.request_payment(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        amount_minor=12000,
        merchant_category="freelance_design",
        description="Logo Design Package (3 concepts + SVGs)",
        raise_on_blocked=True
    )
    assert payment.is_approved is True
    assert payment.escrow_id is not None

    # 3. Blocked payment surfaces reasons
    with pytest.raises(IntentBlockedError) as exc_info:
        sdk_client.request_payment(
            mandate_id=sample_mandate.id,
            counterparty="seller_agent_acme",
            amount_minor=9999999,  # Exceeds max per transaction and total budget
            merchant_category="freelance_design",
            description="Exorbitant charge",
            raise_on_blocked=True
        )
    assert len(exc_info.value.reasons) > 0
    assert any("cap" in r.lower() or "budget" in r.lower() for r in exc_info.value.reasons)

