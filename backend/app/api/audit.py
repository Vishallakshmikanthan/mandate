from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse, AuditVerifyResponse
from app.core.audit import verify_audit_chain

router = APIRouter(prefix="/audit", tags=["Audit Log"])


@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Retrieve chronologically ordered tamper-evident audit logs."""
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).offset(offset).limit(limit).all()
    return [AuditLogResponse.model_validate(l) for l in logs]


@router.get("/verify", response_model=AuditVerifyResponse)
def verify_integrity(db: Session = Depends(get_db)):
    """
    Cryptographically verify the entire audit log hash chain.
    Walks from genesis to head and verifies all SHA-256 hashes.
    """
    result = verify_audit_chain(db)
    return AuditVerifyResponse(
        valid=result["valid"],
        total_records=result["total_records"],
        head_hash=result.get("head_hash"),
        verified_at=result["verified_at"],
        broken_link_id=result.get("broken_link_id"),
        message=result["message"]
    )
