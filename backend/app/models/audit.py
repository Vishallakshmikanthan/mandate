from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, JSON
from app.db import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ts = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    actor = Column(String(50), nullable=False)  # buyer_agent, seller_agent, gateway, arbiter, paypal, human
    event = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False, default=dict)
    prev_hash = Column(String(64), nullable=False)
    hash = Column(String(64), nullable=False)
