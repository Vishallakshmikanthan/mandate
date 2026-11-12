from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import get_db
from app.config import settings
from app.models.mandate import Mandate
from app.models.intent import PaymentIntent
from app.models.escrow import Escrow
from app.models.counterparty import Counterparty
from app.schemas.intent import PaymentIntentCreate, PaymentIntentResponse, RuleEvaluationResult
from app.schemas.escrow import EscrowState
from app.core.policy_engine import evaluate_policy_rules, compute_deterministic_verdict
from app.core.risk_scorer import score_intent_risk, apply_tighten_only_rule
from app.core.audit import log_audit_event
from app.core.stream_broadcaster import emit_timeline_event
from app.core.spend_ledger import get_mandate_for_update, get_mandate_spend_metrics, record_spend_entry
from app.paypal.orders import create_paypal_order

router = APIRouter(prefix="/intents", tags=["Payment Intents"])


@router.post("", response_model=PaymentIntentResponse, status_code=status.HTTP_201_CREATED)
async def submit_payment_intent(req: PaymentIntentCreate, db: Session = Depends(get_db)):
    """
    Submit a payment intent through the Mandate Gateway.
    Executes Policy Engine rules (R1-R10) and LLM Risk Scorer.
    Serializes concurrent budget checks with row locking and spend ledger accounting.
    """
    # 0. Acquire row-level lock on the governing mandate
    mandate = get_mandate_for_update(db, req.mandate_id)
    if not mandate:
        raise HTTPException(status_code=404, detail="Mandate not found")

    now_utc = datetime.now(timezone.utc)

    # Compute metrics from ledger (active reserves + settled commits)
    metrics = get_mandate_spend_metrics(db, mandate.id, now_utc=now_utc)
    allocated_spend = metrics["allocated_spend_minor"]
    rolling_24h_spend = metrics["rolling_24h_spend_minor"]
    txns_in_last_hour = metrics["txns_in_last_hour"]

    # Look up counterparty in registry
    counterparty_obj = db.query(Counterparty).filter(
        (Counterparty.handle == req.counterparty) | (Counterparty.id == req.counterparty)
    ).first()

    # 1. Evaluate Deterministic Policy Engine (R1 - R10)
    rule_results = evaluate_policy_rules(
        policy=mandate.policy,
        mandate_signature=mandate.signature,
        mandate_status=mandate.status,
        signing_key=settings.MANDATE_SIGNING_KEY,
        amount_minor=req.amount_minor,
        currency=req.currency,
        counterparty=req.counterparty,
        merchant_category=req.merchant_category,
        spent_to_date_minor=int(allocated_spend),
        rolling_24h_spend_minor=int(rolling_24h_spend),
        txns_in_last_hour=int(txns_in_last_hour),
        now_utc=now_utc,
        counterparty_record=counterparty_obj
    )
    deterministic_verdict = compute_deterministic_verdict(rule_results)

    # 2. Evaluate AI Risk Scorer
    risk_output = await score_intent_risk(
        counterparty=req.counterparty,
        merchant_category=req.merchant_category,
        amount_minor=req.amount_minor,
        currency=req.currency,
        description=req.description,
        source_context=req.source_context
    )

    # 3. Apply Strict Tighten-Only Rule
    final_decision, decision_reason = apply_tighten_only_rule(
        deterministic_verdict=deterministic_verdict,
        risk_recommendation=risk_output.recommendation,
        risk_score=risk_output.risk_score
    )

    intent = PaymentIntent(
        mandate_id=mandate.id,
        counterparty=req.counterparty,
        merchant_category=req.merchant_category,
        amount_minor=req.amount_minor,
        currency=req.currency,
        description=req.description,
        source_context=req.source_context,
        decision=final_decision,
        decision_reasons=[r.model_dump() for r in rule_results],
        risk_score=risk_output.risk_score
    )
    db.add(intent)
    db.commit()
    db.refresh(intent)

    # Log to tamper-evident audit log
    log_audit_event(
        db=db,
        actor="gateway",
        event="INTENT_EVALUATED",
        payload={
            "intent_id": intent.id,
            "mandate_id": mandate.id,
            "decision": final_decision,
            "risk_score": risk_output.risk_score,
            "model_name": risk_output.model_name,
            "prompt_version": risk_output.prompt_version,
            "rule_results": [r.model_dump() for r in rule_results],
            "reason": decision_reason
        }
    )

    # Manage Escrow lifecycle based on decision
    escrow_id = None
    if final_decision == "APPROVED":
        # Record spend reservation in ledger in the same transaction
        record_spend_entry(
            db=db,
            mandate_id=mandate.id,
            intent_id=intent.id,
            amount_minor=req.amount_minor,
            kind="RESERVE"
        )

        escrow = Escrow(
            intent_id=intent.id,
            state=EscrowState.ORDER_CREATED.value,
            spec=req.spec or {"criteria": ["Deliverable meets agreed description"]}
        )
        db.add(escrow)
        db.commit()
        db.refresh(escrow)
        escrow_id = escrow.id

        # Create PayPal Order with intent: AUTHORIZE, seller payee routing, and return URLs
        order_res = await create_paypal_order(
            intent_id=intent.id,
            amount_minor=req.amount_minor,
            currency=req.currency,
            description=req.description,
            payee_email=counterparty_obj.paypal_email if counterparty_obj else None,
            payee_merchant_id=counterparty_obj.paypal_merchant_id if counterparty_obj else None,
            return_url=f"{settings.FRONTEND_ORIGIN}/app/escrows/{escrow.id}?approved=true",
            cancel_url=f"{settings.FRONTEND_ORIGIN}/app/escrows/{escrow.id}?cancelled=true"
        )
        escrow.paypal_order_id = order_res.get("order_id")
        db.commit()

        await emit_timeline_event(
            event_type="GATEWAY_APPROVED",
            actor="gateway",
            step="Gateway Approved",
            summary=f"Payment intent of ${req.amount_minor/100:.2f} approved. PayPal order {escrow.paypal_order_id} created.",
            status="SUCCESS",
            data={"intent_id": intent.id, "escrow_id": escrow.id, "paypal_order_id": escrow.paypal_order_id}
        )

    elif final_decision == "ESCALATED":
        escrow = Escrow(
            intent_id=intent.id,
            state=EscrowState.ESCALATED.value,
            spec=req.spec or {}
        )
        db.add(escrow)
        db.commit()
        db.refresh(escrow)
        escrow_id = escrow.id

        await emit_timeline_event(
            event_type="GATEWAY_ESCALATED",
            actor="gateway",
            step="Gateway Escalated",
            summary=f"Intent of ${req.amount_minor/100:.2f} held for human approval: {decision_reason}",
            status="WARNING",
            data={"intent_id": intent.id, "escrow_id": escrow.id}
        )

    else:  # BLOCKED
        escrow = Escrow(
            intent_id=intent.id,
            state=EscrowState.BLOCKED.value,
            spec=req.spec or {}
        )
        db.add(escrow)
        db.commit()
        db.refresh(escrow)
        escrow_id = escrow.id

        await emit_timeline_event(
            event_type="GATEWAY_BLOCKED",
            actor="gateway",
            step="Gateway Blocked",
            summary=f"BLOCKED: {decision_reason}",
            status="DANGER",
            data={
                "intent_id": intent.id,
                "risk_score": risk_output.risk_score,
                "flags": risk_output.flags,
                "failed_rules": [r.rule for r in rule_results if not r.passed]
            }
        )

    return PaymentIntentResponse(
        id=intent.id,
        mandate_id=intent.mandate_id,
        counterparty=intent.counterparty,
        merchant_category=intent.merchant_category,
        amount_minor=intent.amount_minor,
        currency=intent.currency,
        description=intent.description,
        source_context=intent.source_context,
        decision=intent.decision,
        decision_reasons=[RuleEvaluationResult.model_validate(r) for r in intent.decision_reasons],
        risk_score=intent.risk_score,
        created_at=intent.created_at,
        escrow_id=escrow_id
    )


@router.get("", response_model=List[PaymentIntentResponse])
def list_intents(db: Session = Depends(get_db)):
    """List recent payment intents."""
    intents = db.query(PaymentIntent).order_by(PaymentIntent.created_at.desc()).limit(100).all()
    out = []
    for i in intents:
        escrow = db.query(Escrow).filter(Escrow.intent_id == i.id).first()
        out.append(PaymentIntentResponse(
            id=i.id,
            mandate_id=i.mandate_id,
            counterparty=i.counterparty,
            merchant_category=i.merchant_category,
            amount_minor=i.amount_minor,
            currency=i.currency,
            description=i.description,
            source_context=i.source_context,
            decision=i.decision,
            decision_reasons=[RuleEvaluationResult.model_validate(r) for r in i.decision_reasons],
            risk_score=i.risk_score,
            created_at=i.created_at,
            escrow_id=escrow.id if escrow else None
        ))
    return out


@router.get("/{intent_id}", response_model=PaymentIntentResponse)
def get_intent(intent_id: str, db: Session = Depends(get_db)):
    """Get single intent details."""
    i = db.query(PaymentIntent).filter(PaymentIntent.id == intent_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Payment intent not found")
    escrow = db.query(Escrow).filter(Escrow.intent_id == i.id).first()
    return PaymentIntentResponse(
        id=i.id,
        mandate_id=i.mandate_id,
        counterparty=i.counterparty,
        merchant_category=i.merchant_category,
        amount_minor=i.amount_minor,
        currency=i.currency,
        description=i.description,
        source_context=i.source_context,
        decision=i.decision,
        decision_reasons=[RuleEvaluationResult.model_validate(r) for r in i.decision_reasons],
        risk_score=i.risk_score,
        created_at=i.created_at,
        escrow_id=escrow.id if escrow else None
    )
