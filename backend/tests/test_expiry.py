import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from starlette.testclient import TestClient

from app.models.mandate import Mandate
from app.models.intent import PaymentIntent
from app.models.escrow import Escrow
from app.models.counterparty import Counterparty
from app.schemas.escrow import EscrowState
from app.core.mandate_signing import sign_policy
from app.config import settings
from app.core.expiry import process_expired_escrows
from app.core.spend_ledger import record_spend_entry, get_mandate_spend_metrics


def create_test_mandate(db: Session, total_budget_minor: int = 10000) -> Mandate:
    policy = {
        "max_per_tx_minor": total_budget_minor,
        "max_daily_minor": total_budget_minor,
        "total_budget_minor": total_budget_minor,
        "rate_limit_per_min": 10,
        "allowed_categories": ["freelance_design", "software"],
        "allowed_counterparties": ["seller_agent_acme"]
    }
    sig = sign_policy(policy, settings.MANDATE_SIGNING_KEY)
    m = Mandate(
        owner_id="owner_expiry_test",
        agent_id="agent_expiry_test",
        policy=policy,
        signature=sig,
        status="ACTIVE",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db.add(m)
    db.commit()
    return m


@pytest.mark.asyncio
async def test_expired_escrow_transitions_to_expired_and_releases_budget(db_session: Session):
    # 1. Setup mandate with $100 budget
    mandate = create_test_mandate(db_session, total_budget_minor=10000)

    # 2. Intent of $100 approved and reserved in spend ledger
    intent = PaymentIntent(
        mandate_id=mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="freelance_design",
        amount_minor=10000,
        currency="USD",
        description="Hold expiry test service",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    record_spend_entry(
        db=db_session,
        mandate_id=mandate.id,
        intent_id=intent.id,
        amount_minor=10000,
        kind="RESERVE"
    )

    metrics_before = get_mandate_spend_metrics(db_session, mandate.id)
    assert metrics_before["allocated_spend_minor"] == 10000

    # 3. Create escrow with hold_expires_at in the PAST (e.g. 2 hours ago)
    past_expiry = datetime.now(timezone.utc) - timedelta(hours=2)
    escrow = Escrow(
        intent_id=intent.id,
        state=EscrowState.FUNDS_HELD.value,
        paypal_order_id="ORD-EXPIRY-1",
        paypal_authorization_id="AUTH-EXPIRY-1",
        hold_expires_at=past_expiry
    )
    db_session.add(escrow)
    db_session.commit()

    # 4. Run process_expired_escrows
    results = await process_expired_escrows(db_session)
    assert len(results) == 1
    assert results[0]["escrow_id"] == escrow.id
    assert results[0]["action"] == "EXPIRED_AND_RELEASED"

    # 5. Verify state is EXPIRED
    db_session.refresh(escrow)
    assert escrow.state == EscrowState.EXPIRED.value

    # 6. Verify spend ledger released budget back to mandate
    metrics_after = get_mandate_spend_metrics(db_session, mandate.id)
    assert metrics_after["allocated_spend_minor"] == 0


@pytest.mark.asyncio
async def test_active_escrow_in_future_not_expired(db_session: Session):
    mandate = create_test_mandate(db_session, total_budget_minor=10000)

    intent = PaymentIntent(
        mandate_id=mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="freelance_design",
        amount_minor=5000,
        currency="USD",
        description="Future hold escrow",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    record_spend_entry(
        db=db_session,
        mandate_id=mandate.id,
        intent_id=intent.id,
        amount_minor=5000,
        kind="RESERVE"
    )

    # Expiry 10 days in future
    future_expiry = datetime.now(timezone.utc) + timedelta(days=10)
    escrow = Escrow(
        intent_id=intent.id,
        state=EscrowState.FUNDS_HELD.value,
        paypal_order_id="ORD-FUTURE-1",
        paypal_authorization_id="AUTH-FUTURE-1",
        hold_expires_at=future_expiry
    )
    db_session.add(escrow)
    db_session.commit()

    # Run check
    results = await process_expired_escrows(db_session)
    assert len(results) == 0

    db_session.refresh(escrow)
    assert escrow.state == EscrowState.FUNDS_HELD.value

    metrics = get_mandate_spend_metrics(db_session, mandate.id)
    assert metrics["allocated_spend_minor"] == 5000


def test_manual_check_expiry_endpoint(client: TestClient, db_session: Session):
    mandate = create_test_mandate(db_session, total_budget_minor=10000)

    intent = PaymentIntent(
        mandate_id=mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="freelance_design",
        amount_minor=8000,
        currency="USD",
        description="Endpoint expiry test",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    record_spend_entry(
        db=db_session,
        mandate_id=mandate.id,
        intent_id=intent.id,
        amount_minor=8000,
        kind="RESERVE"
    )

    past_expiry = datetime.now(timezone.utc) - timedelta(minutes=30)
    escrow = Escrow(
        intent_id=intent.id,
        state=EscrowState.DELIVERED.value,
        paypal_order_id="ORD-EP-1",
        paypal_authorization_id="AUTH-EP-1",
        hold_expires_at=past_expiry
    )
    db_session.add(escrow)
    db_session.commit()

    # Call POST /api/escrows/check-expiry
    resp = client.post("/api/escrows/check-expiry")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert data["expired_count"] == 1

    db_session.refresh(escrow)
    assert escrow.state == EscrowState.EXPIRED.value
