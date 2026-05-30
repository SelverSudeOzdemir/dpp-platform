"""API v1 Router — Tüm endpoint'leri toplar"""
from fastapi import APIRouter
from app.api.v1 import auth, users, audit_logs, dpp_public
from app.modules.admin import router as admin_router
from app.modules.dpp.router import router as dpp_router
from app.modules.products.router import router as products_router
from app.modules.certifications.router import router as certifications_router
from app.modules.compliance.cbam import router as cbam_router
from app.modules.compliance.reach import router as reach_router
from app.modules.supply_chain.router import router as supply_chain_router
from app.modules.lifecycle.router import router as lifecycle_router
from app.modules.export.router import router as export_router
from app.modules.integration.router import router as integration_router
from app.modules.ai.router import router as ai_router

router = APIRouter()

# Auth, Users
router.include_router(auth.router)
router.include_router(users.router)

# Audit Logs
router.include_router(audit_logs.router)

# Products (CRUD + chemical + mechanical)
router.include_router(products_router)

# DPP Public — QR ile public erişim
router.include_router(dpp_public.router)

# Admin — Dashboard & Approvals
router.include_router(admin_router)

# DPP CRUD — /dpps/ (summary-stats, list, create, update, delete, changelog)
router.include_router(dpp_router)

# Certifications — /certifications/
router.include_router(certifications_router)

# Compliance — /compliance/ (CBAM + REACH)
router.include_router(cbam_router)
router.include_router(reach_router)

# Supply Chain — /supply-chain/
router.include_router(supply_chain_router)

# Lifecycle — /dpp/{id}/lifecycle
router.include_router(lifecycle_router)

# Export — /export/ (JSON, CBAM-XML)
router.include_router(export_router)

# Integrations — /integrations/ (SAP sync, Excel parse, document parse)
router.include_router(integration_router)

# AI Analysis — /ai/ (rule engine + Ollama LLM)
router.include_router(ai_router)

