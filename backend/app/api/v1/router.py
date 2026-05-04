"""API v1 Router — Tüm endpoint'leri toplar"""
from fastapi import APIRouter
from app.api.v1 import auth, users, audit_logs
from app.modules.admin import router as admin_router

router = APIRouter()

# 🟢 DEV-3 — Auth, Users, Audit
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(audit_logs.router)

# 🛡️ 2. Kişi (Admin) — Dashboard & Approvals
router.include_router(admin_router)