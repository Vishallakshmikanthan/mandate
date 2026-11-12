from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class CounterpartyBase(BaseModel):
    handle: str = Field(..., description="Unique handle or merchant identifier, e.g. seller_agent_acme")
    paypal_merchant_id: Optional[str] = Field(None, description="PayPal 13-character merchant ID, e.g. 2ABC123XYZ456")
    paypal_email: Optional[str] = Field(None, description="PayPal recipient email address")


class CounterpartyCreate(CounterpartyBase):
    status: Optional[str] = Field("UNVERIFIED", description="Initial verification status")


class CounterpartyUpdate(BaseModel):
    paypal_merchant_id: Optional[str] = None
    paypal_email: Optional[str] = None
    status: Optional[str] = None


class CounterpartyResponse(CounterpartyBase):
    id: str
    status: str
    verified_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

