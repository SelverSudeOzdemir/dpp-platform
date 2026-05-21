"""
Manufacturer, ManufacturerCertification, ProductionFacility modelleri
kocaer.sql ile senkronize edildi:
  - ProductionFacility'e gln ve vat_number kolonları eklendi
"""
from sqlalchemy import Column, String, Text, ForeignKey, Enum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class Manufacturer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "manufacturers"

    company_id = Column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(255), nullable=False)
    legal_name = Column(String(255))
    registration_number = Column(String(100))
    vat_number = Column(String(50))
    headquarters_address = Column(Text)
    city = Column(String(100))
    country_code = Column(String(2))
    website = Column(String(255))
    contact_email = Column(String(255))

    # Relationships
    company = relationship("Company", back_populates="manufacturers")
    facilities = relationship("ProductionFacility", back_populates="manufacturer", cascade="all, delete-orphan")
    product_types = relationship("ProductType", back_populates="manufacturer")
    manufacturer_certifications = relationship(
        "ManufacturerCertification", back_populates="manufacturer", cascade="all, delete-orphan"
    )


class ManufacturerCertification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "manufacturer_certifications"

    manufacturer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("manufacturers.id", ondelete="CASCADE"),
        nullable=False,
    )
    cert_name = Column(String(200), nullable=False)
    cert_number = Column(String(100))
    expiry_date = Column(String(50))
    document_url = Column(String(500))

    # Relationships
    manufacturer = relationship("Manufacturer", back_populates="manufacturer_certifications")


class ProductionFacility(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "production_facilities"

    manufacturer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("manufacturers.id", ondelete="CASCADE"),
        nullable=False,
    )
    facility_name = Column(String(255), nullable=False)
    location_text = Column(String(500))
    country_code = Column(String(2))
    is_active = Column(Boolean, default=True)
    # kocaer.sql ile senkronize — yeni kolonlar
    gln = Column(String(20))
    vat_number = Column(String(50))

    # Relationships
    manufacturer = relationship("Manufacturer", back_populates="facilities")
    dpps = relationship("DigitalProductPassport", back_populates="production_facility")

# Compatibility imports for SQLAlchemy relationship resolution
from app.models.company import Company
from app.models.product import ProductType
from app.models.dpp import DigitalProductPassport