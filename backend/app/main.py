from fastapi import FastAPI

from app.api.v1.router import router

# 🔥 TÜM MODELLERİ YÜKLE (CRITICAL FIX)
import app.models.security
import app.models.integration
import app.models.user
import app.models.company
import app.models.manufacturer
import app.models.product
import app.models.dpp
import app.models.supply_chain
import app.models.lifecycle
import app.models.certification

# Mapper'lari konfigure et
from app.models.base import Base
Base.registry.configure()

app = FastAPI(
    title="Kocaer DPP API",
    version="1.0.0",
    description="Digital Product Passport API - Kocaer Çelik",
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}