"""
Security modelleri
"""
import enum
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum, Boolean, SmallInteger, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin, CreatedAtMixin


# ─── ENUM TYPES ───────────────────────────────────────────────────────────────
class AccessLevelEnum(str, enum.Enum):
    PUBLIC = "Public"
    STAKEHOLDER = "Stakeholder"
    INTERNAL = "Internal"
    RESTRICTED = "Restricted"


# ─── MODELS ───────────────────────────────────────────────────────────────────
class Stakeholder(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "stakeholders"

    name = Column(String(255), nullable=False)
    stakeholder_type = Column(String(100))  # Regulator, Customer, Recycler
    auth_endpoint = Column(String(500))
    public_key = Column(Text)

    # Relationships
    access_policies = relationship("DppAccessPolicy", back_populates="stakeholder")


class DppAccessPolicy(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "dpp_access_policies"

    # Policy target (can be specific DPP or whole product type)
    dpp_id = Column(UUID(as_uuid=True), ForeignKey("digital_product_passports.id"))
    product_type_id = Column(UUID(as_uuid=True), ForeignKey("product_types.id"))
    # Subject
    stakeholder_id = Column(
        UUID(as_uuid=True),
        ForeignKey("stakeholders.id", ondelete="CASCADE"),
    )
    access_level = Column(
        Enum(AccessLevelEnum, name="access_level_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AccessLevelEnum.PUBLIC,
    )
    # GDPR / Data Privacy
    is_personal_data = Column(Boolean, default=False)
    retention_period_months = Column(SmallInteger)

    # Relationships
    stakeholder = relationship("Stakeholder", back_populates="access_policies")
    dpp = relationship("DigitalProductPassport")
    product_type = relationship("ProductType")


class ApiAccessLog(Base, UUIDMixin, CreatedAtMixin):
    __tablename__ = "api_access_logs"

    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"))
    request_path = Column(String(500))
    request_method = Column(String(10))
    response_status = Column(SmallInteger)
    ip_address = Column(String(50))
    user_agent = Column(Text)