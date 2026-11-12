import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base


class APIKey(Base):
    """
    Scoped Agent API Keys for programmatic commerce.
    Keys are stored hashed (SHA-256) and bound to an owner, optional agent_id,
    optional mandate_id, and optional counterparty_handle.
    """
    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key_hash = Column(String(64), unique=True, index=True, nullable=False)
    key_prefix = Column(String(16), index=True, nullable=False)
    name = Column(String(100), nullable=False)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String(100), nullable=True)
    mandate_id = Column(String(36), ForeignKey("mandates.id", ondelete="SET NULL"), nullable=True, index=True)
    counterparty_handle = Column(String(100), nullable=True)
    scopes = Column(JSON, nullable=False, default=list)  # e.g. ["intents:create", "escrows:deliver", "intents:read"]
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    owner = relationship("User")
    mandate = relationship("Mandate")

