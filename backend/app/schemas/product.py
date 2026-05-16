"""
Product Pydantic schemas
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# ─── CHEMICAL ────────────────────────────────────────────────────────────────
class ChemicalCompositionBase(BaseModel):
    carbon_pct: Optional[Decimal] = None
    carbon_max_pct: Optional[Decimal] = None
    silicon_pct: Optional[Decimal] = None
    silicon_max_pct: Optional[Decimal] = None
    manganese_pct: Optional[Decimal] = None
    manganese_max_pct: Optional[Decimal] = None
    phosphorus_pct: Optional[Decimal] = None
    phosphorus_max_pct: Optional[Decimal] = None
    sulfur_pct: Optional[Decimal] = None
    sulfur_max_pct: Optional[Decimal] = None
    nitrogen_pct: Optional[Decimal] = None
    nitrogen_max_pct: Optional[Decimal] = None
    reference_standard: Optional[str] = None


class ChemicalCompositionResponse(ChemicalCompositionBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


# ─── MECHANICAL ──────────────────────────────────────────────────────────────
class MechanicalPropertiesBase(BaseModel):
    yield_strength_mpa: Optional[Decimal] = None
    yield_strength_min_mpa: Optional[Decimal] = None
    tensile_strength_mpa: Optional[Decimal] = None
    tensile_strength_min_mpa: Optional[Decimal] = None
    tensile_strength_max_mpa: Optional[Decimal] = None
    elongation_pct: Optional[Decimal] = None
    elongation_min_pct: Optional[Decimal] = None
    impact_energy_j: Optional[Decimal] = None
    impact_temperature_c: Optional[Decimal] = None
    reference_standard: Optional[str] = None


class MechanicalPropertiesResponse(MechanicalPropertiesBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


# ─── PRODUCT TYPE ────────────────────────────────────────────────────────────
class ProductTypeBase(BaseModel):
    manufacturer_id: UUID
    product_name: str
    product_model: Optional[str] = None
    product_type: Optional[str] = None
    product_category: str
    brand: Optional[str] = None
    manufacturer_part_number: Optional[str] = None
    gtin: Optional[str] = None
    dimensional_standard: Optional[str] = None
    material_standard: Optional[str] = None
    steel_grade: Optional[str] = None
    # Dimensions
    dim_height_mm: Optional[Decimal] = None
    dim_width_mm: Optional[Decimal] = None
    dim_web_thickness_mm: Optional[Decimal] = None
    dim_flange_thickness_mm: Optional[Decimal] = None
    # Environmental
    epd_number: Optional[str] = None
    co2_cradle_to_gate_kg: Optional[Decimal] = None
    recycled_content_pct: Optional[Decimal] = None
    recyclability_pct: Optional[Decimal] = Decimal("100")


class ProductTypeCreate(ProductTypeBase):
    pass


class ProductTypeResponse(ProductTypeBase):
    id: UUID
    chemical_composition: Optional[ChemicalCompositionResponse] = None
    mechanical_properties: Optional[MechanicalPropertiesResponse] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)