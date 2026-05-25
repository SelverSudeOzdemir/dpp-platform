from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, require_permission, Permission
from app.modules.export.services import ExportService
from typing import Optional
from uuid import UUID

router = APIRouter(prefix="/export", tags=["Export"])

@router.get("/json")
async def export_json(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    product_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    # token = Depends(require_permission(Permission.ADMIN_PANEL))
):
    dpps = await ExportService.get_dpp_data_for_export(db, date_from, date_to, product_id)
    content = ExportService.to_json(dpps)
    return Response(content=content, media_type="application/json", headers={
        "Content-Disposition": "attachment; filename=dpp_export.json"
    })

@router.get("/cbam-xml")
async def export_cbam_xml(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    product_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    dpps = await ExportService.get_dpp_data_for_export(db, date_from, date_to, product_id)
    content = ExportService.to_cbam_xml(dpps)
    return Response(content=content, media_type="application/xml", headers={
        "Content-Disposition": "attachment; filename=cbam_report.xml"
    })

@router.get("/excel")
async def export_excel(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    product_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    dpps = await ExportService.get_dpp_data_for_export(db, date_from, date_to, product_id)
    content = ExportService.to_excel(dpps)
    return Response(content=content, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={
        "Content-Disposition": "attachment; filename=dpp_report.xlsx"
    })
