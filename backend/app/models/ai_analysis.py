from sqlalchemy import Column, String, Text, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class DppAiAnalysis(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "dpp_ai_analyses"

    dpp_id = Column(
        UUID(as_uuid=True),
        ForeignKey("digital_product_passports.id", ondelete="CASCADE"),
        nullable=False,
    )
    model_name = Column(String(100), nullable=False)
    score = Column(Numeric(5, 2), nullable=False)
    risk_level = Column(String(50), nullable=False)
    ai_report_text = Column(Text, nullable=False)
    
    # İlişki (İsteğe bağlı, DigitalProductPassport üzerinden erişmek için)
    # dpp = relationship("DigitalProductPassport", backref="ai_analyses")


class SupplierAiAnalysis(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "supplier_ai_analyses"

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("supply_chain_organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    model_name = Column(String(100), nullable=False)
    trust_score = Column(Numeric(5, 2), nullable=False)
    risk_level = Column(String(50), nullable=False)
    ai_report_text = Column(Text, nullable=False)

