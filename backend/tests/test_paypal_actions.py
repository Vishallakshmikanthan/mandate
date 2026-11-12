import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy.orm import Session

from app.paypal.orders import (
    create_paypal_order,
    authorize_paypal_order,
    capture_paypal_authorization,
    void_paypal_authorization
)
from app.models.paypal_action import PayPalAction
from app.models.escrow import Escrow
from app.models.intent import PaymentIntent
from app.schemas.escrow import EscrowState
from app.core.escrow_machine import transition_escrow_state
from app.paypal.client import PayPalClient


@pytest.mark.asyncio
async def test_idempotent_order_creation(db_session: Session):
    intent_id = "test_intent_order_idem_1"
    amount = 5000

    # First call creates order
    res1 = await create_paypal_order(
        intent_id=intent_id,
        amount_minor=amount,
        currency="USD",
        db=db_session
    )
    assert res1["status"] == "CREATED"
    order_id_1 = res1["order_id"]

    # Second call with same intent_id and amount returns cached order
    res2 = await create_paypal_order(
        intent_id=intent_id,
        amount_minor=amount,
        currency="USD",
        db=db_session
    )
    assert res2["order_id"] == order_id_1
    assert res2["approve_url"] == res1["approve_url"]

    # Verify single action row recorded in DB
    actions = db_session.query(PayPalAction).filter(
        PayPalAction.request_id == f"{intent_id}-CREATE_ORDER-{amount}"
    ).all()
    assert len(actions) == 1
    assert actions[0].status == "COMPLETED"


@pytest.mark.asyncio
async def test_idempotent_authorization_and_void(db_session: Session):
    intent_id = "test_intent_auth_idem_2"
    order_id = "ORD-TEST-999"

    # 1. Authorize order
    auth1 = await authorize_paypal_order(
        order_id=order_id,
        intent_id=intent_id,
        amount_minor=7500,
        db=db_session
    )
    auth_id_1 = auth1["authorization_id"]

    # Re-call authorize returns cached authorization
    auth2 = await authorize_paypal_order(
        order_id=order_id,
        intent_id=intent_id,
        amount_minor=7500,
        db=db_session
    )
    assert auth2["authorization_id"] == auth_id_1

    # 2. Void authorization
    void1 = await void_paypal_authorization(
        authorization_id=auth_id_1,
        intent_id=intent_id,
        amount_minor=7500,
        db=db_session
    )
    assert void1["status"] == "VOIDED"

    # Re-call void returns cached void
    void2 = await void_paypal_authorization(
        authorization_id=auth_id_1,
        intent_id=intent_id,
        amount_minor=7500,
        db=db_session
    )
    assert void2["status"] == "VOIDED"

    actions = db_session.query(PayPalAction).filter(
        PayPalAction.action == "VOID"
    ).all()
    assert len(actions) == 1
    assert actions[0].status == "COMPLETED"


@pytest.mark.asyncio
async def test_partial_capture_uses_final_capture_flag(db_session: Session):
    """Verify that partial capture includes final_capture: True in PayPal Payments v2 payload."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    mock_client = PayPalClient()
    mock_client.simulation_mode = False
    mock_client.request = AsyncMock(return_value={
        "id": "CAP-LIVE-PARTIAL",
        "status": "COMPLETED"
    })

    with patch("app.paypal.orders.get_paypal_client", return_value=mock_client):
        res = await capture_paypal_authorization(
            authorization_id=f"AUTH-LIVE-{uid}",
            intent_id=f"intent_live_{uid}",
            amount_minor=3500,
            currency="USD",
            final_capture=True,
            db=db_session
        )

        assert res["capture_id"] == "CAP-LIVE-PARTIAL"
        assert res["final_capture"] is True
        mock_client.request.assert_called_once()
        call_kwargs = mock_client.request.call_args.kwargs
        json_data = call_kwargs["json_data"]

        # Final capture flag must be True to void remaining balance automatically
        assert json_data["final_capture"] is True
        assert json_data["amount"]["value"] == "35.00"
        assert call_kwargs["idempotency_key"] == f"intent_live_{uid}-CAPTURE-3500"


@pytest.mark.asyncio
async def test_simulated_crash_between_paypal_call_and_db_commit_produces_one_capture(db_session: Session):
    """
    CRITICAL ACCEPTANCE CRITERIA:
    Simulated crash between PayPal call and caller DB commit, followed by retry,
    produces exactly ONE capture call to PayPal and resumes safely.
    """
    intent = PaymentIntent(
        mandate_id="mandate_crash_test",
        amount_minor=10000,
        currency="USD",
        counterparty="seller_agent_acme",
        merchant_category="software",
        description="Crash test service",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    escrow = Escrow(
        intent_id=intent.id,
        state=EscrowState.DELIVERED.value,
        paypal_order_id="ORD-CRASH-TEST",
        paypal_authorization_id="AUTH-CRASH-TEST"
    )
    db_session.add(escrow)
    db_session.commit()

    mock_client = PayPalClient()
    mock_client.simulation_mode = False
    mock_client.request = AsyncMock(return_value={
        "id": "CAP-EXTERNAL-PAYPAL-123",
        "status": "COMPLETED"
    })

    with patch("app.paypal.orders.get_paypal_client", return_value=mock_client):
        # 1. First attempt: PayPal executes capture and commits to paypal_actions
        cap_res1 = await capture_paypal_authorization(
            authorization_id=escrow.paypal_authorization_id,
            intent_id=intent.id,
            amount_minor=intent.amount_minor,
            final_capture=True,
            escrow_id=escrow.id,
            db=db_session
        )
        assert cap_res1["capture_id"] == "CAP-EXTERNAL-PAYPAL-123"
        assert mock_client.request.call_count == 1

        # SIMULATE CRASH: Caller process crashes before updating escrow state to RELEASED!
        # The database transaction on escrow is rolled back or aborted.
        # Escrow remains in DELIVERED state.
        db_session.refresh(escrow)
        assert escrow.state == EscrowState.DELIVERED.value
        assert escrow.paypal_capture_id is None

        # 2. Crash recovery / Retry: Caller restarts and retries arbitration/capture
        cap_res2 = await capture_paypal_authorization(
            authorization_id=escrow.paypal_authorization_id,
            intent_id=intent.id,
            amount_minor=intent.amount_minor,
            final_capture=True,
            escrow_id=escrow.id,
            db=db_session
        )

        # Verified: returned cached capture without second call to PayPal!
        assert cap_res2["capture_id"] == "CAP-EXTERNAL-PAYPAL-123"
        assert mock_client.request.call_count == 1, "PayPal must NOT be called a second time!"

        # Now caller can finish state transition safely
        escrow.paypal_capture_id = cap_res2["capture_id"]
        await transition_escrow_state(
            db=db_session,
            escrow=escrow,
            new_state=EscrowState.RELEASED.value,
            actor="paypal",
            reason="Recovered from crash and finalized capture."
        )

        db_session.refresh(escrow)
        assert escrow.state == EscrowState.RELEASED.value
        assert escrow.paypal_capture_id == "CAP-EXTERNAL-PAYPAL-123"


@pytest.mark.asyncio
async def test_pending_action_resumes_with_same_idempotency_key(db_session: Session):
    """
    Verify that an action found in PENDING state (e.g. crashed mid-network-request)
    resumes using the same idempotency key and updates to COMPLETED.
    """
    intent_id = "test_intent_pending_resume"
    amount = 4000
    req_id = f"{intent_id}-CAPTURE-{amount}"

    # Manually pre-seed a PENDING action record
    pending_action = PayPalAction(
        request_id=req_id,
        action="CAPTURE",
        status="PENDING",
        request_body={"amount": 4000}
    )
    db_session.add(pending_action)
    db_session.commit()

    # Call capture_paypal_authorization
    res = await capture_paypal_authorization(
        authorization_id="AUTH-PENDING-1",
        intent_id=intent_id,
        amount_minor=amount,
        db=db_session
    )

    assert "capture_id" in res
    action_rec = db_session.query(PayPalAction).filter(PayPalAction.request_id == req_id).first()
    assert action_rec.status == "COMPLETED"
    assert action_rec.response_body["capture_id"] == res["capture_id"]
