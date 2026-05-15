from pydantic import BaseModel, UUID4, Field
from typing import Optional
from datetime import datetime

class LifecycleEventBase(BaseModel):
    dpp_id: UUID4
    stage: str = Field(..., description="'Production', 'Logistics', 'Usage', 'EOL'")
    stage_label: Optional[str] = None
    event_type: str
    event_date: datetime
    description: Optional[str] = None
    location_text: Optional[str] = None
    result: Optional[str] = None
    status: str = "Completed"

class LifecycleEventCreate(LifecycleEventBase):
    pass

class LifecycleEvent(LifecycleEventBase):
    id: UUID4

    class Config:
        from_attributes = True

class ArchiveRecallRequest(BaseModel):
    reason: str
    notes: Optional[str] = None
