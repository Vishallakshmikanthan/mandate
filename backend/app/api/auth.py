from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.models.api_key import APIKey
from app.core.auth import (
    hash_password,
    verify_password,
    create_session_token,
    generate_api_key_pair,
    get_current_user_or_agent,
    require_human,
    AuthContext,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class UserRegisterRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class UserLoginRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str


class AuthResponse(BaseModel):
    token: str
    token_type: str = "Bearer"
    user_id: str
    email: str
    full_name: Optional[str] = None
    role: str


class APIKeyCreateRequest(BaseModel):
    name: str
    scopes: List[str] = Field(default_factory=lambda: ["intents:create", "escrows:deliver", "intents:read"])
    agent_id: Optional[str] = None
    mandate_id: Optional[str] = None
    counterparty_handle: Optional[str] = None


class APIKeyCreateResponse(BaseModel):
    id: str
    name: str
    raw_key: str = Field(..., description="Plaintext secret API key. Store safely, will not be shown again.")
    key_prefix: str
    scopes: List[str]
    agent_id: Optional[str] = None
    mandate_id: Optional[str] = None
    counterparty_handle: Optional[str] = None
    created_at: datetime


class APIKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    scopes: List[str]
    agent_id: Optional[str] = None
    mandate_id: Optional[str] = None
    counterparty_handle: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new human supervisor account."""
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = User(
        email=req.email.lower().strip(),
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role="USER",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_session_token(user.id, user.email, user.role)
    return AuthResponse(
        token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role
    )


@router.post("/login", response_model=AuthResponse)
def login_user(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate human supervisor with email and password."""
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")

    token = create_session_token(user.id, user.email, user.role)
    return AuthResponse(
        token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role
    )


@router.get("/me")
def get_current_user_profile(auth: AuthContext = Depends(get_current_user_or_agent), db: Session = Depends(get_db)):
    """Return identity and permission profile of the authenticated caller."""
    return {
        "actor_type": auth.actor_type,
        "user_id": auth.user_id,
        "email": auth.email,
        "role": auth.role,
        "agent_id": auth.agent_id,
        "mandate_id": auth.mandate_id,
        "counterparty_handle": auth.counterparty_handle,
        "scopes": auth.scopes,
        "is_admin": auth.is_admin
    }


@router.post("/api-keys", response_model=APIKeyCreateResponse, status_code=status.HTTP_201_CREATED)
def create_agent_api_key(
    req: APIKeyCreateRequest,
    auth: AuthContext = Depends(require_human),
    db: Session = Depends(get_db)
):
    """Human supervisor creates a scoped agent API key."""
    raw_key, key_record = generate_api_key_pair(
        name=req.name,
        owner_id=auth.user_id,
        scopes=req.scopes,
        agent_id=req.agent_id,
        mandate_id=req.mandate_id,
        counterparty_handle=req.counterparty_handle
    )
    db.add(key_record)
    db.commit()
    db.refresh(key_record)

    return APIKeyCreateResponse(
        id=key_record.id,
        name=key_record.name,
        raw_key=raw_key,
        key_prefix=key_record.key_prefix,
        scopes=key_record.scopes,
        agent_id=key_record.agent_id,
        mandate_id=key_record.mandate_id,
        counterparty_handle=key_record.counterparty_handle,
        created_at=key_record.created_at
    )


@router.get("/api-keys", response_model=List[APIKeyResponse])
def list_agent_api_keys(
    auth: AuthContext = Depends(require_human),
    db: Session = Depends(get_db)
):
    """List all API keys owned by the current human supervisor."""
    keys = db.query(APIKey).filter(APIKey.owner_id == auth.user_id).order_by(APIKey.created_at.desc()).all()
    return [
        APIKeyResponse(
            id=k.id,
            name=k.name,
            key_prefix=k.key_prefix,
            scopes=k.scopes,
            agent_id=k.agent_id,
            mandate_id=k.mandate_id,
            counterparty_handle=k.counterparty_handle,
            is_active=k.is_active,
            created_at=k.created_at,
            last_used_at=k.last_used_at
        )
        for k in keys
    ]


@router.delete("/api-keys/{key_id}")
def revoke_agent_api_key(
    key_id: str,
    auth: AuthContext = Depends(require_human),
    db: Session = Depends(get_db)
):
    """Revoke an agent API key."""
    key = db.query(APIKey).filter(APIKey.id == key_id, APIKey.owner_id == auth.user_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found.")

    key.is_active = False
    db.commit()
    return {"status": "SUCCESS", "message": f"API key '{key.name}' revoked successfully."}
