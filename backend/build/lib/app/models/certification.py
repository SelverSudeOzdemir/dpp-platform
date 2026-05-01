"""
Certification modeli
cert_scope: product_type / dpp_instance ayrımı
"""
import enum
from sqlalchemy import Column, String, Date, Text, ForeignKey, Enum, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


# ─── ENUM TYPES ───────────────────────────────────────────────────────────────
class CertificationStatusEnum(str, enum.Enum):
    VALID = "Valid"
    EXPIRED = "Expired"
    SUSPENDED = "Suspended"
    REVOKED = "Revoked"


class CertScopeEnum(str, enum.Enum):
    PRODUCT_TYPE = "product_type"
    DPP_INSTANCE = "dpp_instance"


# ─── MODEL ────────────────────────────────────────────────────────────────────
class Certification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "certifications"
    __table_args__ = (
        CheckConstraint(
            """
            (cert_scope = 'product_type' AND product_type_id IS NOT NULL AND dpp_id IS NULL)
            OR
            (cert_scope = 'dpp_instance' AND dpp_id IS NOT NULL AND product_type_id IS NULL)
            """,
            name="chk_cert_scope_consistency",
        ),
    )

    # Linkage
    product_type_id = Column(UUID(as_uuid=True), ForeignKey("product_types.id", ondelete="CASCADE"))
    dpp_id = Column(UUID(as_uuid=True), ForeignKey("digital_product_passports.id", ondelete="CASCADE"))
    cert_scope = Column(
        Enum(CertScopeEnum, name="cert_scope_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    # Certificate Details
    cert_type = Column(String(200), nullable=False)
    cert_number = Column(String(200), nullable=False)
    issuer = Column(String(255), nullable=False)
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date)
    scope = Column(Text)
    document_url = Column(String(500))
    status = Column(
        Enum(CertificationStatusEnum, name="certification_status_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=CertificationStatusEnum.VALID,
    )

    # Relationships
    product_type = relationship("ProductType", back_populates="certifications")
    dpp = relationship("DigitalProductPassport", back_populates="certifications")