
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.core.deps import get_db, Permission, TokenPayload, require_permission
from app.modules.admin.schemas import AdminDashboardStats, DppApprovalRequest, AdminDppListItem, AdminKpiSummary, UrgentAlert
from app.modules.admin.services import AdminService
from app.models.dpp import DppStatusEnum

router = APIRouter(prefix="/admin", tags=["Admin Dashboard & Approvals"])

@router.get(
    "/kpi-summary", 
    response_model=AdminKpiSummary,
    summary="Admin Dashboard KPI özetini getir"
)
async def get_kpi_summary(
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ))
):
    return await AdminService.get_dashboard_stats(db)

@router.get(
    "/pending", 
    response_model=List[AdminDppListItem],
    summary="Onay bekleyen DPP'leri listele"
)
async def list_pending_dpps(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ))
):
    dpps = await AdminService.get_pending_dpps(db, skip, limit)
    return [
        AdminDppListItem(
            id=d.id,
            public_identifier=d.public_identifier,
            product_name=d.product_type.product_name if d.product_type else "Bilinmeyen Urun",
            gs1_serial_number=d.gs1_serial_number,
            status=d.dpp_status,
            created_at=d.created_at
        ) for d in dpps
    ]

@router.get(
    "/urgent-alerts",
    response_model=List[UrgentAlert],
    summary="Kritik eşikleri aşan veya süresi dolan ürünleri getir"
)
async def get_urgent_alerts(
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ))
):
    return await AdminService.get_urgent_alerts(db)

@router.post(
    "/approve/{dpp_id}",
    response_model=AdminDppListItem,
    summary="DPP onaylama işlemi"
)
async def approve_dpp(
    dpp_id: UUID,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_APPROVE))
):
    body = DppApprovalRequest(status=DppStatusEnum.PUBLISHED)
    d = await AdminService.update_dpp_status(db, dpp_id, body, token.sub)
    return AdminDppListItem(
        id=d.id,
        public_identifier=d.public_identifier,
        product_name=d.product_type.product_name if d.product_type else "Bilinmeyen Urun",
        gs1_serial_number=d.gs1_serial_number,
        status=d.dpp_status,
        created_at=d.created_at
    )
@router.post(
    "/reject/{dpp_id}",
    response_model=AdminDppListItem,
    summary="DPP reddetme işlemi"
)
async def reject_dpp(
    dpp_id: UUID,
    body: DppApprovalRequest,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_APPROVE))
):
    # Statüyü zorla REJECTED yapalım
    body.status = DppStatusEnum.REJECTED
    d = await AdminService.update_dpp_status(db, dpp_id, body, token.sub)
    return AdminDppListItem(
        id=d.id,
        public_identifier=d.public_identifier,
        product_name=d.product_type.product_name if d.product_type else "Bilinmeyen Urun",
        gs1_serial_number=d.gs1_serial_number,
        status=d.dpp_status,
        created_at=d.created_at
    )

@router.get(
    "/permissions-matrix",
    summary="Rol-Yetki matrisini getir",
    dependencies=[Depends(require_permission(Permission.ADMIN_PANEL))]
)
async def get_permissions_matrix():
    from app.middleware.rbac import _ROLE_PERMISSIONS, Permission
    
    # Permission sınıfındaki tüm sabitleri listele
    all_permissions = [
        getattr(Permission, attr) 
        for attr in dir(Permission) 
        if not attr.startswith("__")
    ]
    
    # Set'leri listeye çevirerek JSON uyumlu hale getir
    matrix = {role: list(perms) for role, perms in _ROLE_PERMISSIONS.items()}
    
    return {
        "permissions": all_permissions,
        "matrix": matrix
    }

@router.get(
    "/incomplete-report",
    summary="Eksik veri içeren DPP raporu",
    dependencies=[Depends(require_permission(Permission.ADMIN_PANEL))]
)
async def get_incomplete_report(
    db: AsyncSession = Depends(get_db)
):
    return await AdminService.get_incomplete_report(db)

