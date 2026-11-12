from datetime import datetime
from enum import Enum
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


class EscrowState(str, Enum):
    INTENT_RECEIVED = "INTENT_RECEIVED"
    BLOCKED = "BLOCKED"
    ESCALATED = "ESCALATED"
    ORDER_CREATED = "ORDER_CREATED"
    BUYER_APPROVED = "BUYER_APPROVED"
    FUNDS_HELD = "FUNDS_HELD"
    DELIVERED = "DELIVERED"
    UNDER_ARBITRATION = "UNDER_ARBITRATION"
    RELEASED = "RELEASED"
    PARTIALLY_RELEASED = "PARTIALLY_RELEASED"
    REFUNDED = "REFUNDED"
    NEEDS_HUMAN = "NEEDS_HUMAN"
    EXPIRED = "EXPIRED"


class CriterionResult(BaseModel):
    criterion: str = Field(..., description="Acceptance criterion being evaluated")
    met: bool = Field(..., description="Whether the deliverable satisfied this criterion")
    evidence: str = Field(..., description="Concrete justification/evidence found in deliverable")


class ArbiterVerdictOutput(BaseModel):
    verdict: str = Field(..., description="PASS, FAIL, PARTIAL, or NEEDS_HUMAN")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    criteria_results: List[CriterionResult] = Field(default_factory=list)
    partial_ratio: float = Field(0.0, ge=0.0, le=1.0, description="Fraction of funds to release if PARTIAL")
    explanation: str = Field(..., description="Summary explanation of the verdict")
    model: str = Field("mock", description="Model name that generated the verdict")
    prompt_version: str = Field("arbiter_v1.0", description="Prompt version used")


class DeliverableCreate(BaseModel):
    content_ref: str = Field(..., description="Deliverable URI, file path, or serialized content")
    submission_notes: Optional[str] = Field(None, description="Notes from the seller agent explaining the submission")


class DeliverableResponse(BaseModel):
    id: str
    escrow_id: str
    content_ref: str
    submission_notes: Optional[str] = None
    sha256: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    inspection_status: Optional[str] = None
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ArbiterVerdictResponse(BaseModel):
    id: str
    escrow_id: str
    verdict: str
    confidence: float
    criteria_results: List[CriterionResult]
    explanation: str
    partial_ratio: float
    model: str
    prompt_version: Optional[str] = "arbiter_v1.0"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HumanDecisionRequest(BaseModel):
    action: str = Field(..., description="'APPROVE' (release funds) or 'REJECT' (void/refund funds)")
    notes: Optional[str] = Field(None, description="Human reviewer justification")


class EscrowResponse(BaseModel):
    id: str
    intent_id: str
    paypal_order_id: Optional[str] = None
    paypal_authorization_id: Optional[str] = None
    paypal_capture_id: Optional[str] = None
    approve_url: Optional[str] = None
    state: str
    spec: Dict[str, Any] = Field(default_factory=dict)
    hold_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    deliverables: List[DeliverableResponse] = Field(default_factory=list)
    verdicts: List[ArbiterVerdictResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
