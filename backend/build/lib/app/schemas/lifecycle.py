"""
Lifecycle Pydantic schemas
"""
from datetime import datetime, date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class LifecycleEventBase(BaseModel):
    dpp_id: UUID
    stage: str
    stage_label: Optional[str] = None
    event_type: str
    event_date: datetime
    description: Optional[str] = None
    location_text: Optional[str] = None
    result: Optional[str] = None
    status: str = "Completed"


class LifecycleEventCreate(LifecycleEventBase):
    pass


class LifecycleEventResponse(LifecycleEventBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)