from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON
from app.db import Base


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    event_id = Column(String(100), primary_key=True)
    type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False, default=dict)
    status = Column(String(20), nullable=False, default="RECEIVED")  # RECEIVED, PROCESSED, FAILED
    error_message = Column(String(500), nullable=True)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
