import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base


class Deliverable(Base):
    __tablename__ = "deliverables"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    escrow_id = Column(String(36), ForeignKey("escrows.id", ondelete="CASCADE"), nullable=False)
    content_ref = Column(Text, nullable=False)
    submission_notes = Column(Text, nullable=True)
    sha256 = Column(String(64), nullable=True, index=True)
    file_name = Column(String(255), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    content_type = Column(String(100), nullable=True)
    extracted_text = Column(Text, nullable=True)
    inspection_status = Column(String(30), default="INSPECTED", nullable=True)  # INSPECTED, UNSUPPORTED_BINARY, MALICIOUS
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    escrow = relationship("Escrow", backref="deliverables")
