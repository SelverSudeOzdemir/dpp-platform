from fastapi import FastAPI
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.api.v1.router import router
from app.middleware.rate_limiter import limiter

# 🔥 TÜM MODELLERİ YÜKLE (CRITICAL FIX)
import app.models.user
import app.models.security
import app.models.product
import app.models.dpp
import app.models.supply_chain
import app.models.lifecycle
import app.models.manufacturer
import app.models.company
import app.models.certification

app = FastAPI(
    title="Kocaer DPP API",
    version="1.0.0",
    description="Digital Product Passport API - Kocaer Çelik",
)

# Rate limiting — 🟢 DEV-3 ekledi
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}