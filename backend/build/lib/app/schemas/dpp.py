"""
DPP Pydantic schemas
Full nested response schema dahil
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

from app.schemas.product import ProductTypeResponse
from app.schemas.certification import CertificationResponse


class DppBase(BaseModel):
    product_type_id: UUID
    dpp_version: str = "1.0.0"
    dpp_standard: str = "CIRPASS-Compatible"
    gtin: Optional[str] = Field(None, max_length=14)
    gs1_serial_number: str = Field(..., max_length=50)
    data_carrier_type: str = "DataMatrix"
    data_carrier_standard: Optional[str] = "ISO/IEC 16022"
    # Production
    production_facility_id: Optional[UUID] = None
    production_date: date
    production_line: Optional[str] = Field(None, max_length=255)
    shift: Optional[str] = Field(None, max_length=100)
    # Internal (restricted)
    batch_number: Optional[str] = Field(None, alias="_batch_number", max_length=100)
    serial_number: Optional[str] = Field(None, alias="_serial_number", max_length=100)
    production_order_number: Optional[str] = Field(None, alias="_production_order_number", max_length=100)


class DppCreate(DppBase):
    pass


class DppUpdate(BaseModel):
    dpp_status: Optional[str] = None
    json_ld: Optional[Any] = None
    html_content: Optional[str] = None
    current_version: Optional[str] = None
    is_active: Optional[bool] = None


class DppResponse(BaseModel):
    id: UUID
    public_identifier: UUID
    dpp_version: str
    dpp_standard: str
    product_type_id: UUID
    gtin: Optional[str] = None
    gs1_serial_number: str
    data_carrier_type: str
    data_carrier_standard: Optional[str] = None
    production_facility_id: Optional[UUID] = None
    production_date: date
    production_line: Optional[str] = None
    shift: Optional[str] = None
    # Hosting
    api_endpoint: Optional[str] = None
    data_format: Optional[str] = None
    data_schema: Optional[str] = None
    # Version / Status
    current_version: Optional[str] = None
    is_active: bool
    dpp_status: str
    status_changed_at: Optional[datetime] = None
    # JSON-LD & HTML
    json_ld: Optional[Any] = None
    html_content: Optional[str] = None
    # Timestamps
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DppFullResponse(DppResponse):
    """DPP ile ilişkili tüm verileri içeren nested response."""
    product_type: Optional[ProductTypeResponse] = None
    certifications: Optional[List[CertificationResponse]] = []
    model_config = ConfigDict(from_attributes=True)


class DppListResponse(BaseModel):
    id: UUID
    public_identifier: UUID
    dpp_version: str
    dpp_status: str
    gtin: Optional[str] = None
    gs1_serial_number: str
    production_date: date
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)