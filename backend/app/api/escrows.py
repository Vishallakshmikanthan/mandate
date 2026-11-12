from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.db import get_db
from app.config import settings
from app.models.escrow import Escrow
from app.models.deliverable import Deliverable
from app.models.arbiter import ArbiterVerdictRecord
from app.schemas.escrow import (
    EscrowResponse,
    DeliverableCreate,
    DeliverableResponse,
    ArbiterVerdictResponse,
    HumanDecisionRequest,
    EscrowState,
    CriterionResult
)
from app.core.escrow_machine import transition_escrow_state, get_escrow_for_update
from app.core.arbiter import evaluate_deliverable_arbitration
from app.core.spend_ledger import get_mandate_for_update, get_mandate_spend_metrics, record_spend_entry
from app.core.policy_engine import evaluate_policy_rules
from app.models.counterparty import Counterparty
from app.models.mandate import Mandate
from app.models.intent import PaymentIntent
from app.models.user_key import UserKey
from app.core.auth import (
    get_current_user_or_agent,
    require_human,
    verify_owner_access,
    verify_seller_deliver_permission,
    AuthContext,
)
from app.paypal.orders import (
    create_paypal_order,
    authorize_paypal_order,
    capture_paypal_authorization,
    void_paypal_authorization
)
from app.paypal.client import get_paypal_client
from app.core.stream_broadcaster import emit_timeline_event

router = APIRouter(prefix="/escrows", tags=["Escrows"])


def build_escrow_response(e: Escrow) -> EscrowResponse:
    approve_url = (
        f"https://www.sandbox.paypal.com/checkoutnow?token={e.paypal_order_id}"
        if e.paypal_order_id and e.state in ("ORDER_CREATED", "BUYER_APPROVED")
        else None
    )
    return EscrowResponse(
        id=e.id,
        intent_id=e.intent_id,
        paypal_order_id=e.paypal_order_id,
        paypal_authorization_id=e.paypal_authorization_id,
        paypal_capture_id=e.paypal_capture_id,
        approve_url=approve_url,
        state=e.state,
        spec=e.spec or {},
        hold_expires_at=e.hold_expires_at,
        created_at=e.created_at,
        updated_at=e.updated_at,
        deliverables=[DeliverableResponse.model_validate(d) for d in e.deliverables],
        verdicts=[
            ArbiterVerdictResponse(
                id=v.id,
                escrow_id=v.escrow_id,
                verdict=v.verdict,
                confidence=v.confidence,
                criteria_results=[CriterionResult.model_validate(c) for c in v.criteria_results],
                explanation=v.explanation,
                partial_ratio=v.partial_ratio,
                model=v.model,
                created_at=v.created_at
            )
            for v in e.verdicts
        ]
    )


@router.get("", response_model=List[EscrowResponse])
def list_escrows(
    auth: AuthContext = Depends(get_current_user_or_agent),
    db: Session = Depends(get_db)
):
    query = db.query(Escrow)
    if not auth.is_admin:
        query = query.filter(
            Escrow.intent.has(PaymentIntent.mandate.has(Mandate.owner_id == auth.user_id))
        )
    escrows = query.order_by(Escrow.created_at.desc()).limit(100).all()
    return [build_escrow_response(e) for e in escrows]


@router.get("/{escrow_id}", response_model=EscrowResponse)
def get_escrow(
    escrow_id: str,
    auth: AuthContext = Depends(get_current_user_or_agent),
    db: Session = Depends(get_db)
):
    e = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Escrow contract not found")
    if e.intent and e.intent.mandate:
        verify_owner_access(e.intent.mandate.owner_id, auth)
    return build_escrow_response(e)


@router.get("/{escrow_id}/approval-return", response_model=EscrowResponse)
@router.post("/{escrow_id}/approval-return", response_model=EscrowResponse)
async def handle_approval_return(
    escrow_id: str,
    token: Optional[str] = None,
    PayerID: Optional[str] = None,
    redirect: bool = False,
    db: Session = Depends(get_db)
):
    """
    Callback when buyer returns from PayPal approval.
    Fetches the order from PayPal, requires status APPROVED,
    calls authorize, persists authorization_id and hold_expires_at,
    and transitions the escrow to FUNDS_HELD.
    """
    escrow = db.query(Escrow).filter(Escrow.id == escrow_id).first()
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow contract not found")

    if not escrow.paypal_order_id:
        raise HTTPException(status_code=400, detail="Escrow has no associated PayPal order ID")

    # If already at FUNDS_HELD or beyond, return current state
    if escrow.state in (
        EscrowState.FUNDS_HELD.value,
        EscrowState.DELIVERED.value,
        EscrowState.UNDER_ARBITRATION.value,
        EscrowState.RELEASED.value,
        EscrowState.PARTIALLY_RELEASED.value,
        EscrowState.REFUNDED.value
    ):
        if redirect:
            return RedirectResponse(url=f"{settings.FRONTEND_ORIGIN}/app/escrows/{escrow.id}")
        return build_escrow_response(escrow)

    client = get_paypal_client()
    if not client.simulation_mode:
        # Fetch order from PayPal to verify approval
        order_data = await client.request("GET", f"/v2/checkout/orders/{escrow.paypal_order_id}")
        order_status = order_data.get("status")
        if order_status != "APPROVED":
            raise HTTPException(
                status_code=400,
                detail=f"PayPal order is not approved (status: {order_status}). Expected 'APPROVED'."
            )

    # 1. Transition to BUYER_APPROVED
    await transition_escrow_state(
        db=db,
        escrow=escrow,
        new_state=EscrowState.BUYER_APPROVED.value,
        actor="buyer",
        reason="Buyer completed approval on PayPal."
    )

    # 2. Call PayPal authorize
    auth_res = await authorize_paypal_order(
        order_id=escrow.paypal_order_id,
        intent_id=escrow.intent_id,
        amount_minor=escrow.intent.amount_minor if escrow.intent else None,
        escrow_id=escrow.id,
        db=db
    )
    escrow.paypal_authorization_id = auth_res["authorization_id"]
    if auth_res.get("hold_expires_at"):
        try:
            exp_str = auth_res["hold_expires_at"].replace("Z", "+00:00")
            escrow.hold_expires_at = datetime.fromisoformat(exp_str)
        except Exception:
            pass
    db.commit()

    # 3. Transition to FUNDS_HELD
    await transition_escrow_state(
        db=db,
        escrow=escrow,
        new_state=EscrowState.FUNDS_HELD.value,
        actor="paypal",
        reason=f"Funds held in PayPal escrow (Auth ID: {auth_res['authorization_id']}).",
        metadata=auth_res
    )

    if redirect:
        return RedirectResponse(url=f"{settings.FRONTEND_ORIGIN}/app/escrows/{escrow.id}")
    return build_escrow_response(escrow)


@router.post("/{escrow_id}/deliver", response_model=EscrowResponse)
async def submit_deliverable(
    escrow_id: str,
    req: DeliverableCreate,
    auth: AuthContext = Depends(get_current_user_or_agent),
    db: Session = Depends(get_db)
):
    """
    Seller agent submits deliverable against escrow spec.
    Enforces that agent API key matches counterparty handle or caller is human.
    """
    e = get_escrow_for_update(db, escrow_id)
    if not e:
        raise HTTPException(status_code=404, detail="Escrow not found")

    counterparty = e.intent.counterparty if e.intent else ""
    verify_seller_deliver_permission(counterparty, auth)

    if e.state != EscrowState.FUNDS_HELD.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Escrow is in state '{e.state}', expected 'FUNDS_HELD' to submit deliverable."
        )

    deliverable = Deliverable(
        escrow_id=e.id,
        content_ref=req.content_ref,
        submission_notes=req.submission_notes
    )
    db.add(deliverable)
    db.commit()

    await transition_escrow_state(
        db=db,
        escrow=e,
        new_state=EscrowState.DELIVERED.value,
        actor="seller_agent",
        reason="Seller submitted deliverable assets."
    )

    db.refresh(e)
    return build_escrow_response(e)


@router.post("/{escrow_id}/arbitrate", response_model=EscrowResponse)
async def run_arbitration(
    escrow_id: str,
    auth: AuthContext = Depends(get_current_user_or_agent),
    db: Session = Depends(get_db)
):
    """Trigger AI Arbiter to evaluate deliverable and settle PayPal funds."""
    e = get_escrow_for_update(db, escrow_id)
    if not e:
        raise HTTPException(status_code=404, detail="Escrow not found")

    if e.intent and e.intent.mandate:
        verify_owner_access(e.intent.mandate.owner_id, auth)

    if e.state != EscrowState.DELIVERED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Escrow is in state '{e.state}', expected 'DELIVERED' to run arbitration."
        )

    if not e.deliverables:
        raise HTTPException(status_code=400, detail="No deliverable submitted yet to arbitrate.")

    latest_deliverable = e.deliverables[-1]

    # Advance state to UNDER_ARBITRATION
    await transition_escrow_state(
        db=db,
        escrow=e,
        new_state=EscrowState.UNDER_ARBITRATION.value,
        actor="arbiter",
        reason="AI Arbiter inspecting deliverable."
    )

    verdict_output = await evaluate_deliverable_arbitration(
        spec=e.spec or {},
        content_ref=latest_deliverable.content_ref,
        submission_notes=latest_deliverable.submission_notes
    )

    verdict_rec = ArbiterVerdictRecord(
        escrow_id=e.id,
        verdict=verdict_output.verdict,
        confidence=verdict_output.confidence,
        criteria_results=[c.model_dump() for c in verdict_output.criteria_results],
        explanation=verdict_output.explanation,
        partial_ratio=verdict_output.partial_ratio,
        model=verdict_output.model,
        prompt_version=verdict_output.prompt_version
    )
    db.add(verdict_rec)
    db.commit()

    intent_amount = e.intent.amount_minor if e.intent else 0

    if verdict_output.verdict == "PASS":
        # Capture PayPal authorization
        if e.paypal_authorization_id:
            cap_res = await capture_paypal_authorization(
                authorization_id=e.paypal_authorization_id,
                intent_id=e.intent_id,
                amount_minor=intent_amount,
                final_capture=True,
                escrow_id=e.id,
                db=db
            )
            e.paypal_capture_id = cap_res.get("capture_id")
            db.commit()

        # Commit spend in ledger
        if e.intent:
            record_spend_entry(
                db=db,
                mandate_id=e.intent.mandate_id,
                intent_id=e.intent_id,
                amount_minor=intent_amount,
                kind="COMMIT"
            )

        await transition_escrow_state(
            db=db,
            escrow=e,
            new_state=EscrowState.RELEASED.value,
            actor="paypal",
            reason=f"Arbiter PASS. Captured full amount ${intent_amount/100:.2f}."
        )

    elif verdict_output.verdict == "PARTIAL":
        partial_cents = int(intent_amount * verdict_output.partial_ratio)
        if e.paypal_authorization_id:
            cap_res = await capture_paypal_authorization(
                authorization_id=e.paypal_authorization_id,
                intent_id=e.intent_id,
                amount_minor=partial_cents,
                final_capture=True,
                escrow_id=e.id,
                db=db
            )
            e.paypal_capture_id = cap_res.get("capture_id")
            db.commit()

        # Commit captured amount and release remainder
        if e.intent:
            record_spend_entry(
                db=db,
                mandate_id=e.intent.mandate_id,
                intent_id=e.intent_id,
                amount_minor=partial_cents,
                kind="COMMIT"
            )
            remainder = intent_amount - partial_cents
            if remainder > 0:
                record_spend_entry(
                    db=db,
                    mandate_id=e.intent.mandate_id,
                    intent_id=e.intent_id,
                    amount_minor=remainder,
                    kind="RELEASE"
                )

        await transition_escrow_state(
            db=db,
            escrow=e,
            new_state=EscrowState.PARTIALLY_RELEASED.value,
            actor="paypal",
            reason=f"Arbiter PARTIAL ({verdict_output.partial_ratio*100:.0f}%). Captured ${partial_cents/100:.2f} with final capture."
        )

    elif verdict_output.verdict == "FAIL":
        if e.paypal_authorization_id:
            await void_paypal_authorization(
                authorization_id=e.paypal_authorization_id,
                intent_id=e.intent_id,
                amount_minor=intent_amount,
                escrow_id=e.id,
                db=db
            )

        # Release allocation in ledger
        if e.intent:
            record_spend_entry(
                db=db,
                mandate_id=e.intent.mandate_id,
                intent_id=e.intent_id,
                amount_minor=intent_amount,
                kind="RELEASE"
            )

        await transition_escrow_state(
            db=db,
            escrow=e,
            new_state=EscrowState.REFUNDED.value,
            actor="paypal",
            reason=f"Arbiter FAIL. Authorization voided. Buyer refunded."
        )

    else:  # NEEDS_HUMAN
        await transition_escrow_state(
            db=db,
            escrow=e,
            new_state=EscrowState.NEEDS_HUMAN.value,
            actor="arbiter",
            reason="Confidence below threshold or ambiguous deliverable. Human supervisor required."
        )

    db.refresh(e)
    return build_escrow_response(e)


@router.post("/{escrow_id}/human-decision", response_model=EscrowResponse)
async def submit_human_decision(
    escrow_id: str,
    req: HumanDecisionRequest,
    auth: AuthContext = Depends(require_human),
    db: Session = Depends(get_db)
):
    """Human supervisor override for escalated or contested escrows. Restricted to human owners."""
    e = get_escrow_for_update(db, escrow_id)
    if not e:
        raise HTTPException(status_code=404, detail="Escrow not found")

    if e.intent and e.intent.mandate:
        verify_owner_access(e.intent.mandate.owner_id, auth)

    action_upper = req.action.strip().upper()

    if action_upper == "APPROVE":
        if e.state == EscrowState.ESCALATED.value:
            # Re-check budget rules (R2-R4, R8) before approving escalation
            mandate = get_mandate_for_update(db, e.intent.mandate_id)
            metrics = get_mandate_spend_metrics(db, mandate.id)
            cp = db.query(Counterparty).filter(
                (Counterparty.handle == e.intent.counterparty) | (Counterparty.id == e.intent.counterparty)
            ).first()

            owner_keys = db.query(UserKey).filter(
                UserKey.user_id == mandate.owner_id,
                UserKey.status == "ACTIVE"
            ).all()
            owner_public_keys = [k.public_key for k in owner_keys] if owner_keys else None

            rule_results = evaluate_policy_rules(
                policy=mandate.policy,
                mandate_signature=mandate.signature,
                mandate_status=mandate.status,
                signing_key=settings.MANDATE_SIGNING_KEY,
                amount_minor=e.intent.amount_minor,
                currency=e.intent.currency,
                counterparty=e.intent.counterparty,
                merchant_category=e.intent.merchant_category,
                spent_to_date_minor=metrics["allocated_spend_minor"],
                rolling_24h_spend_minor=metrics["rolling_24h_spend_minor"],
                txns_in_last_hour=metrics["txns_in_last_hour"],
                counterparty_record=cp,
                mandate_public_key=getattr(mandate, "public_key", None),
                mandate_algorithm=getattr(mandate, "signature_algorithm", "ed25519"),
                mandate_owner_id=mandate.owner_id,
                owner_public_keys=owner_public_keys,
            )
            blocking_failures = [r.rule for r in rule_results if not r.passed and r.rule != "R9_ESCALATION_THRESHOLD"]
            if blocking_failures:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot approve escalation: budget or policy constraints violated: {blocking_failures}"
                )

            # Record RESERVE in spend ledger
            record_spend_entry(
                db=db,
                mandate_id=mandate.id,
                intent_id=e.intent_id,
                amount_minor=e.intent.amount_minor,
                kind="RESERVE"
            )

            # Human approves escalated intent -> advance to ORDER_CREATED
            order_res = await create_paypal_order(
                intent_id=e.intent_id,
                amount_minor=e.intent.amount_minor,
                currency=e.intent.currency,
                description=e.intent.description,
                payee_email=cp.paypal_email if cp else None,
                payee_merchant_id=cp.paypal_merchant_id if cp else None,
                return_url=f"{settings.FRONTEND_ORIGIN}/app/escrows/{e.id}?approved=true",
                cancel_url=f"{settings.FRONTEND_ORIGIN}/app/escrows/{e.id}?cancelled=true",
                escrow_id=e.id,
                db=db
            )
            e.paypal_order_id = order_res.get("order_id")
            db.commit()
            await transition_escrow_state(
                db=db,
                escrow=e,
                new_state=EscrowState.ORDER_CREATED.value,
                actor="human",
                reason=f"Human supervisor approved escalation. Notes: {req.notes or 'None'}"
            )
        elif e.state in (EscrowState.NEEDS_HUMAN.value, EscrowState.UNDER_ARBITRATION.value, EscrowState.DELIVERED.value):
            if e.paypal_authorization_id:
                cap_res = await capture_paypal_authorization(
                    authorization_id=e.paypal_authorization_id,
                    intent_id=e.intent_id,
                    amount_minor=e.intent.amount_minor,
                    final_capture=True,
                    escrow_id=e.id,
                    db=db
                )
                e.paypal_capture_id = cap_res.get("capture_id")
                db.commit()

            # Record COMMIT in spend ledger
            if e.intent:
                record_spend_entry(
                    db=db,
                    mandate_id=e.intent.mandate_id,
                    intent_id=e.intent_id,
                    amount_minor=e.intent.amount_minor,
                    kind="COMMIT"
                )

            await transition_escrow_state(
                db=db,
                escrow=e,
                new_state=EscrowState.RELEASED.value,
                actor="human",
                reason=f"Human supervisor manually approved release. Notes: {req.notes or 'None'}"
            )
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Cannot approve escrow in state {e.state}")

    elif action_upper == "REJECT":
        if e.state == EscrowState.ESCALATED.value:
            await transition_escrow_state(
                db=db,
                escrow=e,
                new_state=EscrowState.BLOCKED.value,
                actor="human",
                reason=f"Human supervisor rejected escalated intent. Notes: {req.notes or 'None'}"
            )
        elif e.state in (EscrowState.NEEDS_HUMAN.value, EscrowState.UNDER_ARBITRATION.value, EscrowState.FUNDS_HELD.value, EscrowState.DELIVERED.value):
            if e.paypal_authorization_id:
                await void_paypal_authorization(
                    authorization_id=e.paypal_authorization_id,
                    intent_id=e.intent_id,
                    amount_minor=e.intent.amount_minor if e.intent else 0,
                    escrow_id=e.id,
                    db=db
                )

            # Record RELEASE in spend ledger
            if e.intent:
                record_spend_entry(
                    db=db,
                    mandate_id=e.intent.mandate_id,
                    intent_id=e.intent_id,
                    amount_minor=e.intent.amount_minor,
                    kind="RELEASE"
                )

            await transition_escrow_state(
                db=db,
                escrow=e,
                new_state=EscrowState.REFUNDED.value,
                actor="human",
                reason=f"Human supervisor rejected deliverable. Voided authorization. Notes: {req.notes or 'None'}"
            )
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Cannot reject escrow in state {e.state}")

    else:
        raise HTTPException(status_code=400, detail=f"Invalid action '{req.action}'. Expected 'APPROVE' or 'REJECT'.")

    db.refresh(e)
    return build_escrow_response(e)


@router.post("/reconcile")
async def trigger_escrow_reconciliation(
    max_age_minutes: int = 15,
    db: Session = Depends(get_db)
):
    """
    Background reconciler trigger: polls PayPal for escrows stuck in transient states.
    """
    from app.core.reconciler import reconcile_stuck_escrows
    results = await reconcile_stuck_escrows(db, max_age_minutes=max_age_minutes)
    return {"status": "SUCCESS", "reconciled_count": len(results), "details": results}


@router.post("/check-expiry")
async def trigger_check_expiry(
    warn_threshold_hours: int = 24,
    db: Session = Depends(get_db)
):
    """
    Expiry trigger: checks for escrows whose PayPal hold_expires_at has passed,
    moves them to EXPIRED, voids authorization, and releases reserved budget.
    """
    from app.core.expiry import process_expired_escrows
    results = await process_expired_escrows(db, warn_threshold_hours=warn_threshold_hours)
    return {"status": "SUCCESS", "expired_count": len(results), "details": results}
