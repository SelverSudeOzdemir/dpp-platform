"""API v1 Router — Tüm aktif modülleri toplar"""
from fastapi import APIRouter
from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.audit.router import router as audit_router
from app.modules.admin.router import router as admin_router
from app.modules.dpp.router import router as dpp_router
from app.modules.supply_chain.router import router as supply_chain_router
from app.modules.lifecycle.router import router as lifecycle_router
from app.modules.export.router import router as export_router
from app.modules.certifications.router import router as certifications_router
from app.modules.compliance.cbam import router as cbam_router
from app.modules.compliance.reach import router as reach_router

router = APIRouter()

# 🟢 Altyapı Modülleri
router.include_router(auth_router)
router.include_router(users_router)
router.include_router(audit_router)

# 🛡️ Admin & Dashboard
router.include_router(admin_router)

# 📦 DPP Çekirdek & Yaşam Döngüsü
router.include_router(dpp_router)
router.include_router(lifecycle_router)

# 🚚 Tedarik Zinciri & Export
router.include_router(supply_chain_router)
router.include_router(export_router)

# 🏅 Mühendis 2 — Compliance & Sertifika
router.include_router(certifications_router)
router.include_router(cbam_router)
router.include_router(reach_router)
from app.modules.products.router import router as products_router
router.include_router(products_router)