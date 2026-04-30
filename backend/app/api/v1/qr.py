"""
QR Code & Label API

GET  /api/v1/qr/{dpp_id}              — Tek QR PNG indir
GET  /api/v1/qr/{dpp_id}/svg          — Tek QR SVG
GET  /api/v1/qr/{dpp_id}/label        — Etiket HTML
POST /api/v1/qr/batch                 — Toplu QR üret
"""
from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.middleware.rbac import TokenPayload, require_any_auth
from app.middleware.rate_limiter import RateLimits, limiter
from fastapi import Request
from app.services.batch_qr_service import BatchQRRequest, BatchQRService
from app.services.gs1_service import GS1Service
from app.services.label_service import LabelData, LabelService
from app.services.qr_generator import QRGenerator

router = APIRouter(prefix="/qr", tags=["QR Codes & Labels"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class BatchQRItem(BaseModel):
    dpp_id: uuid.UUID
    gtin: str
    serial_number: str


class BatchQRRequest_Schema(BaseModel):
    items: List[BatchQRItem]
    domain: Optional[str] = "dpp.kocaer.com"
    styled: bool = True


class BatchQRResultItem(BaseModel):
    dpp_id: uuid.UUID
    gs1_url: str
    dpp_url: str
    success: bool
    error: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/{dpp_id}",
    summary="QR kod indir (PNG)",
    response_class=Response,
)
@limiter.limit(RateLimits.QR_GENERATE)
async def get_qr_png(
    request: Request,
    dpp_id: uuid.UUID,
    gtin: str = Query(..., description="14 haneli GTIN"),
    serial_number: str = Query(..., description="GS1 seri numarası"),
    domain: str = Query("dpp.kocaer.com"),
    styled: bool = Query(True, description="Yuvarlak köşeli stil"),
    token: TokenPayload = Depends(require_any_auth),
):
    """DPP için QR kod PNG olarak indir."""
    try:
        links = GS1Service.build_from_dpp(
            dpp_id=dpp_id,
            gtin=gtin,
            gs1_serial_number=serial_number,
            domain=domain,
        )
        qr_png = QRGenerator.generate(
            links["gs1_digital_link"],
            styled=styled,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return Response(
        content=qr_png,
        media_type="image/png",
        headers={
            "Content-Disposition": f'attachment; filename="qr_{dpp_id}.png"',
            "X-GS1-Digital-Link": links["gs1_digital_link"],
            "X-DPP-URL": links["dpp_url"],
        },
    )


@router.get(
    "/{dpp_id}/svg",
    summary="QR kod SVG",
    response_class=Response,
)
async def get_qr_svg(
    dpp_id: uuid.UUID,
    gtin: str = Query(...),
    serial_number: str = Query(...),
    domain: str = Query("dpp.kocaer.com"),
    token: TokenPayload = Depends(require_any_auth),
):
    """DPP için QR kod SVG olarak al — web'e gömmek için."""
    links = GS1Service.build_from_dpp(
        dpp_id=dpp_id,
        gtin=gtin,
        gs1_serial_number=serial_number,
        domain=domain,
    )
    svg = QRGenerator.generate_svg(links["gs1_digital_link"])

    return Response(
        content=svg,
        media_type="image/svg+xml",
    )


@router.get(
    "/{dpp_id}/label",
    summary="Ürün etiketi HTML",
    response_class=HTMLResponse,
)
async def get_label_html(
    dpp_id: uuid.UUID,
    product_name: str = Query(...),
    gtin: str = Query(...),
    serial_number: str = Query(...),
    steel_grade: Optional[str] = Query(None),
    dimensions: Optional[str] = Query(None),
    heat_number: Optional[str] = Query(None),
    batch_number: Optional[str] = Query(None),
    domain: str = Query("dpp.kocaer.com"),
    token: TokenPayload = Depends(require_any_auth),
):
    """Print edilebilir ürün etiketi HTML — QR kod gömülü."""
    label_data = LabelData(
        dpp_id=dpp_id,
        product_name=product_name,
        gtin=gtin,
        serial_number=serial_number,
        steel_grade=steel_grade,
        dimensions=dimensions,
        heat_number=heat_number,
        batch_number=batch_number,
    )
    html = LabelService.generate_label_html(label_data, base_domain=domain)
    return HTMLResponse(content=html)


@router.post(
    "/batch",
    response_model=List[BatchQRResultItem],
    summary="Toplu QR üret",
)
@limiter.limit(RateLimits.QR_GENERATE)
async def generate_batch_qr(
    request: Request,
    body: BatchQRRequest_Schema,
    token: TokenPayload = Depends(require_any_auth),
):
    """
    Birden fazla DPP için aynı anda QR kod üret.
    Max 100 adet per istek.
    """
    if len(body.items) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tek seferde maksimum 100 QR üretilebilir",
        )

    batch_requests = [
        BatchQRRequest(
            dpp_id=item.dpp_id,
            gtin=item.gtin,
            serial_number=item.serial_number,
        )
        for item in body.items
    ]

    results = await BatchQRService.generate_batch(
        batch_requests,
        base_domain=body.domain or "dpp.kocaer.com",
        styled=body.styled,
    )

    return [
        BatchQRResultItem(
            dpp_id=r.dpp_id,
            gs1_url=r.gs1_url,
            dpp_url=r.dpp_url,
            success=r.success,
            error=r.error,
        )
        for r in results
    ]