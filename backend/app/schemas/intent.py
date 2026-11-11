from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


class RuleEvaluationResult(BaseModel):
    rule: str = Field(..., description="Rule code, e.g. R1_MANDATE_VALID")
    passed: bool = Field(..., description="Whether the check passed or failed")
    detail: str = Field(..., description="Human-readable explanation of the rule evaluation")


class PaymentIntentCreate(BaseModel):
    mandate_id: str = Field(..., description="ID of the governing mandate")
    counterparty: str = Field(..., description="Recipient merchant or agent identifier")
    merchant_category: str = Field(..., description="Category of goods/services")
    amount_minor: int = Field(..., gt=0, description="Payment amount in integer minor units (cents)")
    currency: str = Field("USD", min_length=3, max_length=3)
    description: str = Field(..., description="Purpose or title of payment")
    source_context: Optional[str] = Field(None, description="Raw upstream prompt/conversation context for injection forensics")
    spec: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Escrow milestone acceptance criteria")


class PaymentIntentResponse(BaseModel):
    id: str
    mandate_id: str
    counterparty: str
    merchant_category: str
    amount_minor: int
    currency: str
    description: str
    source_context: Optional[str] = None
    decision: str  # APPROVED, BLOCKED, ESCALATED
    decision_reasons: List[RuleEvaluationResult] = Field(default_factory=list)
    risk_score: float = 0.0
    created_at: datetime
    escrow_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
