from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    id: int
    ts: datetime
    actor: str
    event: str
    payload: Dict[str, Any]
    prev_hash: str
    hash: str

    model_config = ConfigDict(from_attributes=True)


class AuditVerifyResponse(BaseModel):
    valid: bool
    total_records: int
    head_hash: Optional[str] = None
    verified_at: datetime
    broken_link_id: Optional[int] = None
    message: str
