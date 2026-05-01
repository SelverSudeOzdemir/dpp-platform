"""
Lifecycle modelleri
"""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, CreatedAtMixin


class LifecycleEvent(Base, UUIDMixin, CreatedAtMixin):
    __tablename__ = "lifecycle_events"

    dpp_id = Column(
        UUID(as_uuid=True),
        ForeignKey("digital_product_passports.id", ondelete="CASCADE"),
        nullable=False,
    )
    stage = Column(String(50), nullable=False)  # 'Production', 'Logistics', 'Usage', 'EOL'
    stage_label = Column(String(100))
    event_type = Column(String(100), nullable=False)
    event_date = Column(DateTime, nullable=False)
    description = Column(Text)
    location_text = Column(String(255))
    result = Column(String(100))
    status = Column(String(50), default="Completed")

    # Relationships
    dpp = relationship("DigitalProductPassport", back_populates="lifecycle_events")