"""
G-09: Sertifika Propagasyon Background Task
Firma geneli sertifika güncellendiğinde tüm aktif DPP'lere yayar.
"""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certification import Certification, CertScopeEnum
from app.models.dpp import DigitalProductPassport, DppStatusEnum
from app.services.audit_service import AuditService


async def propagate_certification(
    cert_id: UUID,
    db: AsyncSession,
    triggered_by_user_id: UUID,
) -> int:
    """
    cert_scope='product_type' olan bir sertifika güncellendiğinde,
    ilgili manufacturer altındaki tüm PUBLISHED DPP'lere yayar.
    Kaç DPP güncellendi sayısını döndürür.
    """
    # Sertifikayı getir
    result = await db.execute(
        select(Certification)
        .options(joinedload(Certification.product_type))
        .where(Certification.id == cert_id)
    )
    cert = result.scalars().first()

    if not cert or cert.cert_scope != CertScopeEnum.PRODUCT_TYPE:
        return 0

    product_type_id = cert.product_type_id

    # Bu product_type'a ait tüm PUBLISHED DPP'leri bul
    stmt = (
        select(DigitalProductPassport)
        .where(
            DigitalProductPassport.product_type_id == product_type_id,
            DigitalProductPassport.dpp_status == DppStatusEnum.PUBLISHED,
            DigitalProductPassport.is_active == True,  # noqa: E712
        )
    )
    dpp_result = await db.execute(stmt)
    dpps = dpp_result.scalars().all()

    updated_count = 0
    for dpp in dpps:
        # DPP'ye bağlı aynı cert_type'taki sertifikaları bul ve expiry_date güncelle
        cert_stmt = (
            select(Certification)
            .where(
                Certification.dpp_id == dpp.id,
                Certification.cert_type == cert.cert_type,
                Certification.cert_scope == CertScopeEnum.DPP_INSTANCE,
            )
        )
        linked_result = await db.execute(cert_stmt)
        linked_certs = linked_result.scalars().all()

        for linked_cert in linked_certs:
            linked_cert.expiry_date = cert.expiry_date
            linked_cert.status = cert.status
            updated_count += 1

        await AuditService.log(
            "Sertifika propagasyonu uygulandı",
            db=None,  # batch commit yapacağız
            user_id=triggered_by_user_id,
            resource_type="dpp",
            resource_id=str(dpp.id),
            details={"cert_id": str(cert_id), "cert_type": cert.cert_type},
        )

    await db.commit()
    return updated_count