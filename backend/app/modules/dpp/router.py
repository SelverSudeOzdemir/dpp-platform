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
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_permission, Permission, TokenPayload
from app.middleware.rbac import require_admin
from app.models.integration import DppChangelog
from app.modules.dpp.schemas import (
    DppCreateRequest, DppUpdateRequest,
    DppDetailResponse, DppListItem, SummaryStatsResponse,
)
from app.modules.dpp.services import DppService

router = APIRouter(prefix="/dpps", tags=["DPP"])


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
        .order_by(desc(DppChangelog.created_at))
        .offset(skip).limit(limit)
    )
    items = result.scalars().all()
    return {
        "data": [
            {
                "id": str(i.id),
                "dpp_id": str(i.dpp_id),
                "change_type": i.change_type,
                "previous_state": i.previous_state,
                "new_state": i.new_state,
                "created_at": i.created_at,
            }
            for i in items
        ],
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
    return await DppService.create(db, body)


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
        .where(DppChangelog.dpp_id == dpp_id)
        .order_by(desc(DppChangelog.created_at))
        .offset(skip).limit(limit)
    )
    items = result.scalars().all()
    return {
        "data": [
            {
                "id": str(i.id),
                "dpp_id": str(i.dpp_id),
                "change_type": i.change_type,
                "previous_state": i.previous_state,
                "new_state": i.new_state,
                "created_at": i.created_at,
            }
            for i in items
        ],
        "total": total,
    }


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
    result = await DppService.update(db, dpp_id, body)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DPP bulunamadı")
    return result


@router.delete("/{dpp_id}", status_code=status.HTTP_204_NO_CONTENT, summary="DPP sil")
async def delete_dpp(
    dpp_id: UUID,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_DELETE)),
):
    if not await DppService.delete(db, dpp_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DPP bulunamadı")