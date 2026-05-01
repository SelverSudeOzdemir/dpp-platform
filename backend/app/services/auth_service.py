from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import settings
from app.models.user import User
from app.services.password_service import PasswordService

_revoked_jtis: set[str] = set()


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    sub: str
    email: str | None = None
    name: str | None = None
    role: str
    jti: str
    type: str
    exp: int
    iat: int


class AuthService:
    ALGORITHM = "HS256"

    @classmethod
    def _create_token(cls, user: User, token_type: str, expires_delta: timedelta) -> str:
        now = datetime.now(timezone.utc)
        expire = now + expires_delta
        jti = str(uuid.uuid4())

        payload = {
            "sub": str(user.id),
            "email": user.email,
            "name": user.full_name,
            "role": user.role.value if hasattr(user.role, "value") else user.role,
            "jti": jti,
            "type": token_type,
            "exp": int(expire.timestamp()),
            "iat": int(now.timestamp()),
        }

        return jwt.encode(payload, settings.SECRET_KEY, algorithm=cls.ALGORITHM)

    @classmethod
    def create_token_pair(cls, user: User) -> TokenPair:
        access_token = cls._create_token(
            user,
            "access",
            timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        refresh_token = cls._create_token(
            user,
            "refresh",
            timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )

        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    @classmethod
    def decode_token(cls, token: str) -> TokenPayload:
        try:
            raw = jwt.decode(token, settings.SECRET_KEY, algorithms=[cls.ALGORITHM])
        except JWTError as e:
            raise JWTError(f"Token geçersiz: {e}") from e

        payload = TokenPayload(**raw)

        if payload.jti in _revoked_jtis:
            raise ValueError("Token iptal edilmiş")

        return payload

    @classmethod
    def verify_access_token(cls, token: str) -> TokenPayload:
        payload = cls.decode_token(token)

        if payload.type != "access":
            raise ValueError("Access token bekleniyor")

        return payload

    @classmethod
    def verify_refresh_token(cls, token: str) -> TokenPayload:
        payload = cls.decode_token(token)

        if payload.type != "refresh":
            raise ValueError("Refresh token bekleniyor")

        return payload

    @classmethod
    async def authenticate(cls, user: User, password: str) -> TokenPair:
        if not user.is_active:
            raise ValueError("Hesap aktif değil")

        if not PasswordService.verify(password, user.hashed_password):
            raise ValueError("E-posta veya şifre hatalı")

        return cls.create_token_pair(user)

    @classmethod
    async def refresh(cls, refresh_token: str, user: User) -> TokenPair:
        payload = cls.verify_refresh_token(refresh_token)
        cls.revoke_token(payload.jti)
        return cls.create_token_pair(user)

    @classmethod
    def revoke_token(cls, jti: str) -> None:
        _revoked_jtis.add(jti)