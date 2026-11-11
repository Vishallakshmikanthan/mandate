from datetime import datetime, timezone
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class TimelineEvent(BaseModel):
    id: str = Field(..., description="Unique event identifier")
    scenario: Optional[str] = Field(None, description="Scenario identifier if applicable")
    event_type: str = Field(..., description="E.g. INTENT_SUBMITTED, GATEWAY_DECISION, PAYPAL_HELD")
    actor: str = Field(..., description="buyer_agent, seller_agent, gateway, arbiter, paypal, human")
    step: str = Field(..., description="Short phase title")
    summary: str = Field(..., description="Human-readable message")
    status: str = Field("INFO", description="INFO, SUCCESS, WARNING, DANGER")
    data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
