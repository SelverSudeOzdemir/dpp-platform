"""
User, ApiKey ve AuditLog modelleri
"""
import enum
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin, CreatedAtMixin


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANUFACTURER = "manufacturer"
    STAKEHOLDER = "stakeholder"
    AUDITOR = "auditor"


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(
        Enum(UserRole, name="user_role_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=UserRole.STAKEHOLDER,
    )
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Relationships
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")


class ApiKey(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "api_keys"

    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    key_hint = Column(String(10), nullable=False)  # 'sk-abc...' formatı için ilk birkaç karakter
    hashed_key = Column(String(255), unique=True, nullable=False)
    name = Column(String(100), default="Default Key")
    expires_at = Column(DateTime)
    last_used_at = Column(DateTime)
    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="api_keys")


class AuditLog(Base, UUIDMixin, CreatedAtMixin):
    __tablename__ = "audit_logs"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(String(100))
    details = Column(Text)
    ip_address = Column(String(45))

    # Relationships
    user = relationship("User", back_populates="audit_logs")