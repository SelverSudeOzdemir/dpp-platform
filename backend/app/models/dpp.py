"""
DigitalProductPassport modeli
kocaer.sql ile senkronize edildi:
  - DppStatusEnum genişletildi (active, deactivated, registered eklendi)
  - rejection_reason, rejection_fields, rejected_by, rejected_at kolonları eklendi
  - search_vector kolonu eklendi
"""
import enum
from sqlalchemy import Column, String, Boolean, Date, Text, Numeric, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from sqlalchemy import DateTime
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin
from app.models.supply_chain import SupplyChainStage


# ─── ENUM TYPES ───────────────────────────────────────────────────────────────
class DataCarrierFormatEnum(str, enum.Enum):
    QR_CODE = "QR Code"
    DATA_MATRIX = "DataMatrix"
    BARCODE = "Barcode"
    RFID = "RFID"
    NFC = "NFC"


class DppStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    PUBLISHED = "published"
    REJECTED = "rejected"
    ARCHIVED = "archived"
    # Gerçek DB'den gelen ek değerler (kocaer.sql ile senkronize)
    ACTIVE = "active"
    DEACTIVATED = "deactivated"
    REGISTERED = "registered"
    RECALLED = "recalled"


# ─── MODEL ────────────────────────────────────────────────────────────────────
class DigitalProductPassport(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "digital_product_passports"

    # DPP Metadata
    dpp_version = Column(String(20), nullable=False, default="1.0.0")
    dpp_standard = Column(String(100), nullable=False, default="CIRPASS-Compatible")
    # Product Link
    product_type_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_types.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Public Identifier (UPI)
    public_identifier = Column(UUID(as_uuid=True), nullable=False, unique=True)
    # GS1
    gtin = Column(String(14))
    gs1_serial_number = Column(String(50), nullable=False)
    # Data Carrier
    data_carrier_type = Column(
        Enum(DataCarrierFormatEnum, name="data_carrier_format_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=DataCarrierFormatEnum.DATA_MATRIX,
    )
    data_carrier_standard = Column(String(50), default="ISO/IEC 16022")
    # Internal References (RESTRICTED)
    _batch_number = Column("_batch_number", String(100))
    _serial_number = Column("_serial_number", String(100))
    _production_order_number = Column("_production_order_number", String(100))
    # Production
    production_facility_id = Column(
        UUID(as_uuid=True),
        ForeignKey("production_facilities.id"),
    )
    production_date = Column(Date, nullable=False)
    production_line = Column(String(255))
    shift = Column(String(100))
    # DPP Hosting
    api_endpoint = Column(String(500), default="https://api.kocaersteel.com/dpp/v1/")
    backup_primary_url = Column(String(500))
    backup_secondary_url = Column(String(500))
    data_format = Column(String(50), default="JSON-LD")
    data_schema = Column(String(100), default="CIRPASS DPP Schema v1.0")
    # Version Control
    current_version = Column(String(20), default="1.0.0")
    # Status
    is_active = Column(Boolean, nullable=False, default=True)
    dpp_status = Column(
        Enum(DppStatusEnum, name="dpp_status_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=DppStatusEnum.DRAFT,
    )
    status_changed_at = Column(DateTime(timezone=True))
    # Rejection bilgileri (kocaer.sql — yeni kolonlar)
    rejection_reason = Column(Text)
    rejection_fields = Column(JSONB)
    rejected_by = Column(String(255))
    rejected_at = Column(DateTime(timezone=True))
    # JSON-LD
    json_ld = Column(JSONB)
    # HTML Content
    html_content = Column(Text)
    # Full-text search (kocaer.sql — DB trigger tarafından doldurulur, ORM yazmaz)
    search_vector = Column(TSVECTOR)

    # Relationships
    product_type = relationship("ProductType", back_populates="dpps")
    production_facility = relationship("ProductionFacility", back_populates="dpps")
    certifications = relationship("Certification", back_populates="dpp")
    supply_chain_stages = relationship("SupplyChainStage", back_populates="dpp", cascade="all, delete-orphan")
    lifecycle_events = relationship("LifecycleEvent", back_populates="dpp", cascade="all, delete-orphan")
    changelog_entries = relationship("DppChangelog", back_populates="dpp", cascade="all, delete-orphan")
    registry_sync_entries = relationship("RegistrySyncQueue", back_populates="dpp", cascade="all, delete-orphan")
    backup_snapshots = relationship("BackupSnapshot", back_populates="dpp")

# Compatibility imports for SQLAlchemy relationship resolution
from app.models.lifecycle import LifecycleEvent
from app.models.product import ProductType
from app.models.integration import DppChangelog
from app.models.manufacturer import ProductionFacility
from app.models.certification import Certification
from app.models.security import DppAccessPolicy