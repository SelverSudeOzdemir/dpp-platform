"""
Rate Limiting — SlowAPI

main.py'a da ekleme gerekiyor (ADIM 10'da yapacağız).
"""
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute", "1000/hour"],
    headers_enabled=True,  # Response'a X-RateLimit-* header'ları ekler
)


class RateLimits:
    """Endpoint bazlı limit sabitleri — decorator olarak kullanılır."""
    AUTH_LOGIN    = "5/minute"    # Brute force koruması
    AUTH_REFRESH  = "10/minute"
    DPP_CREATE    = "30/minute"
    DPP_READ      = "200/minute"
    QR_GENERATE   = "50/minute"
    APIKEY_CREATE = "10/minute"
    PUBLIC_API    = "100/minute"