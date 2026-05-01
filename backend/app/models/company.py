"""
Company modeli — Multi-Tenant yapı
"""
from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class Company(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "companies"

    name = Column(String(255), nullable=False, unique=True)
    description = Column(String(500))
    website = Column(String(255))
    support_email = Column(String(255))

    # Relationships
    manufacturers = relationship("Manufacturer", back_populates="company", cascade="all, delete-orphan")
    # users = relationship("User", back_populates="company", cascade="all, delete-orphan")