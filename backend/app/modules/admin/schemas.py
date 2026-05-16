
from typing import Optional, List
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.models.dpp import DppStatusEnum

class DppApprovalRequest(BaseModel):
    status: DppStatusEnum  # PUBLISHED veya REJECTED
    rejection_reason: Optional[str] = None
    failed_fields: Optional[List[str]] = None

class AdminDppListItem(BaseModel):
    id: UUID
    public_identifier: UUID
    product_name: str
    gs1_serial_number: str
    status: DppStatusEnum
    created_at: datetime

    class Config:
        from_attributes = True

class AdminDashboardStats(BaseModel):
    total_dpps: int
    pending_approval: int
    published: int
    rejected: int
    draft: int
    last_updated: datetime

class UrgentAlert(BaseModel):
    id: str
    type: str  # "CBAM", "CERTIFICATE"
    message: str
    dpp_id: UUID
    severity: str # "CRITICAL", "WARNING"

class AdminKpiSummary(AdminDashboardStats):
    cert_alerts: int = 0
    cbam_alerts: int = 0
