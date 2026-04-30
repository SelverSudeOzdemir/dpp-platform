"""
Base model ve mixin'ler — TimestampMixin, UUIDMixin, SoftDeleteMixin
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Tüm modeller için DeclarativeBase."""
    pass


class UUIDMixin:
    """UUID v4 primary key mixin."""
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )


class TimestampMixin:
    """created_at ve updated_at otomatik timestamp mixin."""
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class SoftDeleteMixin:
    """Soft delete mixin — is_active flag ile."""
    is_active = Column(Boolean, default=True, nullable=False)


class CreatedAtMixin:
    """Sadece created_at (update yok, immutable kayıtlar için)."""
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )