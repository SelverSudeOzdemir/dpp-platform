"""
Security Pydantic schemas
"""
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class StakeholderBase(BaseModel):
    name: str
    stakeholder_type: Optional[str] = None
    auth_endpoint: Optional[str] = None


class StakeholderResponse(StakeholderBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class AccessPolicyBase(BaseModel):
    dpp_id: Optional[UUID] = None
    product_type_id: Optional[UUID] = None
    stakeholder_id: UUID
    access_level: str
    is_personal_data: bool = False


class AccessPolicyResponse(AccessPolicyBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)