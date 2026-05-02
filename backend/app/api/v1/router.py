"""API v1 Router — Tüm endpoint'leri toplar"""
from fastapi import APIRouter
from app.api.v1 import auth, users, audit_logs

router = APIRouter()

# 🟢 DEV-3 — Auth, Users, Audit (çalışan modüller)
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(audit_logs.router)