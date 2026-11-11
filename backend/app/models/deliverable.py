import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base


class Deliverable(Base):
    __tablename__ = "deliverables"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    escrow_id = Column(String(36), ForeignKey("escrows.id", ondelete="CASCADE"), nullable=False)
    content_ref = Column(Text, nullable=False)
    submission_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    escrow = relationship("Escrow", backref="deliverables")
