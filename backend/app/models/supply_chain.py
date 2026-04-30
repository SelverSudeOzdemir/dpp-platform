"""
Supply Chain modelleri
SupplyChainOrganization, SupplyChainStage, SupplyChainMaterial, SupplyChainProcess
"""
from sqlalchemy import Column, String, Numeric, Date, Text, SmallInteger, ForeignKey, UniqueConstraint
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