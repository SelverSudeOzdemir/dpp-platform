from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.deps import get_db
from app.middleware.rbac import TokenPayload, require_admin, require_auditor
from app.models.dpp import DigitalProductPassport, DppStatusEnum
from app.models.product import ProductType

router = APIRouter(prefix="/compliance", tags=["Compliance - CBAM"])

# Varsayılan CBAM eşiği (ileride global_settings tablosundan okunacak)
_DEFAULT_THRESHOLD = 2.0
_cbam_thresholds = {"warning_ratio": 0.85, "threshold": _DEFAULT_THRESHOLD}


class CbamDppStatus(BaseModel):
    dpp_id: UUID
    product_name: str
    co2_value: Optional[float]
    threshold: float
    delta: float
    status: str  # SAFE | WARNING | VIOLATION


class CbamStatusResponse(BaseModel):
    data: List[CbamDppStatus]
    threshold: float


class CbamThresholdResponse(BaseModel):
    threshold: float
    warning_ratio: float


class CbamThresholdUpdate(BaseModel):
    threshold: float
    warning_ratio: float = 0.85


@router.get("/cbam-status", response_model=CbamStatusResponse, summary="Tüm DPP'lerin CBAM durumu")
async def get_cbam_status(
    token: TokenPayload = Depends(require_auditor),
    db: AsyncSession = Depends(get_db),
):
    threshold = _cbam_thresholds["threshold"]
    warning_ratio = _cbam_thresholds["warning_ratio"]

    stmt = (
        select(DigitalProductPassport)
        .options(joinedload(DigitalProductPassport.product_type))
        .where(DigitalProductPassport.dpp_status == DppStatusEnum.PUBLISHED)
    )
    result = await db.execute(stmt)
    dpps = result.scalars().all()

    data = []
    for dpp in dpps:
        pt: ProductType = dpp.product_type
        co2 = float(pt.co2_cradle_to_gate_kg) if pt and pt.co2_cradle_to_gate_kg else 0.0
        delta = co2 - threshold

        if co2 >= threshold:
            cbam_status = "VIOLATION"
        elif co2 >= threshold * warning_ratio:
            cbam_status = "WARNING"
        else:
            cbam_status = "SAFE"

        data.append(
            CbamDppStatus(
                dpp_id=dpp.id,
                product_name=pt.product_name if pt else "—",
                co2_value=co2,
                threshold=threshold,
                delta=round(delta, 4),
                status=cbam_status,
            )
        )

    return CbamStatusResponse(data=data, threshold=threshold)


@router.get("/cbam-threshold", response_model=CbamThresholdResponse, summary="Mevcut CBAM eşik değerleri")
async def get_cbam_threshold(
    token: TokenPayload = Depends(require_auditor),
):
    return CbamThresholdResponse(**_cbam_thresholds)


@router.put("/cbam-threshold", response_model=CbamThresholdResponse, summary="CBAM eşik değerlerini güncelle")
async def update_cbam_threshold(
    body: CbamThresholdUpdate,
    token: TokenPayload = Depends(require_admin),
):
    _cbam_thresholds["threshold"] = body.threshold
    _cbam_thresholds["warning_ratio"] = body.warning_ratio
    return CbamThresholdResponse(**_cbam_thresholds)