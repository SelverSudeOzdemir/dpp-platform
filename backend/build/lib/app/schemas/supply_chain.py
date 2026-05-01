"""
Supply Chain Pydantic schemas
"""
from datetime import date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class SupplyChainOrgBase(BaseModel):
    name: str
    role: Optional[str] = None
    location_text: Optional[str] = None
    country_code: Optional[str] = None


class SupplyChainOrgResponse(SupplyChainOrgBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class SupplyChainStageBase(BaseModel):
    dpp_id: UUID
    organization_id: UUID
    sequence_number: int
    stage_name: str
    stage_date: Optional[date] = None


class SupplyChainStageResponse(SupplyChainStageBase):
    id: UUID
    organization: SupplyChainOrgResponse
    model_config = ConfigDict(from_attributes=True)