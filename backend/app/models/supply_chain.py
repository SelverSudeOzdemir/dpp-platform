"""
Supply Chain modelleri
kocaer.sql ile senkronize edildi:
  - SupplyChainOrganization'a tax_id, city, address, website, is_verified eklendi
  - SupplyChainStage'e from_location, to_location, transport_method,
    distance_km, co2_kg_per_km eklendi
"""
from sqlalchemy import Column, String, Numeric, Date, Text, SmallInteger, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, CreatedAtMixin

import uuid


class SupplyChainOrganization(Base, UUIDMixin, CreatedAtMixin):
    __tablename__ = "supply_chain_organizations"

    name = Column(String(255), nullable=False)
    role = Column(String(100))
    location_text = Column(String(500))
    country_code = Column(String(2))
    # kocaer.sql ile senkronize — yeni kolonlar
    tax_id = Column(String(50))
    city = Column(String(100))
    address = Column(String(500))
    website = Column(String(255))
    is_verified = Column(SmallInteger, default=0)

    # Relationships
    stages = relationship("SupplyChainStage", back_populates="organization")


class SupplyChainStage(Base, UUIDMixin, CreatedAtMixin):
    __tablename__ = "supply_chain_stages"
    __table_args__ = (
        UniqueConstraint("dpp_id", "sequence_number", name="uq_dpp_stage_seq"),
    )

    dpp_id = Column(
        UUID(as_uuid=True),
        ForeignKey("digital_product_passports.id", ondelete="CASCADE"),
        nullable=False,
    )
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("supply_chain_organizations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    sequence_number = Column(SmallInteger, nullable=False)
    stage_name = Column(String(200), nullable=False)
    stage_date = Column(Date)
    traceability_id = Column(UUID(as_uuid=True), default=uuid.uuid4)
    notes = Column(Text)
    # kocaer.sql ile senkronize — taşıma/rota bilgileri
    from_location = Column(String(255))
    to_location = Column(String(255))
    transport_method = Column(String(100))
    distance_km = Column(Numeric(10, 2))
    co2_kg_per_km = Column(Numeric(10, 4))

    # Relationships
    dpp = relationship("DigitalProductPassport", back_populates="supply_chain_stages")
    organization = relationship("SupplyChainOrganization", back_populates="stages")
    materials = relationship("SupplyChainMaterial", back_populates="stage", cascade="all, delete-orphan")
    processes = relationship("SupplyChainProcess", back_populates="stage", cascade="all, delete-orphan")


class SupplyChainMaterial(Base, UUIDMixin, CreatedAtMixin):
    __tablename__ = "supply_chain_materials"

    stage_id = Column(
        UUID(as_uuid=True),
        ForeignKey("supply_chain_stages.id", ondelete="CASCADE"),
        nullable=False,
    )
    material_name = Column(String(255), nullable=False)
    quantity = Column(Numeric(12, 3))
    unit = Column(String(20))
    origin_country = Column(String(100))

    # Relationships
    stage = relationship("SupplyChainStage", back_populates="materials")


class SupplyChainProcess(Base, UUIDMixin, CreatedAtMixin):
    __tablename__ = "supply_chain_processes"

    stage_id = Column(
        UUID(as_uuid=True),
        ForeignKey("supply_chain_stages.id", ondelete="CASCADE"),
        nullable=False,
    )
    process_name = Column(String(200), nullable=False)
    sequence_number = Column(SmallInteger)

    # Relationships
    stage = relationship("SupplyChainStage", back_populates="processes")