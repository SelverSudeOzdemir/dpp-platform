"""
DPP servis katmanı — tüm DB sorguları burada.
"""
import uuid
from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from datetime import datetime, date

from app.models.dpp import DigitalProductPassport, DppStatusEnum
from app.models.product import ProductType
from app.models.manufacturer import Manufacturer, ProductionFacility
from app.models.supply_chain import SupplyChainStage, SupplyChainOrganization, SupplyChainMaterial, SupplyChainProcess
from app.models.integration import DppChangelog
from app.modules.dpp.schemas import (
    DppCreateRequest, DppUpdateRequest,
    DppListItem, DppDetailResponse, SummaryStatsResponse,
    ManufacturerInfo, FacilityInfo, CertificationInfo,
    SupplyChainStageInfo, LifecycleEventInfo, SupplyStageCreateRequest,
)


def _map_list_item(dpp: DigitalProductPassport) -> DppListItem:
    pt: Optional[ProductType] = dpp.product_type
    mfr: Optional[Manufacturer] = pt.manufacturer if pt else None
    fac: Optional[ProductionFacility] = dpp.production_facility

    mfr_info = ManufacturerInfo(
        name=str(mfr.name) if mfr and mfr.name else None,
        tax_id=str(mfr.vat_number) if mfr and mfr.vat_number else None,
        contact_email=str(mfr.contact_email) if mfr and mfr.contact_email else None,
        website=str(mfr.website) if mfr and mfr.website else None,
        country=str(mfr.country_code) if mfr and mfr.country_code else None,
        city=str(mfr.city) if mfr and mfr.city else None,
        address=str(mfr.headquarters_address) if mfr and mfr.headquarters_address else None,
    ) if mfr else None

    fac_info = FacilityInfo(
        name=str(fac.facility_name) if fac and fac.facility_name else None,
        gln_code=str(fac.gln) if hasattr(fac, 'gln') and fac.gln else None,
        country=str(fac.country_code) if fac and fac.country_code else None,
        address=str(fac.location_text) if fac and fac.location_text else None,
    ) if fac else None

    certs = [
        CertificationInfo(
            cert_type=c.cert_type, issuer=c.issuer, cert_number=c.cert_number,
            issue_date=str(c.issue_date) if c.issue_date else None,
            expiry_date=str(c.expiry_date) if c.expiry_date else None,
            document_url=c.document_url,
            test_standard=c.test_standard,
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
            origin_country=mat.origin_country if mat else None,
            transport_method=s.transport_method,
            distance_km=float(s.distance_km) if s.distance_km is not None else None,
            co2_kg_per_km=float(s.co2_kg_per_km) if s.co2_kg_per_km is not None else None,
        ))

    events = [
        LifecycleEventInfo(
            event_type=e.event_type, event_date=str(e.event_date),
            description=e.description, location=e.location_text,
        )
        for e in (dpp.lifecycle_events or [])
    ]

    chem = pt.chemical_composition if pt else None
    mech = pt.mechanical_properties if pt else None

    return DppListItem(
        id=str(dpp.id),
        name=str(pt.product_name) if pt and pt.product_name else "Bilinmeyen Ürün",
        category=str(pt.product_category.value) if pt and pt.product_category else "",
        gtin=str(dpp.gtin) if dpp and dpp.gtin else None,
        batch_number=str(dpp._batch_number) if dpp and dpp._batch_number else None,
        material_standard=str(pt.material_standard) if pt and pt.material_standard else None,
        steel_grade=pt.steel_grade.value if pt and pt.steel_grade else None,
        weight_per_meter=float(pt.weight_per_meter_kg) if pt and pt.weight_per_meter_kg else None,
        production_date=str(dpp.production_date) if dpp.production_date else None,
        version=str(dpp.current_version) if dpp and dpp.current_version else None,
        carbon_footprint=float(pt.co2_cradle_to_gate_kg) if pt and pt.co2_cradle_to_gate_kg else None,
        recycled_content=float(pt.recycled_content_pct) if pt and pt.recycled_content_pct else None,
        water_consumption_l_kg=float(pt.water_consumption_l_kg) if pt and pt.water_consumption_l_kg is not None else None,
        svhc_free=(not pt.hazardous_materials) if pt and pt.hazardous_materials is not None else None,
        dismantling_difficulty=str(pt.dismantling_difficulty) if pt and pt.dismantling_difficulty else None,
        issued_at=dpp.created_at.isoformat() if dpp.created_at else None,
        valid_until=str(pt.epd_valid_until) if pt and pt.epd_valid_until else None,
        c_pct=float(chem.carbon_pct) if chem and chem.carbon_pct is not None else None,
        mn_pct=float(chem.manganese_pct) if chem and chem.manganese_pct is not None else None,
        si_pct=float(chem.silicon_pct) if chem and chem.silicon_pct is not None else None,
        p_pct=float(chem.phosphorus_pct) if chem and chem.phosphorus_pct is not None else None,
        s_pct=float(chem.sulfur_pct) if chem and chem.sulfur_pct is not None else None,
        n_pct=float(chem.nitrogen_pct) if chem and chem.nitrogen_pct is not None else None,
        yield_mpa=float(mech.yield_strength_mpa) if mech and mech.yield_strength_mpa is not None else None,
        tensile_mpa=float(mech.tensile_strength_mpa) if mech and mech.tensile_strength_mpa is not None else None,
        elongation_pct=float(mech.elongation_pct) if mech and mech.elongation_pct is not None else None,
        en_mm=float(pt.dim_height_mm) if pt and pt.dim_height_mm is not None else (float(pt.dim_width_mm) if pt and pt.dim_width_mm is not None else None),
        kalinlik_mm=float(pt.dim_flange_thickness_mm) if pt and pt.dim_flange_thickness_mm is not None and pt.dim_flange_thickness_mm != 0 else (float(pt.dim_web_thickness_mm) if pt and pt.dim_web_thickness_mm is not None and pt.dim_web_thickness_mm != 0 else None),
        boy_mm=float(pt.boy_mm) if pt and pt.boy_mm is not None else None,
        hs_code=str(pt.hs_code) if pt and pt.hs_code else None,
        production_route=str(dpp.production_route) if dpp and dpp.production_route else None,
        ocak_no=str(dpp.ocak_no) if dpp and dpp.ocak_no else None,
        miktar_ton=float(dpp.miktar_ton) if dpp and dpp.miktar_ton is not None else None,
        dpp_status=dpp.dpp_status.value if hasattr(dpp.dpp_status, 'value') else str(dpp.dpp_status),
        rejection_reason=str(dpp.rejection_reason) if dpp and dpp.rejection_reason else None,
        rejection_fields=list(dpp.rejection_fields) if dpp and dpp.rejection_fields else None,
        rejected_by=str(dpp.rejected_by) if dpp and dpp.rejected_by else None,
        rejected_at=dpp.rejected_at.isoformat() if dpp.rejected_at else None,
        manufacturer=mfr_info, facility=fac_info,
        certifications=certs, supply_chain=stages, lifecycle_events=events,
    )


def _map_detail(dpp: DigitalProductPassport) -> DppDetailResponse:
    base = _map_list_item(dpp)
    return DppDetailResponse(
        **base.model_dump(),
        product_type_id=str(dpp.product_type_id) if dpp.product_type_id else None,
        public_identifier=str(dpp.public_identifier),
        gs1_serial_number=str(dpp.gs1_serial_number) if dpp and dpp.gs1_serial_number else "",
        dpp_version=str(dpp.dpp_version) if dpp and dpp.dpp_version else "1.0.0",
        dpp_standard=str(dpp.dpp_standard) if dpp and dpp.dpp_standard else "CIRPASS-Compatible",
        data_carrier_type=str(dpp.data_carrier_type.value) if dpp and dpp.data_carrier_type else None,
        production_line=str(dpp.production_line) if dpp and dpp.production_line else None,
        shift=str(dpp.shift) if dpp and dpp.shift else None,
        is_active=bool(dpp.is_active) if dpp and dpp.is_active is not None else True,
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


def _bump_version(version_str: str, minor: bool = False) -> str:
    if not version_str or not isinstance(version_str, str):
        version_str = "1.0.0"
    parts = version_str.split('.')
    if len(parts) < 3:
        parts = (parts + ["0", "0", "0"])[:3]
    try:
        major, min_v, patch = int(parts[0]), int(parts[1]), int(parts[2])
    except ValueError:
        major, min_v, patch = 1, 0, 0
    if minor:
        min_v += 1
        patch = 0
    else:
        patch += 1
    return f"{major}.{min_v}.{patch}"


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
    async def create(db: AsyncSession, body: DppCreateRequest, current_user_id: Optional[UUID] = None) -> DppDetailResponse:
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
            current_version=body.dpp_version or "1.0.0",
            is_active=True,
            production_route=body.production_route,
            ocak_no=body.ocak_no,
            miktar_ton=body.miktar_ton,
        )
        db.add(dpp)
        await db.flush()

        changelog = DppChangelog(
            dpp_id=dpp.id,
            changed_by_user_id=current_user_id,
            change_type="CREATE",
            previous_state=None,
            new_state={
                "status": "DRAFT",
                "current_version": dpp.current_version,
                "creation_source": body.creation_source or "Manuel",
            }
        )
        db.add(changelog)
        await db.commit()
        res = await DppService.get_by_id(db, dpp.id)
        if res is None:
            raise Exception("Failed to retrieve created DPP")
        return res

    @staticmethod
    async def update(db: AsyncSession, dpp_id: UUID,
                     body: DppUpdateRequest, current_user_id: Optional[UUID] = None) -> Optional[DppDetailResponse]:
        result = await db.execute(
            select(DigitalProductPassport).where(DigitalProductPassport.id == dpp_id)
        )
        dpp = result.scalars().first()
        if not dpp:
            return None

        old_status = dpp.dpp_status
        old_version = dpp.current_version or "1.0.0"

        status_changed = False
        other_changed = False
        changed_fields: dict[str, dict] = {}

        update_data = body.model_dump(exclude_none=True)
        for field, value in update_data.items():
            old_val = getattr(dpp, field, None)
            old_val_str = old_val.value if hasattr(old_val, 'value') else old_val
            new_val_str = value.value if hasattr(value, 'value') else value
            if field == "dpp_status":
                if str(new_val_str) != str(old_val_str):
                    status_changed = True
                    changed_fields[field] = {"old": old_val_str, "new": new_val_str}
            else:
                if str(old_val_str) != str(new_val_str):
                    other_changed = True
                    changed_fields[field] = {
                        "old": str(old_val_str) if old_val_str is not None else None,
                        "new": str(new_val_str) if new_val_str is not None else None,
                    }
            setattr(dpp, field, value)

        if status_changed:
            new_version = _bump_version(str(old_version), minor=True)
            dpp.current_version = new_version
        elif other_changed:
            new_version = _bump_version(str(old_version), minor=False)
            dpp.current_version = new_version
        else:
            new_version = old_version

        change_type = "UPDATE"
        if status_changed:
            new_status_val = str(dpp.dpp_status.value if hasattr(dpp.dpp_status, 'value') else dpp.dpp_status)
            status_label_map = {
                "published": "APPROVE",
                "rejected": "REJECT",
                "archived": "ARCHIVE",
                "recalled": "RECALL",
                "draft": "DRAFT",
                "pending_approval": "SUBMIT",
            }
            change_type = status_label_map.get(new_status_val, "STATUS_UPDATE")

        changelog = DppChangelog(
            dpp_id=dpp.id,
            changed_by_user_id=current_user_id,
            change_type=change_type,
            previous_state={
                "status": str(old_status.value if hasattr(old_status, 'value') else old_status),
                "current_version": old_version,
                "changed_fields": {k: v["old"] for k, v in changed_fields.items()},
            },
            new_state={
                "status": str(dpp.dpp_status.value if hasattr(dpp.dpp_status, 'value') else dpp.dpp_status),
                "current_version": new_version,
                "changed_fields": {k: v["new"] for k, v in changed_fields.items()},
            }
        )
        db.add(changelog)
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
        setattr(dpp, 'is_active', False)
        setattr(dpp, 'dpp_status', DppStatusEnum.ARCHIVED)
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

    @staticmethod
    async def save_supply_chain_stages(
        db: AsyncSession,
        dpp_id: UUID,
        stages_list: List[SupplyStageCreateRequest]
    ) -> bool:
        result = await db.execute(
            select(DigitalProductPassport).where(DigitalProductPassport.id == dpp_id)
        )
        dpp = result.scalars().first()
        if not dpp:
            return False

        existing_stages_stmt = select(SupplyChainStage).where(SupplyChainStage.dpp_id == dpp_id)
        existing_stages = (await db.execute(existing_stages_stmt)).scalars().all()
        for stage in existing_stages:
            await db.delete(stage)

        for idx, req in enumerate(stages_list):
            org_stmt = select(SupplyChainOrganization).where(
                SupplyChainOrganization.name == req.organization,
                SupplyChainOrganization.location_text == req.location
            )
            org = (await db.execute(org_stmt)).scalars().first()
            if not org:
                org = SupplyChainOrganization(
                    id=uuid.uuid4(),
                    name=req.organization,
                    role=req.role or "Supplier",
                    location_text=req.location,
                    country_code=req.country_code or "TR",
                )
                db.add(org)
                await db.flush()

            stage_date = None
            if req.date:
                for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%d %H:%M:%S"):
                    try:
                        stage_date = datetime.strptime(req.date.split('T')[0], "%Y-%m-%d").date()
                        break
                    except ValueError:
                        continue

            stage = SupplyChainStage(
                id=uuid.uuid4(),
                dpp_id=dpp_id,
                sequence_number=req.sequence_number if req.sequence_number is not None else (idx + 1),
                stage_name=req.stage_name,
                organization_id=org.id,
                stage_date=stage_date,
                traceability_id=uuid.uuid4(),
                transport_method=req.transport_method,
                distance_km=req.distance_km,
                co2_kg_per_km=req.co2_kg_per_km,
            )
            db.add(stage)
            await db.flush()

            material = SupplyChainMaterial(
                id=uuid.uuid4(),
                stage_id=stage.id,
                material_name=req.material or "Raw Material",
                quantity=req.quantity or 0.0,
                unit=req.unit or "ton",
                origin_country=req.material_origin or req.country_code or "TR",
            )
            db.add(material)

            if req.process:
                process = SupplyChainProcess(
                    id=uuid.uuid4(),
                    stage_id=stage.id,
                    process_name=req.process,
                )
                db.add(process)

        await db.commit()
        return True