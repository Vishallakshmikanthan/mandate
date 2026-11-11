import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, BigInteger, Float, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base


class PaymentIntent(Base):
    __tablename__ = "payment_intents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mandate_id = Column(String(36), ForeignKey("mandates.id", ondelete="CASCADE"), nullable=False)
    counterparty = Column(String(200), nullable=False)
    merchant_category = Column(String(100), nullable=False)
    amount_minor = Column(BigInteger, nullable=False)
    currency = Column(String(10), nullable=False, default="USD")
    description = Column(Text, nullable=False)
    source_context = Column(Text, nullable=True)
    decision = Column(String(20), nullable=False)  # APPROVED, BLOCKED, ESCALATED
    decision_reasons = Column(JSON, nullable=False, default=list)
    risk_score = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    mandate = relationship("Mandate", backref="intents")
