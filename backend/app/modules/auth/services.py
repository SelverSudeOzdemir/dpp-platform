"""
Auth services — AuthService, PasswordService
Orijinal app/services/auth_service.py + app/services/password_service.py içeriğinin aynısıdır.
"""

import re
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.config import settings
from app.modules.auth.models import User

_revoked_jtis: set[str] = set()

_pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
)


# ─── Password Service ────────────────────────────────────────────────────────
class PasswordService:

    @staticmethod
    def hash(plain_password: str) -> str:
        """Şifreyi hash'le — DB'ye bu kaydedilir."""
        return _pwd_context.hash(plain_password)

    @staticmethod
    def verify(plain_password: str, hashed_password: str) -> bool:
        """Girilen şifre ile hash'i karşılaştır. Timing-safe."""
        return _pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def needs_rehash(hashed_password: str) -> bool:
        """bcrypt rounds değişince eski hash'lerin güncellenmesi gerekir mi?"""
        return _pwd_context.needs_update(hashed_password)

    @staticmethod
    def validate_strength(password: str) -> list[str]:
        """
        Şifre kurallarını kontrol et.
        Boş liste dönerse şifre geçerli.
        """
        errors: list[str] = []
        if len(password) < 8:
            errors.append("En az 8 karakter olmalıdır")
        if len(password) > 128:
            errors.append("En fazla 128 karakter olabilir")
        if not re.search(r"[A-Z]", password):
            errors.append("En az bir büyük harf içermelidir")
        if not re.search(r"[a-z]", password):
            errors.append("En az bir küçük harf içermelidir")
        if not re.search(r"\d", password):
            errors.append("En az bir rakam içermelidir")
        if not re.search(r"[!@#$%^&*()\-_=+\[\]{}|;:',.<>?]", password):
            errors.append("En az bir özel karakter içermelidir")
        return errors

    @classmethod
    def validate_and_hash(cls, password: str) -> str:
        """Kural kontrolü + hash'leme tek seferde."""
        errors = cls.validate_strength(password)
        if errors:
            raise ValueError(f"Şifre gereksinimleri: {'; '.join(errors)}")
        return cls.hash(password)


# ─── Token Models ─────────────────────────────────────────────────────────────
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


# ─── Auth Service ─────────────────────────────────────────────────────────────
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
