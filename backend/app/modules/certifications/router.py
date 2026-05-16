from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.middleware.rbac import Permission, TokenPayload, require_permission, require_admin
from app.modules.certifications.schemas import (
    CertificationCreate,
    CertificationListResponse,
    CertificationOut,
    CertificationUpdate,
)
from app.modules.certifications.services import CertificationService

router = APIRouter(prefix="/certifications", tags=["Certifications"])


@router.get("/expiring", response_model=list[CertificationOut], summary="Süresi yaklaşan sertifikalar")
async def get_expiring_certifications(
    days: int = Query(30, ge=1, le=365),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
    db: AsyncSession = Depends(get_db),
):
    return await CertificationService.get_expiring_certifications(db, days=days)


@router.get("/", response_model=CertificationListResponse, summary="Sertifika listesi")
async def list_certifications(
    cert_scope: Optional[str] = Query(None),
    cert_status: Optional[str] = Query(None),
    dpp_id: Optional[UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
    db: AsyncSession = Depends(get_db),
):
    items, total = await CertificationService.list_certifications(
        db, cert_scope=cert_scope, cert_status=cert_status, dpp_id=dpp_id, skip=skip, limit=limit
    )
    return {"data": items, "total": total}


@router.post("/", response_model=CertificationOut, status_code=201, summary="Yeni sertifika ekle")
async def create_certification(
    body: CertificationCreate,
    request: Request,
    token: TokenPayload = Depends(require_permission(Permission.DPP_CREATE)),
    db: AsyncSession = Depends(get_db),
):
    return await CertificationService.create_certification(
        db, body, user_id=token.sub, ip_address=request.client.host
    )


@router.get("/{cert_id}", response_model=CertificationOut, summary="Tekil sertifika")
async def get_certification(
    cert_id: UUID,
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
    db: AsyncSession = Depends(get_db),
):
    return await CertificationService.get_certification(db, cert_id)


@router.put("/{cert_id}", response_model=CertificationOut, summary="Sertifika güncelle")
async def update_certification(
    cert_id: UUID,
    body: CertificationUpdate,
    request: Request,
    token: TokenPayload = Depends(require_permission(Permission.DPP_UPDATE)),
    db: AsyncSession = Depends(get_db),
):
    return await CertificationService.update_certification(
        db, cert_id, body, user_id=token.sub, ip_address=request.client.host
    )


@router.delete("/{cert_id}", summary="Sertifika sil (soft)")
async def delete_certification(
    cert_id: UUID,
    request: Request,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await CertificationService.delete_certification(
        db, cert_id, user_id=token.sub, ip_address=request.client.host
    )


# ────────────────────────────────────────────────────────
# G-09: Propagasyon endpoint'i
# ────────────────────────────────────────────────────────
from fastapi import BackgroundTasks
from app.modules.certifications.propagation import propagate_certification


@router.post("/{cert_id}/propagate", summary="Sertifika propagasyonunu manuel tetikle")
async def trigger_propagation(
    cert_id: UUID,
    background_tasks: BackgroundTasks,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    background_tasks.add_task(propagate_certification, cert_id, db, token.sub)
    return {"detail": "Propagasyon arka planda başlatıldı", "cert_id": str(cert_id)}