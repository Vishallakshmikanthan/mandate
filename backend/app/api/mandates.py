from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import get_db
from app.config import settings
from app.models.mandate import Mandate
from app.models.user_key import UserKey
from app.models.intent import PaymentIntent
from app.schemas.mandate import (
    MandateCreate,
    MandateResponse,
    MandateRevoke,
    MandatePolicy,
    MandateRotateKey,
)
from app.core.mandate_signing import (
    sign_policy,
    sign_policy_hmac,
    verify_policy_hmac,
    verify_policy_ed25519,
    canonicalize_policy,
)
from app.core.audit import log_audit_event
from app.core.stream_broadcaster import emit_timeline_event
from app.core.spend_ledger import get_mandate_spend_metrics
from app.core.auth import (
    get_current_user_or_agent,
    require_human,
    verify_owner_access,
    AuthContext,
)

router = APIRouter(prefix="/mandates", tags=["Mandates"])


def get_spent_to_date(db: Session, mandate_id: str) -> int:
    """Calculate cumulative settled spend from the spend ledger."""
    metrics = get_mandate_spend_metrics(db, mandate_id)
    return metrics["spent_to_date_minor"]


@router.post("", response_model=MandateResponse, status_code=status.HTTP_201_CREATED)
async def create_mandate(
    req: MandateCreate,
    auth: AuthContext = Depends(require_human),
    db: Session = Depends(get_db)
):
    """
    Create a new cryptographic spending mandate.
    Requires human supervisor account. Sets owner_id to authenticated user.
    Enforces asymmetric Ed25519 client signature; HMAC fallback permitted only in APP_ENV=demo.
    """
    effective_owner_id = auth.user_id if auth.user_id != "usr_demo_supervisor_001" else (req.owner_id or auth.user_id)
    policy_dict = req.policy.model_dump(mode="json")

    public_key = req.public_key
    key_id = req.key_id
    signature_algorithm = req.signature_algorithm or ("ed25519" if public_key else "hmac-sha256")

    if public_key and req.signature:
        if signature_algorithm == "ed25519":
            valid = verify_policy_ed25519(policy_dict, req.signature, public_key)
            if not valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Ed25519 signature: client signature does not verify against canonical policy."
                )
            # Verify or register key ownership
            existing_key = db.query(UserKey).filter(UserKey.public_key == public_key).first()
            if existing_key:
                if existing_key.user_id != effective_owner_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Public key belongs to another user."
                    )
            else:
                assigned_key_id = key_id or f"key_{public_key[:8]}"
                new_key = UserKey(
                    user_id=effective_owner_id,
                    key_id=assigned_key_id,
                    public_key=public_key,
                    algorithm="ed25519",
                    status="ACTIVE"
                )
                db.add(new_key)
                db.commit()

            signature = req.signature
            key_id = key_id or f"key_{public_key[:8]}"
        elif signature_algorithm == "hmac-sha256":
            if settings.APP_ENV != "demo":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="HMAC mandate signatures are only permitted in APP_ENV=demo."
                )
            valid = verify_policy_hmac(policy_dict, req.signature, settings.MANDATE_SIGNING_KEY)
            if not valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid HMAC signature."
                )
            signature = req.signature
            public_key = None
            key_id = None
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported signature algorithm '{signature_algorithm}'."
            )
    else:
        # No signature/public key provided
        if settings.APP_ENV == "demo":
            signature = sign_policy_hmac(policy_dict, settings.MANDATE_SIGNING_KEY)
            public_key = None
            key_id = None
            signature_algorithm = "hmac-sha256"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="In non-demo environments, mandates must be signed by the client with an Ed25519 private key."
            )

    mandate = Mandate(
        owner_id=effective_owner_id,
        agent_id=req.agent_id,
        policy=policy_dict,
        signature=signature,
        public_key=public_key,
        key_id=key_id,
        signature_algorithm=signature_algorithm,
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
            "public_key": mandate.public_key,
            "key_id": mandate.key_id,
            "signature_algorithm": mandate.signature_algorithm,
            "policy": mandate.policy
        }
    )

    await emit_timeline_event(
        event_type="MANDATE_CREATED",
        actor="human",
        step="Mandate Issued",
        summary=f"New cryptographic mandate issued for agent '{mandate.agent_id}' (Cap: ${req.policy.max_per_transaction_minor/100:.2f}, Algo: {mandate.signature_algorithm}).",
        status="SUCCESS",
        data={"mandate_id": mandate.id, "signature": mandate.signature, "algorithm": mandate.signature_algorithm}
    )

    return MandateResponse(
        id=mandate.id,
        owner_id=mandate.owner_id,
        agent_id=mandate.agent_id,
        policy=MandatePolicy.model_validate(mandate.policy),
        signature=mandate.signature,
        public_key=mandate.public_key,
        key_id=mandate.key_id,
        signature_algorithm=mandate.signature_algorithm,
        status=mandate.status,
        created_at=mandate.created_at,
        expires_at=mandate.expires_at,
        spent_to_date_minor=0,
        remaining_budget_minor=req.policy.max_total_minor
    )


@router.post("/{mandate_id}/rotate-key", response_model=MandateResponse)
async def rotate_mandate_key(
    mandate_id: str,
    req: MandateRotateKey,
    auth: AuthContext = Depends(require_human),
    db: Session = Depends(get_db)
):
    """
    Rotate the cryptographic key on an existing active mandate.
    Requires human supervisor account owning the mandate.
    Verifies the new signature against canonical policy with the new public key.
    """
    mandate = db.query(Mandate).filter(Mandate.id == mandate_id).first()
    if not mandate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mandate not found")

    verify_owner_access(mandate.owner_id, auth)

    if mandate.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot rotate key on mandate in status '{mandate.status}'."
        )

    # Verify new signature
    valid = verify_policy_ed25519(mandate.policy, req.new_signature, req.new_public_key)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New signature is invalid for this mandate's canonical policy."
        )

    # Verify key registration
    existing_key = db.query(UserKey).filter(UserKey.public_key == req.new_public_key).first()
    if existing_key and existing_key.user_id != mandate.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="New public key belongs to another user."
        )

    if not existing_key:
        new_key = UserKey(
            user_id=mandate.owner_id,
            key_id=req.new_key_id,
            public_key=req.new_public_key,
            algorithm="ed25519",
            status="ACTIVE"
        )
        db.add(new_key)

    # If old key exists, mark it as ROTATED
    if mandate.key_id:
        old_user_key = db.query(UserKey).filter(
            UserKey.user_id == mandate.owner_id,
            UserKey.key_id == mandate.key_id
        ).first()
        if old_user_key:
            old_user_key.status = "ROTATED"

    mandate.key_id = req.new_key_id
    mandate.public_key = req.new_public_key
    mandate.signature = req.new_signature
    mandate.signature_algorithm = "ed25519"
    db.commit()
    db.refresh(mandate)

    log_audit_event(
        db=db,
        actor="human",
        event="MANDATE_KEY_ROTATED",
        payload={
            "mandate_id": mandate.id,
            "owner_id": mandate.owner_id,
            "new_key_id": mandate.key_id,
            "new_public_key": mandate.public_key,
        }
    )

    await emit_timeline_event(
        event_type="MANDATE_KEY_ROTATED",
        actor="human",
        step="Mandate Key Rotated",
        summary=f"Cryptographic key rotated for mandate '{mandate.id}' (New Key ID: {mandate.key_id}).",
        status="SUCCESS",
        data={"mandate_id": mandate.id, "key_id": mandate.key_id}
    )

    metrics = get_mandate_spend_metrics(db, mandate.id)
    return MandateResponse(
        id=mandate.id,
        owner_id=mandate.owner_id,
        agent_id=mandate.agent_id,
        policy=MandatePolicy.model_validate(mandate.policy),
        signature=mandate.signature,
        public_key=mandate.public_key,
        key_id=mandate.key_id,
        signature_algorithm=mandate.signature_algorithm,
        status=mandate.status,
        created_at=mandate.created_at,
        expires_at=mandate.expires_at,
        spent_to_date_minor=metrics["spent_to_date_minor"],
        remaining_budget_minor=max(0, mandate.policy.get("max_total_minor", 0) - metrics["allocated_spend_minor"]),
    )


@router.get("", response_model=List[MandateResponse])
def list_mandates(
    auth: AuthContext = Depends(get_current_user_or_agent),
    db: Session = Depends(get_db)
):
    """List mandates scoped to current owner, or all for admin."""
    query = db.query(Mandate)
    if not auth.is_admin:
        query = query.filter(Mandate.owner_id == auth.user_id)
    mandates = query.order_by(Mandate.created_at.desc()).all()
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
            public_key=m.public_key,
            key_id=m.key_id,
            signature_algorithm=m.signature_algorithm,
            status=m.status,
            created_at=m.created_at,
            expires_at=m.expires_at,
            spent_to_date_minor=metrics["spent_to_date_minor"],
            remaining_budget_minor=max(0, max_total - metrics["allocated_spend_minor"])
        ))
    return out


@router.get("/{mandate_id}", response_model=MandateResponse)
def get_mandate(
    mandate_id: str,
    auth: AuthContext = Depends(get_current_user_or_agent),
    db: Session = Depends(get_db)
):
    """Get single mandate details. Enforces owner scoping."""
    m = db.query(Mandate).filter(Mandate.id == mandate_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mandate not found")

    verify_owner_access(m.owner_id, auth)

    metrics = get_mandate_spend_metrics(db, m.id)
    max_total = m.policy.get("max_total_minor", 0)
    return MandateResponse(
        id=m.id,
        owner_id=m.owner_id,
        agent_id=m.agent_id,
        policy=MandatePolicy.model_validate(m.policy),
        signature=m.signature,
        public_key=m.public_key,
        key_id=m.key_id,
        signature_algorithm=m.signature_algorithm,
        status=m.status,
        created_at=m.created_at,
        expires_at=m.expires_at,
        spent_to_date_minor=metrics["spent_to_date_minor"],
        remaining_budget_minor=max(0, max_total - metrics["allocated_spend_minor"])
    )


@router.post("/{mandate_id}/revoke", response_model=MandateResponse)
async def revoke_mandate(
    mandate_id: str,
    req: Optional[MandateRevoke] = None,
    auth: AuthContext = Depends(require_human),
    db: Session = Depends(get_db)
):
    """
    Emergency kill-switch. Requires human supervisor owner. Revokes a mandate immediately.
    """
    m = db.query(Mandate).filter(Mandate.id == mandate_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mandate not found")

    verify_owner_access(m.owner_id, auth)

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
        public_key=m.public_key,
        key_id=m.key_id,
        signature_algorithm=m.signature_algorithm,
        status=m.status,
        created_at=m.created_at,
        expires_at=m.expires_at,
        spent_to_date_minor=spent,
        remaining_budget_minor=max(0, max_total - spent)
    )
