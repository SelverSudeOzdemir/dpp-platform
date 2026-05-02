"""
Audit schemas — Orijinal app/schemas/audit.py içeriğinin aynısıdır.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditLogRecentItem(BaseModel):
    id: UUID
    action: str
    target_id: Optional[str] = None
    user_email: Optional[str] = None
    date: datetime
    role: Optional[str] = None
    ip_address: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AuditLogRecentResponse(BaseModel):
    data: list[AuditLogRecentItem]
