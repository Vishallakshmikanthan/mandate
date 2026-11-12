import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON
from app.db import Base


class RedTeamRun(Base):
    __tablename__ = "redteam_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    total_attempted = Column(Integer, nullable=False, default=0)
    total_blocked = Column(Integer, nullable=False, default=0)
    total_escalated = Column(Integer, nullable=False, default=0)
    total_approved = Column(Integer, nullable=False, default=0)
    block_rate_pct = Column(Float, nullable=False, default=0.0)
    results = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

