from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certification import Certification, CertificationStatusEnum, CertScopeEnum
from app.modules.certifications.schemas import CertificationCreate, CertificationUpdate
from app.services.audit_service import AuditService


class CertificationService:

    @staticmethod
    async def list_certifications(
        db: AsyncSession,
        cert_scope: Optional[str] = None,
        cert_status: Optional[str] = None,
        dpp_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ):
        stmt = select(Certification)
        if cert_scope:
            stmt = stmt.where(Certification.cert_scope == cert_scope)
        if cert_status:
            stmt = stmt.where(Certification.status == cert_status)
        if dpp_id:
            stmt = stmt.where(Certification.dpp_id == dpp_id)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar_one()

        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all(), total

    @staticmethod
    async def get_certification(db: AsyncSession, cert_id: UUID) -> Certification:
        result = await db.execute(
            select(Certification).where(Certification.id == cert_id)
        )
        cert = result.scalars().first()
        if not cert:
            raise HTTPException(status_code=404, detail="Sertifika bulunamadı")
        return cert

    @staticmethod
    async def create_certification(
        db: AsyncSession,
        body: CertificationCreate,
        user_id: UUID,
        ip_address: Optional[str] = None,
    ) -> Certification:
        # Scope tutarlılık kontrolü
        if body.cert_scope == CertScopeEnum.PRODUCT_TYPE and not body.product_type_id:
            raise HTTPException(
                status_code=400,
                detail="cert_scope='product_type' ise product_type_id zorunludur",
            )
        if body.cert_scope == CertScopeEnum.DPP_INSTANCE and not body.dpp_id:
            raise HTTPException(
                status_code=400,
                detail="cert_scope='dpp_instance' ise dpp_id zorunludur",
            )

        cert = Certification(**body.model_dump())
        db.add(cert)
        await db.flush()

        await AuditService.log(
            "Sertifika oluşturuldu",
            db=db,
            user_id=user_id,
            resource_type="certification",
            resource_id=str(cert.id),
            ip_address=ip_address,
        )
        await db.commit()
        await db.refresh(cert)
        return cert

    @staticmethod
    async def update_certification(
        db: AsyncSession,
        cert_id: UUID,
        body: CertificationUpdate,
        user_id: UUID,
        ip_address: Optional[str] = None,
    ) -> Certification:
        cert = await CertificationService.get_certification(db, cert_id)

        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(cert, field, value)

        await AuditService.log(
            "Sertifika güncellendi",
            db=db,
            user_id=user_id,
            resource_type="certification",
            resource_id=str(cert_id),
            ip_address=ip_address,
        )
        await db.commit()
        await db.refresh(cert)
        return cert

    @staticmethod
    async def delete_certification(
        db: AsyncSession,
        cert_id: UUID,
        user_id: UUID,
        ip_address: Optional[str] = None,
    ) -> dict:
        cert = await CertificationService.get_certification(db, cert_id)
        # Soft delete: status'u REVOKED yap
        cert.status = CertificationStatusEnum.REVOKED

        await AuditService.log(
            "Sertifika silindi (soft)",
            db=db,
            user_id=user_id,
            resource_type="certification",
            resource_id=str(cert_id),
            ip_address=ip_address,
        )
        await db.commit()
        return {"detail": "Sertifika silindi"}

    @staticmethod
    async def get_expiring_certifications(
        db: AsyncSession, days: int = 30
    ):
        today = date.today()
        threshold = today + timedelta(days=days)

        stmt = select(Certification).where(
            Certification.expiry_date != None,  # noqa: E711
            Certification.expiry_date <= threshold,
            Certification.expiry_date >= today,
            Certification.status == CertificationStatusEnum.VALID,
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def expire_outdated_certifications(db: AsyncSession) -> int:
        """Süresi geçmiş sertifikaları EXPIRED yap (background task için)."""
        today = date.today()
        stmt = select(Certification).where(
            Certification.expiry_date != None,  # noqa: E711
            Certification.expiry_date < today,
            Certification.status == CertificationStatusEnum.VALID,
        )
        result = await db.execute(stmt)
        certs = result.scalars().all()
        for cert in certs:
            cert.status = CertificationStatusEnum.EXPIRED
        await db.commit()
        return len(certs)