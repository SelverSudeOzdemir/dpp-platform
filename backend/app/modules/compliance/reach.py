import json
from pathlib import Path
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.middleware.rbac import TokenPayload, require_permission, Permission
from app.models.product import ProductType, ChemicalComposition

router = APIRouter(prefix="/compliance", tags=["Compliance - REACH"])

# ECHA listesini uygulama başlangıcında yükle
_ECHA_PATH = Path(__file__).parent / "echa_svhc_list.json"
_ECHA_LIST: list = json.loads(_ECHA_PATH.read_text()) if _ECHA_PATH.exists() else []


class ReachSubstanceResult(BaseModel):
    substance: str
    cas: str
    threshold_pct: float
    detected_pct: float
    status: str  # COMPLIANT | WARNING | VIOLATION
    scip_required: bool


class ReachReportResponse(BaseModel):
    product_type_id: UUID
    product_name: str
    results: List[ReachSubstanceResult]
    overall_status: str


def _check_reach(chemical: ChemicalComposition) -> List[ReachSubstanceResult]:
    """ChemicalComposition tablosundan ECHA listesiyle karşılaştırma yapar."""
    # Kimyasal element yüzdelerini düz dict'e çevir
    composition = {}
    if chemical:
        if chemical.carbon_pct is not None:
            composition["carbon"] = float(chemical.carbon_pct)
        if chemical.silicon_pct is not None:
            composition["silicon"] = float(chemical.silicon_pct)
        if chemical.manganese_pct is not None:
            composition["manganese"] = float(chemical.manganese_pct)
        # Diğer alanlar da buraya eklenebilir

    results = []
    for item in _ECHA_LIST:
        # Basit isim eşleştirme (ileride CAS numarası lookup ile geliştirilecek)
        substance_lower = item["substance"].lower()
        detected = 0.0
        for key, val in composition.items():
            if key in substance_lower or substance_lower in key:
                detected = val
                break

        threshold = item["threshold_pct"]
        if detected >= threshold:
            status = "VIOLATION"
        elif detected >= threshold * 0.8:
            status = "WARNING"
        else:
            status = "COMPLIANT"

        results.append(
            ReachSubstanceResult(
                substance=item["substance"],
                cas=item["cas"],
                threshold_pct=threshold,
                detected_pct=detected,
                status=status,
                scip_required=(detected >= threshold),
            )
        )

    return results


@router.get(
    "/reach/{product_type_id}",
    response_model=ReachReportResponse,
    summary="Ürün tipi bazında REACH raporu",
)
async def get_reach_report(
    product_type_id: UUID,
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ProductType)
        .options(joinedload(ProductType.chemical_composition))
        .where(ProductType.id == product_type_id)
    )
    result = await db.execute(stmt)
    pt = result.scalars().first()

    if not pt:
        raise HTTPException(status_code=404, detail="Ürün tipi bulunamadı")

    substance_results = _check_reach(pt.chemical_composition)
    has_violation = any(r.status == "VIOLATION" for r in substance_results)
    has_warning = any(r.status == "WARNING" for r in substance_results)
    overall = "VIOLATION" if has_violation else ("WARNING" if has_warning else "COMPLIANT")

    return ReachReportResponse(
        product_type_id=pt.id,
        product_name=pt.product_name,
        results=substance_results,
        overall_status=overall,
    )


@router.post(
    "/reach/scan",
    response_model=ReachReportResponse,
    summary="Manuel REACH taraması tetikle",
)
async def scan_reach(
    product_type_id: UUID,
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
    db: AsyncSession = Depends(get_db),
):
    # scan endpoint aynı mantığı kullanır
    return await get_reach_report(product_type_id, token=token, db=db)