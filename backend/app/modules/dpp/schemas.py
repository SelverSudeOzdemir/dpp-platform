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
    production_route: Optional[str] = Field(None, max_length=100)
    ocak_no: Optional[str] = Field(None, max_length=50)
    miktar_ton: Optional[float] = None
    creation_source: Optional[str] = Field(None, max_length=50)  # Manuel / SAP/Excel


class DppUpdateRequest(BaseModel):
    dpp_status: Optional[DppStatusEnum] = None
    production_line: Optional[str] = None
    shift: Optional[str] = None
    json_ld: Optional[Any] = None
    html_content: Optional[str] = None
    current_version: Optional[str] = None
    is_active: Optional[bool] = None
    production_route: Optional[str] = None
    ocak_no: Optional[str] = None
    miktar_ton: Optional[float] = None


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
    test_standard: Optional[str] = None


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
    origin_country: Optional[str] = None
    transport_method: Optional[str] = None
    distance_km: Optional[float] = None
    co2_kg_per_km: Optional[float] = None


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
    carbon_footprint: Optional[float] = None
    recycled_content: Optional[float] = None
    recyclability: Optional[float] = None
    water_consumption_l_kg: Optional[float] = None
    svhc_free: Optional[bool] = None
    dismantling_difficulty: Optional[str] = None
    issued_at: Optional[str] = None
    valid_until: Optional[str] = None
    # Kimyasal Sekmesi
    c_pct: Optional[float] = None
    mn_pct: Optional[float] = None
    si_pct: Optional[float] = None
    p_pct: Optional[float] = None
    s_pct: Optional[float] = None
    n_pct: Optional[float] = None
    # Mekanik Sekmesi
    yield_mpa: Optional[float] = None
    tensile_mpa: Optional[float] = None
    elongation_pct: Optional[float] = None
    # Ebat / Ürün Kataloğu
    en_mm: Optional[float] = None
    kalinlik_mm: Optional[float] = None
    boy_mm: Optional[float] = None
    hs_code: Optional[str] = None
    # CBAM & Batch Üretim Bilgileri
    production_route: Optional[str] = None
    ocak_no: Optional[str] = None
    miktar_ton: Optional[float] = None
    # Reddetme Bilgileri
    dpp_status: str
    rejection_reason: Optional[str] = None
    rejection_fields: Optional[List[str]] = None
    rejected_by: Optional[str] = None
    rejected_at: Optional[str] = None

    manufacturer: Optional[ManufacturerInfo] = None
    facility: Optional[FacilityInfo] = None
    certifications: Optional[List[CertificationInfo]] = []
    supply_chain: Optional[List[SupplyChainStageInfo]] = []
    lifecycle_events: Optional[List[LifecycleEventInfo]] = []


class DppDetailResponse(DppListItem):
    """GET /dpps/{id} detay — liste ile aynı + ekstra alanlar."""
    product_type_id: Optional[str] = None
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


class SupplyStageCreateRequest(BaseModel):
    sequence_number: Optional[int] = None
    stage_name: str
    organization: str
    role: Optional[str] = None
    location: Optional[str] = None
    country_code: Optional[str] = None
    material: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    material_origin: Optional[str] = None
    process: Optional[str] = None
    date: Optional[str] = None
    transport_method: Optional[str] = None
    distance_km: Optional[float] = None
    co2_kg_per_km: Optional[float] = None