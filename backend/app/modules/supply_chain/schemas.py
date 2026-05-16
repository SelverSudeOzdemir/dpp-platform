from pydantic import BaseModel, UUID4, Field, HttpUrl
from typing import List, Optional
from datetime import date
from decimal import Decimal

# Organization Schemas
class SupplyChainOrganizationBase(BaseModel):
    name: str
    role: Optional[str] = None
    location_text: Optional[str] = None
    country_code: Optional[str] = Field(None, max_length=2)
    tax_id: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    is_verified: Optional[int] = 0

class SupplyChainOrganizationCreate(SupplyChainOrganizationBase):
    pass

class SupplyChainOrganization(SupplyChainOrganizationBase):
    id: UUID4

    class Config:
        from_attributes = True

# Stage Schemas
class SupplyChainStageBase(BaseModel):
    dpp_id: UUID4
    organization_id: UUID4
    sequence_number: int
    stage_name: str
    stage_date: Optional[date] = None
    notes: Optional[str] = None
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    transport_method: Optional[str] = None
    distance_km: Optional[Decimal] = None
    co2_kg_per_km: Optional[Decimal] = None

class SupplyChainStageCreate(SupplyChainStageBase):
    pass

class SupplyChainStageUpdate(BaseModel):
    stage_name: Optional[str] = None
    stage_date: Optional[date] = None
    notes: Optional[str] = None
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    transport_method: Optional[str] = None
    distance_km: Optional[Decimal] = None
    co2_kg_per_km: Optional[Decimal] = None

class SupplyChainStage(SupplyChainStageBase):
    id: UUID4
    traceability_id: UUID4

    class Config:
        from_attributes = True

# Logistics Response
class LogisticsEmissionResponse(BaseModel):
    dpp_id: UUID4
    total_distance_km: Decimal
    total_co2_kg: Decimal
    stages: List[dict] # Summary of stages for context
