import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base


class ArbiterVerdictRecord(Base):
    __tablename__ = "arbiter_verdicts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    escrow_id = Column(String(36), ForeignKey("escrows.id", ondelete="CASCADE"), nullable=False)
    verdict = Column(String(20), nullable=False)  # PASS, FAIL, PARTIAL, NEEDS_HUMAN
    confidence = Column(Float, nullable=False)
    criteria_results = Column(JSON, nullable=False, default=list)
    explanation = Column(Text, nullable=False)
    partial_ratio = Column(Float, nullable=False, default=0.0)
    model = Column(String(50), nullable=False, default="mock")
    prompt_version = Column(String(50), nullable=True, default="arbiter_v1.0")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    escrow = relationship("Escrow", backref="verdicts")
