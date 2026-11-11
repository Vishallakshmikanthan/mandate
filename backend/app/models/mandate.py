import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON
from app.db import Base


class Mandate(Base):
    __tablename__ = "mandates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), nullable=False)
    agent_id = Column(String(100), nullable=False)
    policy = Column(JSON, nullable=False)
    signature = Column(String(128), nullable=False)
    status = Column(String(20), nullable=False, default="ACTIVE")  # ACTIVE, REVOKED, EXPIRED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime, nullable=False)
