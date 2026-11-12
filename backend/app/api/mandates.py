from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import get_db
from app.config import settings
from app.models.mandate import Mandate
from app.models.intent import PaymentIntent
from app.schemas.mandate import MandateCreate, MandateResponse, MandateRevoke, MandatePolicy
from app.core.mandate_signing import sign_policy, canonicalize_policy
from app.core.audit import log_audit_event
from app.core.stream_broadcaster import emit_timeline_event
from app.core.spend_ledger import get_mandate_spend_metrics

router = APIRouter(prefix="/mandates", tags=["Mandates"])


def get_spent_to_date(db: Session, mandate_id: str) -> int:
    """Calculate cumulative settled spend from the spend ledger."""
    metrics = get_mandate_spend_metrics(db, mandate_id)
    return metrics["spent_to_date_minor"]


@router.post("", response_model=MandateResponse, status_code=status.HTTP_201_CREATED)
async def create_mandate(req: MandateCreate, db: Session = Depends(get_db)):
    """
    Create a new cryptographic spending mandate.
    Calculates HMAC-SHA256 signature over the canonical policy JSON.
    """
    policy_dict = req.policy.model_dump(mode="json")
    signature = sign_policy(policy_dict, settings.MANDATE_SIGNING_KEY)

    mandate = Mandate(
        owner_id=req.owner_id,
        agent_id=req.agent_id,
        policy=policy_dict,
        signature=signature,
        status="ACTIVE",
        expires_at=req.policy.expires_at
    )
    db.add(mandate)
    db.commit()
    db.refresh(mandate)

    log_audit_event(
        db=db,
        actor="human",
        event="MANDATE_CREATED",
        payload={
            "mandate_id": mandate.id,
            "owner_id": mandate.owner_id,
            "agent_id": mandate.agent_id,
            "signature": mandate.signature,
            "policy": mandate.policy
        }
    )

    await emit_timeline_event(
        event_type="MANDATE_CREATED",
        actor="human",
        step="Mandate Issued",
        summary=f"New cryptographic mandate issued for agent '{mandate.agent_id}' (Cap: ${req.policy.max_per_transaction_minor/100:.2f}).",
        status="SUCCESS",
        data={"mandate_id": mandate.id, "signature": mandate.signature}
    )

    return MandateResponse(
        id=mandate.id,
        owner_id=mandate.owner_id,
        agent_id=mandate.agent_id,
        policy=MandatePolicy.model_validate(mandate.policy),
        signature=mandate.signature,
        status=mandate.status,
        created_at=mandate.created_at,
        expires_at=mandate.expires_at,
        spent_to_date_minor=0,
        remaining_budget_minor=req.policy.max_total_minor
    )


@router.get("", response_model=List[MandateResponse])
def list_mandates(db: Session = Depends(get_db)):
    """List all mandates with spend stats computed from the immutable ledger."""
    mandates = db.query(Mandate).order_by(Mandate.created_at.desc()).all()
    out = []
    for m in mandates:
        metrics = get_mandate_spend_metrics(db, m.id)
        max_total = m.policy.get("max_total_minor", 0)
        out.append(MandateResponse(
            id=m.id,
            owner_id=m.owner_id,
            agent_id=m.agent_id,
            policy=MandatePolicy.model_validate(m.policy),
            signature=m.signature,
            status=m.status,
            created_at=m.created_at,
            expires_at=m.expires_at,
            spent_to_date_minor=metrics["spent_to_date_minor"],
            remaining_budget_minor=max(0, max_total - metrics["allocated_spend_minor"])
        ))
    return out


@router.get("/{mandate_id}", response_model=MandateResponse)
def get_mandate(mandate_id: str, db: Session = Depends(get_db)):
    """Get single mandate details and spend balance from the immutable ledger."""
    m = db.query(Mandate).filter(Mandate.id == mandate_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mandate not found")

    metrics = get_mandate_spend_metrics(db, m.id)
    max_total = m.policy.get("max_total_minor", 0)
    return MandateResponse(
        id=m.id,
        owner_id=m.owner_id,
        agent_id=m.agent_id,
        policy=MandatePolicy.model_validate(m.policy),
        signature=m.signature,
        status=m.status,
        created_at=m.created_at,
        expires_at=m.expires_at,
        spent_to_date_minor=metrics["spent_to_date_minor"],
        remaining_budget_minor=max(0, max_total - metrics["allocated_spend_minor"])
    )


@router.post("/{mandate_id}/revoke", response_model=MandateResponse)
async def revoke_mandate(mandate_id: str, req: Optional[MandateRevoke] = None, db: Session = Depends(get_db)):
    """
    Emergency kill-switch. Revokes a mandate immediately.
    Subsequent intents referencing this mandate will be blocked at R1.
    """
    m = db.query(Mandate).filter(Mandate.id == mandate_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mandate not found")

    m.status = "REVOKED"
    db.commit()
    db.refresh(m)

    log_audit_event(
        db=db,
        actor="human",
        event="MANDATE_REVOKED",
        payload={"mandate_id": m.id, "reason": req.reason if req else "Manual killswitch triggered"}
    )

    await emit_timeline_event(
        event_type="MANDATE_REVOKED",
        actor="human",
        step="Killswitch Activated",
        summary=f"Emergency killswitch activated. Mandate {m.id} REVOKED.",
        status="DANGER",
        data={"mandate_id": m.id}
    )

    spent = get_spent_to_date(db, m.id)
    max_total = m.policy.get("max_total_minor", 0)
    return MandateResponse(
        id=m.id,
        owner_id=m.owner_id,
        agent_id=m.agent_id,
        policy=MandatePolicy.model_validate(m.policy),
        signature=m.signature,
        status=m.status,
        created_at=m.created_at,
        expires_at=m.expires_at,
        spent_to_date_minor=spent,
        remaining_budget_minor=max(0, max_total - spent)
    )
