import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from app.db import Base


class SpendLedger(Base):
    __tablename__ = "spend_ledger"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mandate_id = Column(String(36), ForeignKey("mandates.id", ondelete="CASCADE"), nullable=False, index=True)
    intent_id = Column(String(36), ForeignKey("payment_intents.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_minor = Column(Integer, nullable=False)
    kind = Column(String(20), nullable=False)  # RESERVE, COMMIT, RELEASE
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
