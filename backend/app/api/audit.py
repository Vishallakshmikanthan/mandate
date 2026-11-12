from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse, AuditVerifyResponse, AuditCheckpointResponse
from app.core.audit import verify_audit_chain
from app.core.checkpoint import (
    publish_checkpoint,
    get_latest_external_checkpoint,
    verify_audit_against_checkpoints,
)
from app.core.auth import get_current_user_or_agent, require_human, AuthContext

router = APIRouter(prefix="/audit", tags=["Audit Log"])


@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    auth: AuthContext = Depends(get_current_user_or_agent),
    db: Session = Depends(get_db)
):
    """Retrieve chronologically ordered tamper-evident audit logs."""
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).offset(offset).limit(limit).all()
    return [AuditLogResponse.model_validate(l) for l in logs]


@router.get("/verify", response_model=AuditVerifyResponse)
def verify_integrity(
    auth: AuthContext = Depends(get_current_user_or_agent),
    db: Session = Depends(get_db)
):
    """
    Cryptographically verify the entire audit log hash chain and compare against
    the latest external immutable signed checkpoint anchor.
    Detects internal payload modifications and full database history rewrites.
    """
    result = verify_audit_against_checkpoints(db)
    return AuditVerifyResponse(
        valid=result["valid"],
        total_records=result["total_records"],
        head_hash=result.get("head_hash"),
        verified_at=result["verified_at"],
        broken_link_id=result.get("broken_link_id"),
        message=result["message"],
        checkpoint_verified=result.get("checkpoint_verified"),
        external_checkpoint=result.get("external_checkpoint"),
    )


@router.post("/checkpoint", response_model=AuditCheckpointResponse, status_code=status.HTTP_201_CREATED)
def trigger_checkpoint(
    auth: AuthContext = Depends(require_human),
    db: Session = Depends(get_db)
):
    """
    Periodically or on-demand produce an immutable signed checkpoint of the current
    audit log head and publish it outside the database.
    """
    checkpoint = publish_checkpoint(db=db, force=True)
    return AuditCheckpointResponse(
        checkpoint_id=checkpoint["checkpoint_id"],
        head_hash=checkpoint["head_hash"],
        record_count=checkpoint["record_count"],
        timestamp=checkpoint["timestamp"],
        signature=checkpoint["signature"],
        public_key=checkpoint.get("public_key"),
        algorithm=checkpoint["algorithm"],
    )


@router.get("/checkpoint/latest", response_model=Optional[AuditCheckpointResponse])
def get_latest_checkpoint(
    auth: AuthContext = Depends(get_current_user_or_agent),
):
    """Retrieve the latest external signed anchor checkpoint."""
    chk = get_latest_external_checkpoint()
    if not chk:
        return None
    return AuditCheckpointResponse(
        checkpoint_id=chk["checkpoint_id"],
        head_hash=chk["head_hash"],
        record_count=chk["record_count"],
        timestamp=chk["timestamp"],
        signature=chk["signature"],
        public_key=chk.get("public_key"),
        algorithm=chk["algorithm"],
    )
