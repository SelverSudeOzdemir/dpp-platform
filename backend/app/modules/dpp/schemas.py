"""
DPP modülü Pydantic şemaları.
Frontend src/Services/productService.ts → BackendProduct interface ile uyumlu.
"""
from datetime import date, datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from app.models.dpp import DppStatusEnum


# ─── REQUESTS ────────────────────────────────────────────────────────────────

class DppCreateRequest(BaseModel):
    product_type_id: UUID
    gs1_serial_number: str = Field(..., max_length=50)
    gtin: Optional[str] = Field(None, max_length=14)
    production_date: date
    production_facility_id: Optional[UUID] = None
    production_line: Optional[str] = Field(None, max_length=255)
    shift: Optional[str] = Field(None, max_length=100)
    dpp_version: str = "1.0.0"
    dpp_standard: str = "CIRPASS-Compatible"


class DppUpdateRequest(BaseModel):
    dpp_status: Optional[DppStatusEnum] = None
    production_line: Optional[str] = None
    shift: Optional[str] = None
    json_ld: Optional[Any] = None
    html_content: Optional[str] = None
    current_version: Optional[str] = None
    is_active: Optional[bool] = None


# ─── NESTED RESPONSE PARÇALARI ────────────────────────────────────────────────

class ManufacturerInfo(BaseModel):
    name: Optional[str] = None
    tax_id: Optional[str] = None
    contact_email: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None


class FacilityInfo(BaseModel):
    name: Optional[str] = None
    gln_code: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None


class CertificationInfo(BaseModel):
    cert_type: str
    issuer: Optional[str] = None
    cert_number: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    document_url: Optional[str] = None


class SupplyChainStageInfo(BaseModel):
    sequence_number: int
    stage_name: str
    organization_name: Optional[str] = None
    organization_role: Optional[str] = None
    location: Optional[str] = None
    country_code: Optional[str] = None
    material_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    process_name: Optional[str] = None
    stage_date: Optional[str] = None
    traceability_id: Optional[str] = None


class LifecycleEventInfo(BaseModel):
    event_type: str
    event_date: str
    description: Optional[str] = None
    performed_by: Optional[str] = None
    location: Optional[str] = None


# ─── ANA RESPONSE ŞEMALARI ────────────────────────────────────────────────────

class DppListItem(BaseModel):
    """GET /dpps listesi — frontend BackendProduct interface ile uyumlu."""
    id: str
    name: str
    category: str
    gtin: Optional[str] = None
    batch_number: Optional[str] = None
    material_standard: Optional[str] = None
    steel_grade: Optional[str] = None
    weight_per_meter: Optional[float] = None
    production_date: Optional[str] = None
    version: Optional[str] = None
    status: str
    carbon_footprint: Optional[float] = None
    recycled_content: Optional[float] = None
    recyclability: Optional[float] = None
    svhc_free: Optional[bool] = None
    dismantling_difficulty: Optional[str] = None
    issued_at: Optional[str] = None
    valid_until: Optional[str] = None
    manufacturer: Optional[ManufacturerInfo] = None
    facility: Optional[FacilityInfo] = None
    certifications: Optional[List[CertificationInfo]] = []
    supply_chain: Optional[List[SupplyChainStageInfo]] = []
    lifecycle_events: Optional[List[LifecycleEventInfo]] = []


class DppDetailResponse(DppListItem):
    """GET /dpps/{id} detay — liste ile aynı + ekstra alanlar."""
    public_identifier: Optional[str] = None
    gs1_serial_number: Optional[str] = None
    dpp_version: Optional[str] = None
    dpp_standard: Optional[str] = None
    data_carrier_type: Optional[str] = None
    production_line: Optional[str] = None
    shift: Optional[str] = None
    is_active: bool = True
    updated_at: Optional[str] = None


class SummaryStatsResponse(BaseModel):
    """GET /dpps/summary-stats — dashboard istatistik kartları."""
    total: int
    published: int
    draft: int
    pending_approval: int
    rejected: int
    archived: int