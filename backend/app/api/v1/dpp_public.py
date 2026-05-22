"""
DPP Public router — Frontend'in fetchDPP(publicId) çağrısını karşılar.
GET /api/v1/dpp/{public_id}
Auth gerekmez — QR ile public erişim.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from app.core.deps import get_db
from app.models.product import ProductType
from app.models.manufacturer import Manufacturer
from app.models.dpp import DigitalProductPassport, DppStatusEnum
from app.models.supply_chain import SupplyChainStage

router = APIRouter(prefix="/dpp", tags=["DPP Public View"])


_STATUS_MAP: Dict[str, str] = {
    "published": "ACTIVE",
    "draft": "DRAFT",
    "pending_approval": "DRAFT",
    "rejected": "DRAFT",
    "archived": "ARCHIVED",
}


def _val(col: Any) -> Any:
    return col


def _to_float(col: Any) -> Optional[float]:
    v = _val(col)
    if v is None:
        return None
    return float(v)


def _to_str(col: Any) -> Optional[str]:
    v = _val(col)
    if v is None:
        return None
    return str(v)


def _enum_val(col: Any) -> Optional[str]:
    v = _val(col)
    if v is None:
        return None
    return v.value if hasattr(v, "value") else str(v)


def _build_facility(dpp: Any, manufacturer: Any) -> Optional[Dict[str, Any]]:
    f = None
    if dpp is not None:
        pf = getattr(dpp, "production_facility", None)
        if pf is not None:
            f = pf
    if f is None and manufacturer is not None:
        facilities = getattr(manufacturer, "facilities", None)
        if facilities:
            f = facilities[0]
    if f is None:
        return None
    return {
        "name": _val(f.facility_name),
        "gln_code": None,
        "country": _val(f.country_code),
        "city": _val(f.location_text),
        "address": _val(f.location_text),
    }


def _build_certs(pt: Any, dpp: Any) -> Optional[List[Dict[str, Any]]]:
    result: List[Dict[str, Any]] = []
    pt_certs = (getattr(pt, "certifications", None) or []) if pt else []
    dpp_certs = (getattr(dpp, "certifications", None) or []) if dpp else []
    for c in list(pt_certs) + list(dpp_certs):
        result.append({
            "cert_type": _val(c.cert_type),
            "issuer": _val(c.issuer),
            "cert_number": _val(c.cert_number),
            "issue_date": _to_str(c.issue_date),
            "expiry_date": _to_str(c.expiry_date),
            "document_url": _val(c.document_url),
        })
    return result if result else None


def _build_supply_chain(dpp: Any) -> Optional[List[Dict[str, Any]]]:
    if dpp is None:
        return None
    stages = getattr(dpp, "supply_chain_stages", None)
    if not stages:
        return None
    result: List[Dict[str, Any]] = []
    for stage in sorted(stages, key=lambda s: s.sequence_number):
        org = getattr(stage, "organization", None)
        mats = getattr(stage, "materials", None) or []
        procs = getattr(stage, "processes", None) or []
        mat = mats[0] if mats else None
        proc = procs[0] if procs else None
        result.append({
            "sequence_number": _val(stage.sequence_number),
            "stage_name": _val(stage.stage_name),
            "organization_name": _val(org.name) if org else None,
            "organization_role": _val(org.role) if org else None,
            "location": _val(org.location_text) if org else None,
            "country_code": _val(org.country_code) if org else None,
            "material_name": _val(mat.material_name) if mat else None,
            "quantity": _to_float(mat.quantity) if mat else None,
            "unit": _val(mat.unit) if mat else None,
            "process_name": _val(proc.process_name) if proc else None,
            "stage_date": _to_str(stage.stage_date),
            "traceability_id": _to_str(stage.traceability_id),
        })
    return result if result else None


def _build_lifecycle(dpp: Any) -> Optional[List[Dict[str, Any]]]:
    if dpp is None:
        return None
    events = getattr(dpp, "lifecycle_events", None)
    if not events:
        return None
    return [
        {
            "event_type": _val(ev.event_type),
            "event_date": _to_str(ev.event_date),
            "description": _val(ev.description),
            "performed_by": None,
            "location": _val(ev.location_text),
        }
        for ev in events
    ] or None


def _full_dpp_response(dpp: Any) -> Dict[str, Any]:
    pt = getattr(dpp, "product_type", None)
    manufacturer = getattr(pt, "manufacturer", None) if pt else None

    # Dimensions
    dims: Optional[str] = None
    if pt is not None:
        h = _val(pt.dim_height_mm)
        w = _val(pt.dim_width_mm)
        if h is not None and w is not None:
            dims = f"{h}x{w}"
            web = _val(pt.dim_web_thickness_mm)
            if web is not None:
                dims += f"x{web}"

    # Status
    raw_status = _val(dpp.dpp_status)
    status_key = raw_status.value if hasattr(raw_status, "value") else str(raw_status)
    dpp_status = _STATUS_MAP.get(status_key, "DRAFT")

    # Manufacturer dict
    mfr_dict: Optional[Dict[str, Any]] = None
    if manufacturer is not None:
        mfr_dict = {
            "name": _val(manufacturer.name),
            "tax_id": _val(manufacturer.vat_number),
            "contact_email": _val(manufacturer.contact_email),
            "website": _val(manufacturer.website),
            "country": _val(manufacturer.country_code),
            "city": None,
            "address": _val(manufacturer.headquarters_address),
        }

    return {
        "id": _val(dpp.gs1_serial_number),
        "name": _val(pt.product_name) if pt else "Bilinmeyen Ürün",
        "category": _enum_val(pt.product_category) if pt else None,
        "gtin": (_val(pt.gtin) or _val(dpp.gtin)) if pt else _val(dpp.gtin),
        "batch_number": getattr(dpp, "_batch_number", None),
        "material_standard": _val(pt.material_standard) if pt else None,
        "steel_grade": _enum_val(pt.steel_grade) if pt else None,
        "weight_per_meter": _to_float(pt.weight_per_meter_kg) if pt else None,
        "dimensions": dims,
        "production_date": _to_str(dpp.production_date),
        "version": _val(dpp.current_version),
        "status": dpp_status,
        "carbon_footprint": _to_float(pt.co2_cradle_to_gate_kg) if pt else None,
        "recycled_content": _to_float(pt.recycled_content_pct) if pt else None,
        "recyclability": _to_float(pt.recyclability_pct) if pt else None,
        "svhc_free": not _val(pt.hazardous_materials) if pt and _val(pt.hazardous_materials) is not None else True,
        "disposal_instructions": _val(pt.dismantling_difficulty) if pt else None,
        "dismantling_difficulty": _val(pt.dismantling_difficulty) if pt else None,
        "issued_at": _to_str(dpp.created_at),
        "valid_until": None,
        "manufacturer": mfr_dict,
        "facility": _build_facility(dpp, manufacturer),
        "supply_chain": _build_supply_chain(dpp),
        "certifications": _build_certs(pt, dpp),
        "lifecycle_events": _build_lifecycle(dpp),
    }


def _build_dpp_query() -> Any:
    return (
        select(DigitalProductPassport)
        .options(
            joinedload(DigitalProductPassport.product_type).joinedload(ProductType.manufacturer).joinedload(Manufacturer.facilities),
            joinedload(DigitalProductPassport.product_type).joinedload(ProductType.certifications),
            joinedload(DigitalProductPassport.product_type).joinedload(ProductType.chemical_composition),
            joinedload(DigitalProductPassport.product_type).joinedload(ProductType.mechanical_properties),
            joinedload(DigitalProductPassport.production_facility),
            joinedload(DigitalProductPassport.certifications),
            joinedload(DigitalProductPassport.supply_chain_stages).joinedload(SupplyChainStage.organization),
            joinedload(DigitalProductPassport.supply_chain_stages).joinedload(SupplyChainStage.materials),
            joinedload(DigitalProductPassport.supply_chain_stages).joinedload(SupplyChainStage.processes),
            joinedload(DigitalProductPassport.lifecycle_events),
        )
    )


@router.get("/{public_id}")
async def get_dpp(
    public_id: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    # 1) gs1_serial_number ile dene
    stmt = _build_dpp_query().where(DigitalProductPassport.gs1_serial_number == public_id)
    result = await db.execute(stmt)
    dpp = result.scalars().unique().first()

    # 2) UUID olarak public_identifier ile dene
    if not dpp:
        try:
            uid = UUID(public_id)
            stmt = _build_dpp_query().where(DigitalProductPassport.public_identifier == uid)
            result = await db.execute(stmt)
            dpp = result.scalars().unique().first()
        except (ValueError, AttributeError):
            pass

    # 3) UUID olarak id ile dene
    if not dpp:
        try:
            uid = UUID(public_id)
            stmt = _build_dpp_query().where(DigitalProductPassport.id == uid)
            result = await db.execute(stmt)
            dpp = result.scalars().unique().first()
        except (ValueError, AttributeError):
            pass

    if not dpp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DPP bulunamadı",
        )

    return _full_dpp_response(dpp)