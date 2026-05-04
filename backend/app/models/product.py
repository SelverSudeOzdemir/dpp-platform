"""
ProductType, ChemicalComposition, MechanicalProperties modelleri
"""
import enum
from sqlalchemy import Column, String, Numeric, Boolean, Date, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


# ─── ENUM TYPES ───────────────────────────────────────────────────────────────
class ProductCategoryEnum(str, enum.Enum):
    STRUCTURAL_STEEL = "Structural Steel"
    FLAT_PRODUCTS = "Flat Products"
    LONG_PRODUCTS = "Long Products"
    TUBES_AND_PIPES = "Tubes and Pipes"


class SteelGradeEnum(str, enum.Enum):
    S235JR = "S235JR"
    S275JR = "S275JR"
    S275J0 = "S275J0"
    S275J2 = "S275J2"
    S355JR = "S355JR"
    S355J0 = "S355J0"
    S355J2 = "S355J2"
    S355K2 = "S355K2"
    S420 = "S420"
    S460 = "S460"


class HeatTreatmentEnum(str, enum.Enum):
    HOT_ROLLED = "Hot Rolled"
    COLD_ROLLED = "Cold Rolled"
    NORMALIZED = "Normalized"
    QUENCHED_AND_TEMPERED = "Quenched and Tempered"
    THERMOMECHANICALLY_ROLLED = "Thermomechanically Rolled"


class SurfaceConditionEnum(str, enum.Enum):
    HOT_ROLLED_MILL_FINISH = "Hot Rolled - Mill Finish"
    SHOT_BLASTED_AND_PRIMED = "Shot Blasted and Primed"
    GALVANIZED = "Galvanized"
    PAINTED = "Painted"
    COATED = "Coated"


# ─── MODELS ───────────────────────────────────────────────────────────────────
class ProductType(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "product_types"

    manufacturer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("manufacturers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Identity
    product_name = Column(String(255), nullable=False)
    product_model = Column(String(500))
    product_type = Column(String(100))
    product_category = Column(
        Enum(ProductCategoryEnum, name="product_category_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ProductCategoryEnum.STRUCTURAL_STEEL,
    )
    brand = Column(String(100))
    manufacturer_part_number = Column(String(100), unique=True)
    gtin = Column(String(14), unique=True)
    # Standards
    dimensional_standard = Column(String(100))
    material_standard = Column(String(100))
    steel_grade = Column(
        Enum(SteelGradeEnum, name="steel_grade_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
    )
    # Dimensions (mm)
    dim_height_mm = Column(Numeric(8, 2))
    dim_height_tolerance = Column(String(20))
    dim_width_mm = Column(Numeric(8, 2))
    dim_width_tolerance = Column(String(20))
    dim_web_thickness_mm = Column(Numeric(6, 3))
    dim_web_tolerance = Column(String(20))
    dim_flange_thickness_mm = Column(Numeric(6, 3))
    dim_flange_tolerance = Column(String(20))
    dim_root_radius_mm = Column(Numeric(6, 2))
    dim_root_tolerance = Column(String(20))
    # Geometric Properties
    section_area_cm2 = Column(Numeric(8, 3))
    weight_per_meter_kg = Column(Numeric(8, 3))
    moment_inertia_iy_cm4 = Column(Numeric(10, 2))
    moment_inertia_iz_cm4 = Column(Numeric(10, 2))
    section_modulus_wely_cm3 = Column(Numeric(8, 3))
    section_modulus_welz_cm3 = Column(Numeric(8, 3))
    radius_gyration_iy_cm = Column(Numeric(6, 3))
    radius_gyration_iz_cm = Column(Numeric(6, 3))
    # Available Lengths
    standard_length_m = Column(Numeric(5, 2))
    available_lengths = Column(ARRAY(Text))
    custom_length_available = Column(Boolean, default=True)
    # Processing
    heat_treatment = Column(
        Enum(HeatTreatmentEnum, name="heat_treatment_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
    )
    surface_condition = Column(
        Enum(SurfaceConditionEnum, name="surface_condition_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
    )
    # Environmental (per kg)
    epd_number = Column(String(100))
    epd_url = Column(String(500))
    epd_valid_until = Column(Date)
    co2_cradle_to_gate_kg = Column(Numeric(6, 4))
    co2_production_kg = Column(Numeric(6, 4))
    co2_transport_kg = Column(Numeric(6, 4))
    embodied_energy_mj_kg = Column(Numeric(8, 3))
    water_consumption_l_kg = Column(Numeric(6, 3))
    recycled_content_pct = Column(Numeric(5, 2))
    recyclability_pct = Column(Numeric(5, 2), default=100)
    # End of Life
    dismantling_difficulty = Column(String(50))
    hazardous_materials = Column(Boolean, default=False)
    hazardous_declaration = Column(Text)
    # Documentation URLs
    technical_drawing_url = Column(String(500))
    model_3d_url = Column(String(500))

    # Relationships
    manufacturer = relationship("Manufacturer", back_populates="product_types")
    chemical_composition = relationship(
        "ChemicalComposition", back_populates="product_type", uselist=False, cascade="all, delete-orphan"
    )
    mechanical_properties = relationship(
        "MechanicalProperties", back_populates="product_type", uselist=False, cascade="all, delete-orphan"
    )
    certifications = relationship("Certification", back_populates="product_type")
    dpps = relationship("DigitalProductPassport", back_populates="product_type")
    access_policies = relationship("DppAccessPolicy", back_populates="product_type")


class ChemicalComposition(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "chemical_compositions"

    product_type_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_types.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    # Carbon
    carbon_pct = Column(Numeric(5, 4))
    carbon_max_pct = Column(Numeric(5, 4))
    # Silicon
    silicon_pct = Column(Numeric(5, 4))
    silicon_max_pct = Column(Numeric(5, 4))
    # Manganese
    manganese_pct = Column(Numeric(5, 4))
    manganese_max_pct = Column(Numeric(5, 4))
    # Phosphorus
    phosphorus_pct = Column(Numeric(6, 5))
    phosphorus_max_pct = Column(Numeric(6, 5))
    # Sulfur
    sulfur_pct = Column(Numeric(6, 5))
    sulfur_max_pct = Column(Numeric(6, 5))
    # Nitrogen
    nitrogen_pct = Column(Numeric(6, 5))
    nitrogen_max_pct = Column(Numeric(6, 5))
    # Reference standard
    reference_standard = Column(String(100))

    # Relationships
    product_type = relationship("ProductType", back_populates="chemical_composition")


class MechanicalProperties(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "mechanical_properties"

    product_type_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_types.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    # Yield strength (MPa)
    yield_strength_mpa = Column(Numeric(7, 2))
    yield_strength_min_mpa = Column(Numeric(7, 2))
    # Tensile strength (MPa)
    tensile_strength_mpa = Column(Numeric(7, 2))
    tensile_strength_min_mpa = Column(Numeric(7, 2))
    tensile_strength_max_mpa = Column(Numeric(7, 2))
    # Elongation (%)
    elongation_pct = Column(Numeric(5, 2))
    elongation_min_pct = Column(Numeric(5, 2))
    # Impact energy (Joule) and temperature (°C)
    impact_energy_j = Column(Numeric(6, 2))
    impact_temperature_c = Column(Numeric(5, 1))
    # Reference standard
    reference_standard = Column(String(100))
    # Test conditions
    test_temperature_c = Column(Numeric(5, 1))
    test_direction = Column(String(50))

    # Relationships
    product_type = relationship("ProductType", back_populates="mechanical_properties")

# Compatibility imports for SQLAlchemy relationship resolution
from app.models.manufacturer import Manufacturer
from app.models.certification import Certification
from app.models.dpp import DigitalProductPassport
from app.models.security import DppAccessPolicy