"""API v1 Router — Tüm endpoint'leri toplar"""
from fastapi import APIRouter
from app.api.v1 import auth, users, audit_logs
from app.modules.admin import router as admin_router
from app.modules.certifications.router import router as certifications_router
from app.modules.compliance.cbam import router as cbam_router
from app.modules.compliance.reach import router as reach_router

router = APIRouter()

# Mühendis 3 — Auth, Users, Audit, Admin
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(audit_logs.router)
router.include_router(admin_router)

# Mühendis 2 — Compliance & Sertifika
router.include_router(certifications_router)
router.include_router(cbam_router)
router.include_router(reach_router)