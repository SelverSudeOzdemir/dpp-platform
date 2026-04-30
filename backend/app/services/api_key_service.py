"""
API Key Service

Mevcut ApiKey modeli:
  key_hint   → String(10), plain, DB'de saklanır (hızlı arama için)
  hashed_key → String(255), SHA-256 hash
"""
from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

KEY_PREFIX = "sk-"
SECRET_LENGTH = 32


@dataclass
class GeneratedAPIKey:
    """
    Tek seferlik üretilen key bilgisi.
    plain_key sadece bu nesne içinde var — DB'ye yazılmaz!
    """
    plain_key: str    # Kullanıcıya gösterilen — bir kez!
    key_hint: str     # DB'deki ApiKey.key_hint
    hashed_key: str   # DB'deki ApiKey.hashed_key
    created_at: datetime


class APIKeyService:

    @staticmethod
    def generate() -> GeneratedAPIKey:
        """
        Yeni API key üret.

        Örnek: sk-xK9mN2pQrT4v7bYuA3zW...
        key_hint: "sk-xK9mN2p"  ← ilk 10 karakter, plain saklanır
        hashed_key: sha256(plain_key) ← DB'ye bu gider
        """
        secret = secrets.token_urlsafe(SECRET_LENGTH)
        plain_key = f"{KEY_PREFIX}{secret}"
        key_hint = plain_key[:10]
        hashed_key = APIKeyService._hash(plain_key)

        return GeneratedAPIKey(
            plain_key=plain_key,
            key_hint=key_hint,
            hashed_key=hashed_key,
            created_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _hash(plain_key: str) -> str:
        return hashlib.sha256(plain_key.encode()).hexdigest()

    @staticmethod
    def verify(plain_key: str, stored_hashed_key: str) -> bool:
        """Gelen key ile DB'deki hash'i karşılaştır. Timing-safe."""
        computed = APIKeyService._hash(plain_key)
        return secrets.compare_digest(computed, stored_hashed_key)

    @staticmethod
    def extract_hint(plain_key: str) -> str:
        """DB'de arama yapabilmek için key_hint üret."""
        return plain_key[:10]

    @staticmethod
    def extract_from_header(authorization: Optional[str]) -> Optional[str]:
        """
        'Authorization: ApiKey sk-...' header'ından key'i çıkar.
        Bearer token değil, ApiKey token.
        """
        if not authorization:
            return None
        parts = authorization.split(" ", 1)
        if len(parts) == 2 and parts[0].lower() == "apikey":
            return parts[1].strip()
        return None