from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # 🔥 CORS modülü import edildi

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

# 🔥 CORS AYARLARI (Frontend'in Backend ile konuşabilmesi için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Sadece frontend'in adresine izin ver
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, PATCH vb. tüm işlemlere izin ver
    allow_headers=["*"],  # Tüm veri başlıklarına izin ver
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}