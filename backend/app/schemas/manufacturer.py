"""
Manufacturer, ManufacturerCertification, ProductionFacility Pydantic schemas
"""
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, ConfigDict


class FacilityBase(BaseModel):
    manufacturer_id: UUID
    facility_name: str
    location_text: Optional[str] = None
    country_code: Optional[str] = None
    is_active: bool = True


class FacilityCreate(FacilityBase):
    pass


class FacilityResponse(FacilityBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class ManufacturerCertBase(BaseModel):
    manufacturer_id: UUID
    cert_name: str
    cert_number: Optional[str] = None
    expiry_date: Optional[str] = None
    document_url: Optional[str] = None


class ManufacturerCertResponse(ManufacturerCertBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class ManufacturerBase(BaseModel):
    company_id: UUID
    name: str
    legal_name: Optional[str] = None
    registration_number: Optional[str] = None
    vat_number: Optional[str] = None
    headquarters_address: Optional[str] = None
    country_code: Optional[str] = None
    website: Optional[str] = None
    contact_email: Optional[EmailStr] = None


class ManufacturerCreate(ManufacturerBase):
    pass


class ManufacturerResponse(ManufacturerBase):
    id: UUID
    facilities: List[FacilityResponse] = []
    manufacturer_certifications: List[ManufacturerCertResponse] = []
    model_config = ConfigDict(from_attributes=True)