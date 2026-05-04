"""
Integration modelleri
"""
import enum
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum, SmallInteger, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin, CreatedAtMixin


# ─── ENUM TYPES ───────────────────────────────────────────────────────────────
class RegistrySyncStatusEnum(str, enum.Enum):
    PENDING = "pending"
    SYNCED = "synced"
    FAILED = "failed"
    RETRYING = "retrying"


# ─── MODELS ───────────────────────────────────────────────────────────────────
class RegistrySyncQueue(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "registry_sync_queue"

    dpp_id = Column(
        UUID(as_uuid=True),
        ForeignKey("digital_product_passports.id", ondelete="CASCADE"),
        nullable=False,
    )
    status = Column(
        Enum(RegistrySyncStatusEnum, name="registry_sync_status_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=RegistrySyncStatusEnum.PENDING,
    )
    retry_count = Column(SmallInteger, default=0)
    last_error = Column(Text)
    sync_date = Column(DateTime(timezone=True))

    # Relationships
    dpp = relationship("DigitalProductPassport", back_populates="registry_sync_entries")


class BackupSnapshot(Base, UUIDMixin, CreatedAtMixin):
    __tablename__ = "backup_snapshots"

    dpp_id = Column(
        UUID(as_uuid=True),
        ForeignKey("digital_product_passports.id", ondelete="SET NULL"),
    )
    snapshot_url = Column(String(500), nullable=False)
    checksum_sha256 = Column(String(64), nullable=False)
    file_size_bytes = Column(Numeric(12, 0))

    # Relationships
    dpp = relationship("DigitalProductPassport", back_populates="backup_snapshots")


class DppChangelog(Base, UUIDMixin, CreatedAtMixin):
    __tablename__ = "dpp_changelog"

    dpp_id = Column(
        UUID(as_uuid=True),
        ForeignKey("digital_product_passports.id", ondelete="CASCADE"),
        nullable=False,
    )
    changed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    change_type = Column(String(50), nullable=False)  # UPDATE, ACTIVATE, DEACTIVATE
    previous_state = Column(JSONB)
    new_state = Column(JSONB)

    # Relationships
    dpp = relationship("DigitalProductPassport", back_populates="changelog_entries")
    user = relationship("User")

from app.models.user import User