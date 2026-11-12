from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class TimeWindow(BaseModel):
    start: str = Field(..., description="Start hour UTC in HH:MM format, e.g. '06:00'")
    end: str = Field(..., description="End hour UTC in HH:MM format, e.g. '22:00'")


class VelocityLimit(BaseModel):
    max_txns_per_hour: int = Field(3, ge=1, description="Maximum number of approved transactions per rolling hour")


class MandatePolicy(BaseModel):
    version: int = Field(1, description="Policy schema version")
    currency: str = Field("USD", min_length=3, max_length=3, description="ISO currency code")
    max_total_minor: int = Field(..., ge=0, description="Total lifetime budget for this mandate in cents")
    max_per_transaction_minor: int = Field(..., ge=0, description="Maximum spend allowed per single transaction in cents")
    daily_limit_minor: int = Field(..., ge=0, description="Maximum spend allowed across any rolling 24-hour window in cents")
    allowed_merchant_categories: List[str] = Field(default_factory=list, description="Whitelist of allowed merchant categories")
    allowed_counterparties: List[str] = Field(default_factory=list, description="Whitelist of allowed agent/seller counterparties")
    blocked_counterparties: List[str] = Field(default_factory=list, description="Explicit blacklist of prohibited counterparties")
    allowed_hours_utc: Optional[TimeWindow] = Field(None, description="Allowed operational time window in UTC")
    velocity: Optional[VelocityLimit] = Field(None, description="Rate limit on transactions")
    escalate_above_minor: Optional[int] = Field(None, description="Amount above which human escalation is mandatory")
    require_escrow: bool = Field(True, description="Whether payments must go through PayPal escrow hold")
    expires_at: datetime = Field(..., description="UTC expiration datetime of this policy")

    model_config = ConfigDict(extra="ignore")


class MandateCreate(BaseModel):
    owner_id: str = Field(..., description="UUID or identifier of the human principal")
    agent_id: str = Field(..., description="Identifier of the autonomous agent operating under this mandate")
    policy: MandatePolicy = Field(..., description="Policy constraints and spending rules")
    public_key: Optional[str] = Field(None, description="Hex-encoded Ed25519 public key of the owner (64 hex characters)")
    signature: Optional[str] = Field(None, description="Hex-encoded Ed25519 signature of the canonical policy (128 hex characters)")
    key_id: Optional[str] = Field(None, description="Identifier of the owner key pair used for signing")
    signature_algorithm: Optional[str] = Field("ed25519", description="Cryptographic algorithm: ed25519 or hmac-sha256")


class MandateRotateKey(BaseModel):
    new_key_id: str = Field(..., description="Identifier for the new owner key")
    new_public_key: str = Field(..., description="Hex-encoded Ed25519 public key (64 hex chars)")
    new_signature: str = Field(..., description="Hex-encoded signature of the mandate's canonical policy signed with the new private key")


class MandateResponse(BaseModel):
    id: str
    owner_id: str
    agent_id: str
    policy: MandatePolicy
    signature: str
    public_key: Optional[str] = None
    key_id: Optional[str] = None
    signature_algorithm: str = "ed25519"
    status: str
    created_at: datetime
    expires_at: datetime
    spent_to_date_minor: int = 0
    remaining_budget_minor: int = 0

    model_config = ConfigDict(from_attributes=True)


class MandateRevoke(BaseModel):
    reason: Optional[str] = Field(None, description="Optional explanation for manual revocation")


class UserKeyRegister(BaseModel):
    key_id: str = Field(..., description="Client identifier for the key (e.g. 'key_ed25519_primary')")
    public_key: str = Field(..., description="Hex-encoded Ed25519 public key (64 hex chars)")
    algorithm: str = Field("ed25519", description="Cryptographic algorithm")


class UserKeyResponse(BaseModel):
    id: str
    key_id: str
    public_key: str
    algorithm: str
    status: str
    created_at: datetime
    revoked_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
