from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.certification import CertScopeEnum, CertificationStatusEnum


class CertificationCreate(BaseModel):
    cert_scope: CertScopeEnum
    product_type_id: Optional[UUID] = None
    dpp_id: Optional[UUID] = None
    cert_type: str
    cert_number: str
    issuer: str
    issue_date: date
    expiry_date: Optional[date] = None
    scope: Optional[str] = None
    document_url: Optional[str] = None
    status: CertificationStatusEnum = CertificationStatusEnum.VALID


class CertificationUpdate(BaseModel):
    cert_type: Optional[str] = None
    cert_number: Optional[str] = None
    issuer: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    scope: Optional[str] = None
    document_url: Optional[str] = None
    status: Optional[CertificationStatusEnum] = None


class CertificationOut(BaseModel):
    id: UUID
    cert_scope: CertScopeEnum
    product_type_id: Optional[UUID] = None
    dpp_id: Optional[UUID] = None
    cert_type: str
    cert_number: str
    issuer: str
    issue_date: date
    expiry_date: Optional[date] = None
    scope: Optional[str] = None
    document_url: Optional[str] = None
    status: CertificationStatusEnum
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CertificationListResponse(BaseModel):
    data: list[CertificationOut]
    total: int