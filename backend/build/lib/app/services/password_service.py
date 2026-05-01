"""
Şifre hash'leme ve doğrulama — passlib[bcrypt]
"""
from __future__ import annotations
import re
from passlib.context import CryptContext

_pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
)


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