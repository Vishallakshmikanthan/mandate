"""
Mandate SDK Data Models.
Provides structured response types for autonomous agents and client applications.
"""
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class RuleReason:
    rule: str
    name: str
    passed: bool
    detail: str


@dataclass
class PaymentIntentResult:
    intent_id: str
    mandate_id: str
    counterparty: str
    amount_minor: int
    currency: str
    decision: str  # APPROVED, BLOCKED, ESCALATED
    risk_score: float
    reasons: List[RuleReason]
    escrow_id: Optional[str] = None
    paypal_order_id: Optional[str] = None
    paypal_approval_url: Optional[str] = None
    flags: List[str] = field(default_factory=list)

    @property
    def is_approved(self) -> bool:
        return self.decision == "APPROVED"

    @property
    def is_blocked(self) -> bool:
        return self.decision == "BLOCKED"

    @property
    def is_escalated(self) -> bool:
        return self.decision == "ESCALATED"

    @property
    def blocking_reasons(self) -> List[str]:
        return [r.detail for r in self.reasons if not r.passed]


@dataclass
class MandateBalanceResult:
    mandate_id: str
    currency: str
    max_total_minor: int
    spent_to_date_minor: int
    remaining_budget_minor: int
    max_per_transaction_minor: int
    daily_limit_minor: int
    is_active: bool


@dataclass
class DeliverableResult:
    deliverable_id: str
    escrow_id: str
    sha256: Optional[str]
    status: str
    created_at: str
