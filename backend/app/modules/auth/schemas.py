"""
Auth schemas — Login, Token, User DTOs
Orijinal app/schemas/user.py içeriğinin aynısıdır.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.auth.models import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER


class UserInvite(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.CUSTOMER
    company_name: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserStatusUpdate(BaseModel):
    is_active: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    role: UserRole
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


class UserPasswordReset(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128)
