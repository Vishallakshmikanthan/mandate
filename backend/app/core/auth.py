import hmac
import time
import base64
import json
import hashlib
import secrets
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Header, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.config import settings
from app.models.user import User
from app.models.api_key import APIKey

logger = logging.getLogger("mandate.auth")
ph = PasswordHasher()


# ==============================================================================
# Password Hashing & Verification (argon2)
# ==============================================================================

def hash_password(plain_password: str) -> str:
    """Hash password securely using argon2."""
    return ph.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against argon2 hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, Exception):
        return False


# ==============================================================================
# Session Tokens for Human Users (HMAC-SHA256 Signed JSON Tokens)
# ==============================================================================

def create_session_token(
    user_id: str,
    email: str,
    role: str = "USER",
    expires_in_seconds: int = 86400
) -> str:
    """Generate a tamper-proof signed session token."""
    payload = {
        "uid": user_id,
        "email": email,
        "role": role,
        "exp": int(time.time()) + expires_in_seconds
    }
    raw_json = json.dumps(payload, separators=(',', ':')).encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(raw_json).decode("utf-8").rstrip("=")
    signature = hmac.new(
        settings.MANDATE_SIGNING_KEY.encode("utf-8"),
        b64_payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return f"{b64_payload}.{signature}"


def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify session token signature and check expiration."""
    if not token or "." not in token:
        return None
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        b64_payload, signature = parts
        expected_sig = hmac.new(
            settings.MANDATE_SIGNING_KEY.encode("utf-8"),
            b64_payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_sig):
            return None

        # Add padding back if necessary
        padding = 4 - (len(b64_payload) % 4)
        if padding != 4:
            b64_payload += "=" * padding

        data = json.loads(base64.urlsafe_b64decode(b64_payload.encode("utf-8")).decode("utf-8"))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception as exc:
        logger.debug("Session token verification failed: %s", exc)
        return None


# ==============================================================================
# Agent API Key Management
# ==============================================================================

def hash_api_key(raw_key: str) -> str:
    """Compute SHA-256 hash of API key for safe database storage."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def generate_api_key_pair(
    name: str,
    owner_id: str,
    scopes: List[str],
    agent_id: Optional[str] = None,
    mandate_id: Optional[str] = None,
    counterparty_handle: Optional[str] = None
) -> Tuple[str, APIKey]:
    """
    Generate a new API key pair. Returns (raw_key, api_key_model).
    The raw key is only shown once to the user/agent.
    """
    prefix = f"mnd_{secrets.token_hex(4)}"
    secret = secrets.token_urlsafe(32)
    raw_key = f"{prefix}_{secret}"
    key_hash = hash_api_key(raw_key)

    key_record = APIKey(
        key_hash=key_hash,
        key_prefix=prefix,
        name=name,
        owner_id=owner_id,
        agent_id=agent_id,
        mandate_id=mandate_id,
        counterparty_handle=counterparty_handle,
        scopes=scopes,
        is_active=True
    )
    return raw_key, key_record


# ==============================================================================
# AuthContext & Dependencies
# ==============================================================================

class AuthContext(BaseModel):
    is_authenticated: bool = True
    actor_type: str = "HUMAN"  # "HUMAN" | "AGENT"
    user_id: str
    email: Optional[str] = None
    role: str = "USER"  # "USER" | "ADMIN"
    agent_id: Optional[str] = None
    mandate_id: Optional[str] = None
    counterparty_handle: Optional[str] = None
    scopes: List[str] = Field(default_factory=lambda: ["*"])

    @property
    def is_admin(self) -> bool:
        return self.role == "ADMIN"

    def has_scope(self, required_scope: str) -> bool:
        if "*" in self.scopes or "admin" in self.scopes:
            return True
        return required_scope in self.scopes


# Simple in-memory sliding rate limiter per caller
_caller_request_timestamps: Dict[str, List[float]] = {}


def check_rate_limit(caller_id: str, max_requests: int = 120, window_seconds: int = 60):
    """Enforce request rate limit per caller."""
    now = time.time()
    cutoff = now - window_seconds
    timestamps = _caller_request_timestamps.get(caller_id, [])
    timestamps = [t for t in timestamps if t > cutoff]
    if len(timestamps) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: maximum {max_requests} requests per {window_seconds}s."
        )
    timestamps.append(now)
    _caller_request_timestamps[caller_id] = timestamps


async def get_current_user_or_agent(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> AuthContext:
    """
    Authenticate request via Bearer Session Token (Human) or X-API-Key (Agent).
    In demo mode, unauthenticated requests fallback to a demo supervisor context.
    """
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    # 1. Human Session Token (Bearer)
    if token:
        token_data = verify_session_token(token)
        if not token_data:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session token.")
        user = db.query(User).filter(User.id == token_data["uid"]).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found or disabled.")

        check_rate_limit(f"user:{user.id}")
        return AuthContext(
            actor_type="HUMAN",
            user_id=user.id,
            email=user.email,
            role=user.role,
            scopes=["*"]
        )

    # 2. Agent Scoped API Key (X-API-Key)
    if x_api_key:
        h = hash_api_key(x_api_key.strip())
        key = db.query(APIKey).filter(APIKey.key_hash == h).first()
        if not key or not key.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or revoked API key.")

        key.last_used_at = datetime.now(timezone.utc)
        db.commit()

        check_rate_limit(f"apikey:{key.id}")
        return AuthContext(
            actor_type="AGENT",
            user_id=key.owner_id,
            agent_id=key.agent_id,
            mandate_id=key.mandate_id,
            counterparty_handle=key.counterparty_handle,
            scopes=key.scopes or [],
            role="USER"
        )

    # 3. Demo fallback only when APP_ENV == "demo"
    if settings.APP_ENV == "demo":
        return AuthContext(
            actor_type="HUMAN",
            user_id="usr_demo_supervisor_001",
            email="supervisor@mandate.demo",
            role="ADMIN",
            scopes=["*"]
        )

    # Non-demo requires explicit credentials
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials required (provide 'Authorization: Bearer <token>' or 'X-API-Key: <key>')."
    )


def require_human(auth: AuthContext = Depends(get_current_user_or_agent)) -> AuthContext:
    """Restricts endpoint strictly to authenticated human supervisors."""
    if auth.actor_type != "HUMAN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: this action requires a human supervisor account."
        )
    return auth


def require_scope(scope: str):
    """Dependency enforcing that the caller possesses a specific permission scope."""
    def _verifier(auth: AuthContext = Depends(get_current_user_or_agent)) -> AuthContext:
        if not auth.has_scope(scope):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: missing required permission scope '{scope}'."
            )
        return auth
    return _verifier


def verify_owner_access(entity_owner_id: str, auth: AuthContext):
    """Enforces owner scoping on queries and mutations."""
    if not auth.is_admin and auth.user_id != entity_owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: you do not have permission to access or modify this resource."
        )


def verify_seller_deliver_permission(escrow_counterparty: str, auth: AuthContext):
    """Ensures seller deliver endpoint is called by an authorized seller or human supervisor."""
    if auth.actor_type == "HUMAN":
        return
    if not auth.has_scope("escrows:deliver"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: API key does not have 'escrows:deliver' scope."
        )
    if auth.counterparty_handle and auth.counterparty_handle != escrow_counterparty:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: API key is bound to counterparty '{auth.counterparty_handle}', cannot deliver for '{escrow_counterparty}'."
        )

