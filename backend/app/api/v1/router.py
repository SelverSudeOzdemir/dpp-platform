"""API v1 Router — Tüm endpoint'leri toplar"""
from fastapi import APIRouter
from app.api.v1 import dpp, products, product_specs, certifications, manufacturers
from app.api.v1 import auth, users, qr, integrations  # 🟢 DEV-3
router = APIRouter()

# 🔴 DEV-1
router.include_router(dpp.router, prefix="/dpp", tags=["DPP"])

# 🔵 DEV-2
router.include_router(products.router, prefix="/products", tags=["Products"])
router.include_router(product_specs.router, prefix="/product-specs", tags=["Product Specifications"])
router.include_router(certifications.router, prefix="/certifications", tags=["Certifications"])
router.include_router(manufacturers.router, prefix="/manufacturers", tags=["Manufacturers"])

# 🟢 DEV-3 — prefix router içinde tanımlı olduğu için burada yazmıyoruz
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(qr.router)
router.include_router(integrations.router)