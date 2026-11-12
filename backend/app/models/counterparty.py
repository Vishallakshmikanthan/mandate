import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from app.db import Base


class Counterparty(Base):
    __tablename__ = "counterparties"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    handle = Column(String(100), unique=True, index=True, nullable=False)
    paypal_merchant_id = Column(String(50), nullable=True)
    paypal_email = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="UNVERIFIED")  # VERIFIED, UNVERIFIED, BLOCKED, SUSPENDED
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

