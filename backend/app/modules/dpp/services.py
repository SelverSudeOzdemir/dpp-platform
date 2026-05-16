"""
DPP servis katmanı — tüm DB sorguları burada.
"""
import uuid
from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.dpp import DigitalProductPassport, DppStatusEnum
from app.models.product import ProductType
from app.models.manufacturer import Manufacturer, ProductionFacility
from app.models.supply_chain import SupplyChainStage
from app.modules.dpp.schemas import (
    DppCreateRequest, DppUpdateRequest,
    DppListItem, DppDetailResponse, SummaryStatsResponse,
    ManufacturerInfo, FacilityInfo, CertificationInfo,
    SupplyChainStageInfo, LifecycleEventInfo,
)


def _status_str(status: DppStatusEnum) -> str:
    return status.value.upper()


def _map_list_item(dpp: DigitalProductPassport) -> DppListItem:
    pt: Optional[ProductType] = dpp.product_type
    mfr: Optional[Manufacturer] = pt.manufacturer if pt else None
    fac: Optional[ProductionFacility] = dpp.production_facility

    mfr_info = ManufacturerInfo(
        name=mfr.name if mfr else None,
        tax_id=mfr.vat_number if mfr else None,
        contact_email=mfr.contact_email if mfr else None,
        website=mfr.website if mfr else None,
        country=mfr.country_code if mfr else None,
        address=mfr.headquarters_address if mfr else None,
    ) if mfr else None

    fac_info = FacilityInfo(
        name=fac.facility_name if fac else None,
        country=fac.country_code if fac else None,
        address=fac.location_text if fac else None,
    ) if fac else None

    certs = [
        CertificationInfo(
            cert_type=c.cert_type, issuer=c.issuer, cert_number=c.cert_number,
            issue_date=str(c.issue_date) if c.issue_date else None,
            expiry_date=str(c.expiry_date) if c.expiry_date else None,
            document_url=c.document_url,
        )
        for c in (dpp.certifications or [])
    ]

    stages = []
    for s in sorted(dpp.supply_chain_stages or [], key=lambda x: x.sequence_number):
        org = s.organization
        mat = s.materials[0] if s.materials else None
        prc = s.processes[0] if s.processes else None
        stages.append(SupplyChainStageInfo(
            sequence_number=s.sequence_number, stage_name=s.stage_name,
            organization_name=org.name if org else None,
            organization_role=org.role if org else None,
            location=org.location_text if org else None,
            country_code=org.country_code if org else None,
            material_name=mat.material_name if mat else None,
            quantity=float(mat.quantity) if mat and mat.quantity else None,
            unit=mat.unit if mat else None,
            process_name=prc.process_name if prc else None,
            stage_date=str(s.stage_date) if s.stage_date else None,
            traceability_id=str(s.traceability_id) if s.traceability_id else None,
        ))

    events = [
        LifecycleEventInfo(
            event_type=e.event_type, event_date=str(e.event_date),
            description=e.description, location=e.location_text,
        )
        for e in (dpp.lifecycle_events or [])
    ]

    return DppListItem(
        id=str(dpp.id),
        name=pt.product_name if pt else "Bilinmeyen Ürün",
        category=pt.product_category.value if pt and pt.product_category else "",
        gtin=dpp.gtin,
        batch_number=dpp._batch_number,
        material_standard=pt.material_standard if pt else None,
        steel_grade=pt.steel_grade.value if pt and pt.steel_grade else None,
        weight_per_meter=float(pt.weight_per_meter_kg) if pt and pt.weight_per_meter_kg else None,
        production_date=str(dpp.production_date) if dpp.production_date else None,
        version=dpp.current_version,
        status=_status_str(dpp.dpp_status),
        carbon_footprint=float(pt.co2_cradle_to_gate_kg) if pt and pt.co2_cradle_to_gate_kg else None,
        recycled_content=float(pt.recycled_content_pct) if pt and pt.recycled_content_pct else None,
        recyclability=float(pt.recyclability_pct) if pt and pt.recyclability_pct else None,
        svhc_free=(not pt.hazardous_materials) if pt and pt.hazardous_materials is not None else None,
        dismantling_difficulty=pt.dismantling_difficulty if pt else None,
        issued_at=dpp.created_at.isoformat() if dpp.created_at else None,
        valid_until=str(pt.epd_valid_until) if pt and pt.epd_valid_until else None,
        manufacturer=mfr_info, facility=fac_info,
        certifications=certs, supply_chain=stages, lifecycle_events=events,
    )


def _map_detail(dpp: DigitalProductPassport) -> DppDetailResponse:
    base = _map_list_item(dpp)
    return DppDetailResponse(
        **base.model_dump(),
        public_identifier=str(dpp.public_identifier),
        gs1_serial_number=dpp.gs1_serial_number,
        dpp_version=dpp.dpp_version,
        dpp_standard=dpp.dpp_standard,
        data_carrier_type=dpp.data_carrier_type.value if dpp.data_carrier_type else None,
        production_line=dpp.production_line,
        shift=dpp.shift,
        is_active=dpp.is_active,
        updated_at=dpp.updated_at.isoformat() if dpp.updated_at else None,
    )


def _base_q():
    return (
        select(DigitalProductPassport)
        .options(
            joinedload(DigitalProductPassport.product_type).joinedload(ProductType.manufacturer),
            joinedload(DigitalProductPassport.product_type).joinedload(ProductType.chemical_composition),
            joinedload(DigitalProductPassport.product_type).joinedload(ProductType.mechanical_properties),
            joinedload(DigitalProductPassport.production_facility),
            selectinload(DigitalProductPassport.certifications),
            selectinload(DigitalProductPassport.supply_chain_stages).joinedload(SupplyChainStage.organization),
            selectinload(DigitalProductPassport.supply_chain_stages).selectinload(SupplyChainStage.materials),
            selectinload(DigitalProductPassport.supply_chain_stages).selectinload(SupplyChainStage.processes),
            selectinload(DigitalProductPassport.lifecycle_events),
        )
    )


class DppService:

    @staticmethod
    async def list_dpps(db: AsyncSession, skip: int = 0, limit: int = 100,
                        status_filter: Optional[str] = None) -> List[DppListItem]:
        stmt = _base_q().order_by(DigitalProductPassport.created_at.desc())
        if status_filter:
            try:
                stmt = stmt.where(
                    DigitalProductPassport.dpp_status == DppStatusEnum(status_filter.lower())
                )
            except ValueError:
                pass
        result = await db.execute(stmt.offset(skip).limit(limit))
        return [_map_list_item(d) for d in result.unique().scalars().all()]

    @staticmethod
    async def get_by_id(db: AsyncSession, dpp_id: UUID) -> Optional[DppDetailResponse]:
        result = await db.execute(_base_q().where(DigitalProductPassport.id == dpp_id))
        dpp = result.unique().scalars().first()
        return _map_detail(dpp) if dpp else None

    @staticmethod
    async def create(db: AsyncSession, body: DppCreateRequest) -> DppDetailResponse:
        dpp = DigitalProductPassport(
            product_type_id=body.product_type_id,
            public_identifier=uuid.uuid4(),
            gs1_serial_number=body.gs1_serial_number,
            gtin=body.gtin,
            production_date=body.production_date,
            production_facility_id=body.production_facility_id,
            production_line=body.production_line,
            shift=body.shift,
            dpp_version=body.dpp_version,
            dpp_standard=body.dpp_standard,
            dpp_status=DppStatusEnum.DRAFT,
            is_active=True,
        )
        db.add(dpp)
        await db.commit()
        await db.refresh(dpp)
        return await DppService.get_by_id(db, dpp.id)

    @staticmethod
    async def update(db: AsyncSession, dpp_id: UUID,
                     body: DppUpdateRequest) -> Optional[DppDetailResponse]:
        result = await db.execute(
            select(DigitalProductPassport).where(DigitalProductPassport.id == dpp_id)
        )
        dpp = result.scalars().first()
        if not dpp:
            return None
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(dpp, field, value)
        await db.commit()
        return await DppService.get_by_id(db, dpp_id)

    @staticmethod
    async def delete(db: AsyncSession, dpp_id: UUID) -> bool:
        result = await db.execute(
            select(DigitalProductPassport).where(DigitalProductPassport.id == dpp_id)
        )
        dpp = result.scalars().first()
        if not dpp:
            return False
        dpp.is_active = False
        dpp.dpp_status = DppStatusEnum.ARCHIVED
        await db.commit()
        return True

    @staticmethod
    async def summary_stats(db: AsyncSession) -> SummaryStatsResponse:
        stmt = select(
            DigitalProductPassport.dpp_status,
            func.count(DigitalProductPassport.id),
        ).group_by(DigitalProductPassport.dpp_status)
        rows = (await db.execute(stmt)).all()
        counts = {
            str(r[0].value if hasattr(r[0], "value") else r[0]): r[1]
            for r in rows
        }
        return SummaryStatsResponse(
            total=sum(counts.values()),
            published=counts.get(DppStatusEnum.PUBLISHED.value, 0),
            draft=counts.get(DppStatusEnum.DRAFT.value, 0),
            pending_approval=counts.get(DppStatusEnum.PENDING_APPROVAL.value, 0),
            rejected=counts.get(DppStatusEnum.REJECTED.value, 0),
            archived=counts.get(DppStatusEnum.ARCHIVED.value, 0),
        )