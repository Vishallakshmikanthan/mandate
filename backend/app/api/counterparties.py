from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.counterparty import Counterparty
from app.schemas.counterparty import CounterpartyCreate, CounterpartyResponse, CounterpartyUpdate
from app.core.auth import get_current_user_or_agent, require_human, AuthContext

router = APIRouter(prefix="/counterparties", tags=["Counterparties"])


@router.get("", response_model=List[CounterpartyResponse])
def list_counterparties(
    auth: AuthContext = Depends(get_current_user_or_agent),
    db: Session = Depends(get_db)
):
    """List all registered counterparties."""
    return db.query(Counterparty).order_by(Counterparty.created_at.desc()).all()


@router.post("", response_model=CounterpartyResponse, status_code=status.HTTP_201_CREATED)
def register_counterparty(
    req: CounterpartyCreate,
    auth: AuthContext = Depends(require_human),
    db: Session = Depends(get_db)
):
    """Register a new counterparty merchant or agent. Requires human supervisor."""
    existing = db.query(Counterparty).filter(Counterparty.handle == req.handle).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Counterparty with handle '{req.handle}' already exists."
        )

    verified_at = datetime.now(timezone.utc) if req.status == "VERIFIED" else None
    cp = Counterparty(
        handle=req.handle,
        paypal_merchant_id=req.paypal_merchant_id,
        paypal_email=req.paypal_email,
        status=req.status or "UNVERIFIED",
        verified_at=verified_at
    )
    db.add(cp)
    db.commit()
    db.refresh(cp)
    return cp


@router.get("/{id_or_handle}", response_model=CounterpartyResponse)
def get_counterparty(
    id_or_handle: str,
    auth: AuthContext = Depends(get_current_user_or_agent),
    db: Session = Depends(get_db)
):
    """Get a counterparty by its UUID or handle."""
    cp = db.query(Counterparty).filter(
        (Counterparty.id == id_or_handle) | (Counterparty.handle == id_or_handle)
    ).first()
    if not cp:
        raise HTTPException(status_code=404, detail=f"Counterparty '{id_or_handle}' not found.")
    return cp


@router.post("/{id_or_handle}/verify", response_model=CounterpartyResponse)
def verify_counterparty(
    id_or_handle: str,
    auth: AuthContext = Depends(require_human),
    db: Session = Depends(get_db)
):
    """Mark a counterparty as VERIFIED. Requires human supervisor."""
    cp = db.query(Counterparty).filter(
        (Counterparty.id == id_or_handle) | (Counterparty.handle == id_or_handle)
    ).first()
    if not cp:
        raise HTTPException(status_code=404, detail=f"Counterparty '{id_or_handle}' not found.")
    cp.status = "VERIFIED"
    cp.verified_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(cp)
    return cp


@router.post("/{id_or_handle}/block", response_model=CounterpartyResponse)
def block_counterparty(
    id_or_handle: str,
    auth: AuthContext = Depends(require_human),
    db: Session = Depends(get_db)
):
    """Block an untrusted counterparty. Requires human supervisor."""
    cp = db.query(Counterparty).filter(
        (Counterparty.id == id_or_handle) | (Counterparty.handle == id_or_handle)
    ).first()
    if not cp:
        raise HTTPException(status_code=404, detail=f"Counterparty '{id_or_handle}' not found.")
    cp.status = "BLOCKED"
    db.commit()
    db.refresh(cp)
    return cp

    cp.status = "VERIFIED"
    cp.verified_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(cp)
    return cp


@router.post("/{id_or_handle}/block", response_model=CounterpartyResponse)
def block_counterparty(id_or_handle: str, db: Session = Depends(get_db)):
    """Block a counterparty."""
    cp = db.query(Counterparty).filter(
        (Counterparty.id == id_or_handle) | (Counterparty.handle == id_or_handle)
    ).first()
    if not cp:
        raise HTTPException(status_code=404, detail=f"Counterparty '{id_or_handle}' not found.")

    cp.status = "BLOCKED"
    db.commit()
    db.refresh(cp)
    return cp
