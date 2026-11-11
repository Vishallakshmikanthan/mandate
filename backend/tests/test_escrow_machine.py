import pytest
from app.models.escrow import Escrow
from app.models.intent import PaymentIntent
from app.schemas.escrow import EscrowState
from app.core.escrow_machine import transition_escrow_state, InvalidStateTransitionError


@pytest.mark.asyncio
async def test_legal_escrow_lifecycle(db_session, sample_mandate):
    intent = PaymentIntent(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="freelance_design",
        amount_minor=12000,
        currency="USD",
        description="Logo package",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    escrow = Escrow(intent_id=intent.id, state=EscrowState.ORDER_CREATED.value)
    db_session.add(escrow)
    db_session.commit()

    # ORDER_CREATED -> BUYER_APPROVED
    await transition_escrow_state(db_session, escrow, EscrowState.BUYER_APPROVED.value, "buyer_agent", "Approved")
    assert escrow.state == EscrowState.BUYER_APPROVED.value

    # BUYER_APPROVED -> FUNDS_HELD
    await transition_escrow_state(db_session, escrow, EscrowState.FUNDS_HELD.value, "paypal", "Funds held")
    assert escrow.state == EscrowState.FUNDS_HELD.value

    # FUNDS_HELD -> DELIVERED
    await transition_escrow_state(db_session, escrow, EscrowState.DELIVERED.value, "seller_agent", "Work delivered")
    assert escrow.state == EscrowState.DELIVERED.value

    # DELIVERED -> UNDER_ARBITRATION
    await transition_escrow_state(db_session, escrow, EscrowState.UNDER_ARBITRATION.value, "arbiter", "Arbitrating")
    assert escrow.state == EscrowState.UNDER_ARBITRATION.value

    # UNDER_ARBITRATION -> RELEASED
    await transition_escrow_state(db_session, escrow, EscrowState.RELEASED.value, "paypal", "Capture complete")
    assert escrow.state == EscrowState.RELEASED.value


@pytest.mark.asyncio
async def test_illegal_escrow_transition_raises(db_session, sample_mandate):
    intent = PaymentIntent(
        mandate_id=sample_mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="freelance_design",
        amount_minor=12000,
        currency="USD",
        description="Logo package",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    escrow = Escrow(intent_id=intent.id, state=EscrowState.ORDER_CREATED.value)
    db_session.add(escrow)
    db_session.commit()

    # Illegal transition: ORDER_CREATED directly to RELEASED (cannot release without funds being held)
    with pytest.raises(InvalidStateTransitionError):
        await transition_escrow_state(db_session, escrow, EscrowState.RELEASED.value, "attacker", "Illegal skip")

    # Terminal state RELEASED cannot transition to anything
    escrow.state = EscrowState.RELEASED.value
    db_session.commit()

    with pytest.raises(InvalidStateTransitionError):
        await transition_escrow_state(db_session, escrow, EscrowState.FUNDS_HELD.value, "attacker", "Revive released")
