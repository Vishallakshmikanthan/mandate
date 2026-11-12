import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON
from app.db import Base


class PayPalAction(Base):
    """
    Immutable ledger of all PayPal operations for idempotency and crash recovery.
    Ensures that retries, network glitches, or crashes never result in duplicate
    PayPal orders, authorizations, captures, or voids.
    """
    __tablename__ = "paypal_actions"

    id = Column(String, primary_key=True, default=lambda: f"act_{uuid.uuid4().hex[:16]}")
    escrow_id = Column(String, nullable=True, index=True)
    action = Column(String, nullable=False)  # CREATE_ORDER, AUTHORIZE, CAPTURE, VOID
    request_id = Column(String, unique=True, nullable=False, index=True)
    request_body = Column(JSON, nullable=True)
    response_body = Column(JSON, nullable=True)
    status = Column(String, default="PENDING", nullable=False)  # PENDING, COMPLETED, FAILED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
