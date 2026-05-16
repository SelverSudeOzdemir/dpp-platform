"""
DPP Router — 6 endpoint
ÖNEMLİ: /summary-stats, /{dpp_id}'den ÖNCE tanımlanmalı.
Aksi hâlde FastAPI "summary-stats" string'ini UUID olarak parse eder.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_permission, Permission, TokenPayload
from app.modules.dpp.schemas import (
    DppCreateRequest, DppUpdateRequest,
    DppDetailResponse, DppListItem, SummaryStatsResponse,
)
from app.modules.dpp.services import DppService

router = APIRouter(prefix="/dpps", tags=["DPP"])


@router.get("/summary-stats", response_model=SummaryStatsResponse,
            summary="Dashboard istatistik kartları")
async def get_summary_stats(
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
):
    return await DppService.summary_stats(db)


@router.get("/", response_model=List[DppListItem], summary="DPP listesi")
async def list_dpps(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
):
    return await DppService.list_dpps(db, skip=skip, limit=limit, status_filter=status)


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


@router.post("/", response_model=DppDetailResponse,
             status_code=status.HTTP_201_CREATED, summary="DPP oluştur")
async def create_dpp(
    body: DppCreateRequest,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_CREATE)),
):
    return await DppService.create(db, body)


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