import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from app.db import Base


class UserKey(Base):
    """
    Public key registry for human mandate owners.
    Stores Ed25519 public keys used to sign spending mandates,
    supporting key rotation and verification.
    """
    __tablename__ = "user_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    key_id = Column(String(64), nullable=False, index=True)
    public_key = Column(String(128), nullable=False, unique=True, index=True)
    algorithm = Column(String(32), default="ed25519", nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, ROTATED, REVOKED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_user_keys_user_status", "user_id", "status"),
    )

