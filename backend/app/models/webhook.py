from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON
from app.db import Base


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    event_id = Column(String(100), primary_key=True)
    type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False, default=dict)
    processed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
