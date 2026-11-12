from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import get_db
from app.models.mandate import Mandate
from app.models.intent import PaymentIntent

router = APIRouter(prefix="/agents", tags=["Agents"])


class AgentResponse(BaseModel):
    id: str = ""
    name: str
    description: str
    type: str  # "buyer" | "seller"
    status: str  # "ACTIVE" | "PAUSED"
    mandate_id: Optional[str] = None
    total_spend_minor: int = 0
    tx_count: int = 0
    created_at: str


class AgentCreate(BaseModel):
    id: str
    name: str
    description: str
    type: str = "buyer"


@router.get("", response_model=List[AgentResponse])
def list_agents(db: Session = Depends(get_db)):
    """List all registered agents discovered from mandates and payments."""
    mandates = db.query(Mandate).all()
    agents_map = {}

    for m in mandates:
        aid = m.agent_id
        if aid not in agents_map:
            # Query payments for this mandate
            spent = db.query(func.sum(PaymentIntent.amount_minor)).filter(
                PaymentIntent.mandate_id == m.id,
                PaymentIntent.decision == "APPROVED"
            ).scalar() or 0
            tx_cnt = db.query(func.count(PaymentIntent.id)).filter(
                PaymentIntent.mandate_id == m.id
            ).scalar() or 0

            policy_name = m.policy.get("name", aid.replace("_", " ").title()) if isinstance(m.policy, dict) else aid.replace("_", " ").title()

            agents_map[aid] = AgentResponse(
                id=aid,
                name=policy_name if "agent" in policy_name.lower() else f"{aid.replace('_', ' ').title()}",
                description=f"Autonomous agent operating under spending mandate {m.id[:8]}.",
                type="seller" if "seller" in aid.lower() else "buyer",
                status="ACTIVE" if m.status == "ACTIVE" else "PAUSED",
                mandate_id=m.id,
                total_spend_minor=spent,
                tx_count=tx_cnt,
                created_at=m.created_at.isoformat()
            )

    return list(agents_map.values())


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    mandates = db.query(Mandate).filter(Mandate.agent_id == agent_id).all()
    if not mandates:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found.")

    m = mandates[0]
    spent = db.query(func.sum(PaymentIntent.amount_minor)).filter(
        PaymentIntent.mandate_id == m.id,
        PaymentIntent.decision == "APPROVED"
    ).scalar() or 0
    tx_cnt = db.query(func.count(PaymentIntent.id)).filter(
        PaymentIntent.mandate_id == m.id
    ).scalar() or 0

    return AgentResponse(
        id=agent_id,
        name=agent_id.replace("_", " ").title(),
        description=f"Autonomous agent operating under spending mandate {m.id[:8]}.",
        type="seller" if "seller" in agent_id.lower() else "buyer",
        status="ACTIVE" if m.status == "ACTIVE" else "PAUSED",
        mandate_id=m.id,
        total_spend_minor=spent,
        tx_count=tx_cnt,
        created_at=m.created_at.isoformat()
    )
