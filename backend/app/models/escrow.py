import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.db import Base


class Escrow(Base):
    __tablename__ = "escrows"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    intent_id = Column(String(36), ForeignKey("payment_intents.id", ondelete="CASCADE"), nullable=False, unique=True)
    paypal_order_id = Column(String(100), nullable=True)
    paypal_authorization_id = Column(String(100), nullable=True)
    paypal_capture_id = Column(String(100), nullable=True)
    state = Column(String(50), nullable=False, default="INTENT_RECEIVED")
    spec = Column(JSON, nullable=False, default=dict)
    hold_expires_at = Column(DateTime, nullable=True)
    version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    intent = relationship("PaymentIntent", backref="escrow")
