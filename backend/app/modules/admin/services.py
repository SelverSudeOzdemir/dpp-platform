
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import joinedload
from uuid import UUID
from datetime import datetime, date
from fastapi import HTTPException, status
from typing import List

from app.models.dpp import DigitalProductPassport, DppStatusEnum
from app.models.product import ProductType
from app.models.integration import DppChangelog
from app.models.certification import Certification
from app.modules.admin.schemas import AdminDashboardStats, DppApprovalRequest

class AdminService:
    @staticmethod
    async def get_dashboard_stats(db: AsyncSession) -> AdminDashboardStats:
        # Statulere gore sayim yap
        stmt = select(
            DigitalProductPassport.dpp_status,
            func.count(DigitalProductPassport.id)
        ).group_by(DigitalProductPassport.dpp_status)
        
        result = await db.execute(stmt)
        # Result'tan gelen key'leri string'e zorlayarak sozluk yapalim
        counts = {str(row[0].value if hasattr(row[0], 'value') else row[0]): row[1] for row in result.all()}
        
        total = sum(counts.values())
        
        return AdminDashboardStats(
            total_dpps=total,
            pending_approval=counts.get("pending_approval", 0),
            published=counts.get("published", 0),
            rejected=counts.get("rejected", 0),
            draft=counts.get("draft", 0),
            last_updated=datetime.now()
        )

    @staticmethod
    async def get_pending_dpps(db: AsyncSession, skip: int = 0, limit: int = 100):
        # Onay bekleyen DPP'leri ve urun bilgilerini getir
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
        # DPP'yi bul (Urun bilgisini de yukle ki router'da Lazy Load hatasi almayalim)
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
        
        # Statuyu guncelle
        dpp.dpp_status = body.status
        dpp.status_changed_at = datetime.now()
        
        # Changelog kaydi olustur (JSONB icin .value kullaniyoruz)
        changelog = DppChangelog(
            dpp_id=dpp_id,
            changed_by_user_id=current_user_id,
            change_type="STATUS_UPDATE",
            previous_state={"status": str(old_status.value if hasattr(old_status, 'value') else old_status)},
            new_state={
                "status": str(body.status.value if hasattr(body.status, 'value') else body.status),
                "rejection_reason": body.rejection_reason if body.status == DppStatusEnum.REJECTED else None,
                "failed_fields": body.failed_fields if body.status == DppStatusEnum.REJECTED else None
            }
        )
        db.add(changelog)
        
        await db.commit()
        return dpp

    @staticmethod
    async def get_urgent_alerts(db: AsyncSession) -> List[dict]:
        alerts = []
        
        # 1. CO2 Limit Kontrolü
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
            
        # 2. Sertifika Tarihi Kontrolü
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

