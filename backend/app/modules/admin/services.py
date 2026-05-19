from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from uuid import UUID
from datetime import datetime, date, timedelta
from fastapi import HTTPException
from typing import List

from app.models.dpp import DigitalProductPassport, DppStatusEnum
from app.models.product import ProductType
from app.models.integration import DppChangelog
from app.models.certification import Certification, CertificationStatusEnum
from app.modules.admin.schemas import AdminKpiSummary, DppApprovalRequest


class AdminService:

    @staticmethod
    async def get_dashboard_stats(db: AsyncSession) -> AdminKpiSummary:
        stmt = select(
            DigitalProductPassport.dpp_status,
            func.count(DigitalProductPassport.id)
        ).group_by(DigitalProductPassport.dpp_status)

        result = await db.execute(stmt)
        counts = {
            str(row[0].value if hasattr(row[0], 'value') else row[0]): row[1]
            for row in result.all()
        }
        total = sum(counts.values())

        today = date.today()
        threshold_date = today + timedelta(days=30)
        cert_stmt = select(func.count(Certification.id)).where(
            Certification.expiry_date != None,
            Certification.expiry_date <= threshold_date,
            Certification.status == CertificationStatusEnum.VALID,
        )
        cert_alerts = (await db.execute(cert_stmt)).scalar_one()

        from app.modules.compliance.cbam import _cbam_thresholds
        cbam_threshold = _cbam_thresholds["threshold"]
        cbam_stmt = (
            select(func.count(DigitalProductPassport.id))
            .join(DigitalProductPassport.product_type)
            .where(
                DigitalProductPassport.dpp_status == DppStatusEnum.PUBLISHED,
                ProductType.co2_cradle_to_gate_kg >= cbam_threshold,
            )
        )
        cbam_alerts = (await db.execute(cbam_stmt)).scalar_one()

        return AdminKpiSummary(
            total_dpps=total,
            pending_approval=counts.get("pending_approval", 0),
            published=counts.get("published", 0),
            rejected=counts.get("rejected", 0),
            draft=counts.get("draft", 0),
            last_updated=datetime.now(),
            cert_alerts=cert_alerts,
            cbam_alerts=cbam_alerts,
        )

    @staticmethod
    async def get_pending_dpps(db: AsyncSession, skip: int = 0, limit: int = 100):
        stmt = (
            select(DigitalProductPassport)
            .options(joinedload(DigitalProductPassport.product_type))
            .where(DigitalProductPassport.dpp_status == DppStatusEnum.PENDING_APPROVAL)
            .order_by(DigitalProductPassport.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def update_dpp_status(
        db: AsyncSession,
        dpp_id: UUID,
        body: DppApprovalRequest,
        current_user_id: UUID
    ):
        stmt = (
            select(DigitalProductPassport)
            .options(joinedload(DigitalProductPassport.product_type))
            .where(DigitalProductPassport.id == dpp_id)
        )
        result = await db.execute(stmt)
        dpp = result.scalars().first()

        if not dpp:
            raise HTTPException(status_code=404, detail="DPP bulunamadi")

        old_status = dpp.dpp_status
        dpp.dpp_status = body.status
        dpp.status_changed_at = datetime.now()

        user_uuid = None
        if current_user_id:
            try:
                from uuid import UUID as uuid_class
                user_uuid = uuid_class(str(current_user_id))
            except ValueError:
                pass

        if body.status == DppStatusEnum.REJECTED:
            dpp.rejection_reason = body.rejection_reason
            dpp.rejection_fields = body.failed_fields
            dpp.rejected_by = str(user_uuid) if user_uuid else str(current_user_id)
            dpp.rejected_at = datetime.now()

        changelog = DppChangelog(
            dpp_id=dpp_id,
            changed_by_user_id=user_uuid,
            change_type="STATUS_UPDATE",
            previous_state={
                "status": str(old_status.value if hasattr(old_status, 'value') else old_status),
                "current_version": dpp.current_version
            },
            new_state={
                "status": str(body.status.value if hasattr(body.status, 'value') else body.status),
                "rejection_reason": body.rejection_reason if body.status == DppStatusEnum.REJECTED else None,
                "failed_fields": body.failed_fields if body.status == DppStatusEnum.REJECTED else None,
                "current_version": dpp.current_version
            }
        )
        db.add(changelog)
        await db.commit()
        return dpp

    @staticmethod
    async def get_urgent_alerts(db: AsyncSession) -> List[dict]:
        alerts = []

        stmt = (
            select(DigitalProductPassport)
            .options(joinedload(DigitalProductPassport.product_type))
            .join(DigitalProductPassport.product_type)
            .where(ProductType.co2_cradle_to_gate_kg > 2.0)
        )
        res = await db.execute(stmt)
        for dpp in res.scalars().all():
            alerts.append({
                "id": f"CO2-{dpp.id}",
                "type": "CBAM",
                "message": f"Kritik CO2 emisyonu: {dpp.product_type.co2_cradle_to_gate_kg} kg",
                "dpp_id": str(dpp.id),
                "severity": "CRITICAL"
            })

        now_date = datetime.now().date()
        stmt = (
            select(DigitalProductPassport)
            .options(joinedload(DigitalProductPassport.product_type))
            .join(DigitalProductPassport.product_type)
            .join(ProductType.certifications)
            .where(Certification.expiry_date < now_date)
        )
        res = await db.execute(stmt)
        for dpp in res.scalars().all():
            alerts.append({
                "id": f"CERT-{dpp.id}",
                "type": "CERTIFICATE",
                "message": "Suresi dolmus sertifika tespit edildi.",
                "dpp_id": str(dpp.id),
                "severity": "WARNING"
            })

        return alerts

    @staticmethod
    async def get_incomplete_report(db: AsyncSession) -> List[dict]:
        stmt = (
            select(DigitalProductPassport)
            .options(
                joinedload(DigitalProductPassport.product_type),
                joinedload(DigitalProductPassport.certifications),
                joinedload(DigitalProductPassport.supply_chain_stages)
            )
            .where(DigitalProductPassport.dpp_status.in_([DppStatusEnum.DRAFT, DppStatusEnum.RECALLED]))
        )

        result = await db.execute(stmt)
        dpps = result.scalars().unique().all()

        report = []
        for dpp in dpps:
            missing = []
            pt = dpp.product_type

            if not dpp.gtin:
                missing.append({"section": "General", "field": "gtin"})
            if pt:
                if not pt.epd_number:
                    missing.append({"section": "Product", "field": "epd_number"})
                if not pt.co2_cradle_to_gate_kg:
                    missing.append({"section": "Environmental", "field": "co2_value"})

            if not dpp.certifications:
                missing.append({"section": "Compliance", "field": "at_least_one_certification"})

            if not dpp.supply_chain_stages:
                missing.append({"section": "Supply Chain", "field": "stages_list"})

            if missing:
                report.append({
                    "dpp_id": str(dpp.id),
                    "product_name": pt.product_name if pt else "Bilinmeyen Ürün",
                    "missing": missing
                })

        return report