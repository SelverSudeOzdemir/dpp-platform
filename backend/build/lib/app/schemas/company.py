"""
Company Pydantic schemas
"""
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, ConfigDict


class CompanyBase(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    support_email: Optional[EmailStr] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    description: Optional[str] = None
    website: Optional[str] = None
    support_email: Optional[EmailStr] = None


class CompanyResponse(CompanyBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)