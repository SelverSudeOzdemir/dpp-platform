"""
Certification Pydantic schemas
"""
from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class CertificationBase(BaseModel):
    product_type_id: Optional[UUID] = None
    dpp_id: Optional[UUID] = None
    cert_scope: str
    cert_type: str
    cert_number: str
    issuer: str
    issue_date: date
    expiry_date: Optional[date] = None
    scope: Optional[str] = None
    document_url: Optional[str] = None
    status: str = "Valid"


class CertificationCreate(CertificationBase):
    pass


class CertificationUpdate(BaseModel):
    cert_number: Optional[str] = None
    expiry_date: Optional[date] = None
    document_url: Optional[str] = None
    status: Optional[str] = None


class CertificationResponse(CertificationBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)