"""
DPP Router — 6 endpoint + changelog
ÖNEMLİ: /summary-stats ve /admin/changelog, /{dpp_id}'den ÖNCE tanımlanmalı.
Aksi hâlde FastAPI string'i UUID olarak parse eder.
"""
from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib

from app.core.deps import get_db, require_permission, Permission, TokenPayload
from app.middleware.rbac import require_admin
from app.models.integration import DppChangelog
from app.modules.audit.services import AuditActions, AuditService
from app.modules.dpp.schemas import (
    DppCreateRequest, DppUpdateRequest,
    DppDetailResponse, DppListItem, SummaryStatsResponse,
    SupplyStageCreateRequest,
)
from app.modules.dpp.services import DppService

router = APIRouter(prefix="/dpps", tags=["DPP"])


_STATUS_ACTION_MAP = {
    "published": AuditActions.DPP_APPROVED,
    "draft": AuditActions.DPP_DRAFT,
    "archived": AuditActions.DPP_ARCHIVED,
    "recalled": AuditActions.DPP_RECALLED,
    "pending_approval": AuditActions.DPP_SUBMITTED,
    "rejected": AuditActions.DPP_REJECTED,
}


def _safe_uuid(sub: str) -> UUID | None:
    try:
        return UUID(sub) if sub else None
    except (ValueError, AttributeError):
        return None


# ── Sabit path'ler önce gelmeli (/summary-stats, /admin/changelog) ──

@router.get("/summary-stats", response_model=SummaryStatsResponse,
            summary="Dashboard istatistik kartları")
async def get_summary_stats(
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
):
    return await DppService.summary_stats(db)


@router.get("/admin/changelog", summary="Global changelog listesi")
async def get_global_changelog(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(select(func.count(DppChangelog.id)))).scalar_one()
    result = await db.execute(
        select(DppChangelog)
        .options(joinedload(DppChangelog.user))
        .order_by(desc(DppChangelog.created_at))
        .offset(skip).limit(limit)
    )
    items = result.unique().scalars().all()

    data = []
    for i in items:
        version = None
        if i.new_state and isinstance(i.new_state, dict):
            version = i.new_state.get("current_version")
        if not version and i.previous_state and isinstance(i.previous_state, dict):
            version = i.previous_state.get("current_version")
        if not version:
            version = "1.0.0"

        data.append({
            "id": str(i.id),
            "dpp_id": str(i.dpp_id),
            "change_type": i.change_type,
            "previous_state": i.previous_state,
            "new_state": i.new_state,
            "created_at": i.created_at,
            "changed_by_name": i.user.full_name if i.user else "System",
            "changed_by_email": i.user.email if i.user else "system@kocaer.com",
            "version": version,
            "tx_hash": f"0x{hashlib.sha256(str(i.id).encode()).hexdigest()}",
        })

    return {
        "data": data,
        "total": total,
    }


# ── Liste ve CRUD ──

@router.get("/", response_model=List[DppListItem], summary="DPP listesi")
async def list_dpps(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
):
    return await DppService.list_dpps(db, skip=skip, limit=limit, status_filter=status)


@router.post("/", response_model=DppDetailResponse,
             status_code=status.HTTP_201_CREATED, summary="DPP oluştur")
async def create_dpp(
    body: DppCreateRequest,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_CREATE)),
):
    try:
        user_uuid = UUID(token.sub) if token.sub else None
    except ValueError:
        user_uuid = None
    result = await DppService.create(db, body, current_user_id=user_uuid)

    await AuditService.log(
        AuditActions.DPP_CREATED,
        db=db,
        user_id=_safe_uuid(token.sub),
        resource_type="dpp",
        resource_id=str(result.id) if hasattr(result, "id") else None,
        details={"gs1_serial_number": body.gs1_serial_number, "product_type_id": str(body.product_type_id)},
    )
    return result


# ── UUID parametreli path'ler en sona ──

@router.get("/{dpp_id}/changelog", summary="DPP versiyon geçmişi")
async def get_dpp_changelog(
    dpp_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(
        select(func.count(DppChangelog.id)).where(DppChangelog.dpp_id == dpp_id)
    )).scalar_one()
    result = await db.execute(
        select(DppChangelog)
        .options(joinedload(DppChangelog.user))
        .where(DppChangelog.dpp_id == dpp_id)
        .order_by(desc(DppChangelog.created_at))
        .offset(skip).limit(limit)
    )
    items = result.scalars().all()
    
    data = []
    for i in items:
        version = None
        if i.new_state and isinstance(i.new_state, dict):
            version = i.new_state.get("current_version")
        if not version and i.previous_state and isinstance(i.previous_state, dict):
            version = i.previous_state.get("current_version")
        if not version:
            version = "1.0.0"
            
        data.append({
            "id": str(i.id),
            "dpp_id": str(i.dpp_id),
            "change_type": i.change_type,
            "previous_state": i.previous_state,
            "new_state": i.new_state,
            "created_at": i.created_at,
            "changed_by_name": i.user.full_name if i.user else "System",
            "changed_by_email": i.user.email if i.user else "system@kocaer.com",
            "version": version,
            "tx_hash": f"0x{hashlib.sha256(str(i.id).encode()).hexdigest()}",
        })
        
    return {
        "data": data,
        "total": total,
    }


@router.post("/{dpp_id}/supply-chain/stages", summary="Tedarik zinciri adımlarını güncelle")
async def save_dpp_supply_chain_stages(
    dpp_id: UUID,
    body: List[SupplyStageCreateRequest],
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_UPDATE)),
):
    success = await DppService.save_supply_chain_stages(db, dpp_id, body)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DPP bulunamadı")

    await AuditService.log(
        AuditActions.DPP_SUPPLY_CHAIN_UPDATED,
        db=db,
        user_id=_safe_uuid(token.sub),
        resource_type="dpp",
        resource_id=str(dpp_id),
        details={"stages_count": len(body)},
    )
    return {"status": "success", "message": "Stages updated successfully"}


@router.get("/{dpp_id}", response_model=DppDetailResponse, summary="DPP detay")
async def get_dpp(
    dpp_id: UUID,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
):
    result = await DppService.get_by_id(db, dpp_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DPP bulunamadı")
    return result


@router.put("/{dpp_id}", response_model=DppDetailResponse, summary="DPP güncelle")
async def update_dpp(
    dpp_id: UUID,
    body: DppUpdateRequest,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_UPDATE)),
):
    try:
        user_uuid = UUID(token.sub) if token.sub else None
    except ValueError:
        user_uuid = None
    result = await DppService.update(db, dpp_id, body, current_user_id=user_uuid)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DPP bulunamadı")

    action = _STATUS_ACTION_MAP.get(body.dpp_status, AuditActions.DPP_UPDATED) if body.dpp_status else AuditActions.DPP_UPDATED
    await AuditService.log(
        action,
        db=db,
        user_id=_safe_uuid(token.sub),
        resource_type="dpp",
        resource_id=str(dpp_id),
        details=body.dict(exclude_unset=True),
    )
    return result


@router.delete("/{dpp_id}", status_code=status.HTTP_204_NO_CONTENT, summary="DPP sil")
async def delete_dpp(
    dpp_id: UUID,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_DELETE)),
):
    if not await DppService.delete(db, dpp_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DPP bulunamadı")

    await AuditService.log(
        AuditActions.DPP_DELETED,
        db=db,
        user_id=_safe_uuid(token.sub),
        resource_type="dpp",
        resource_id=str(dpp_id),
    )