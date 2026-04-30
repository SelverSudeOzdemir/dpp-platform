"""
Certifications CRUD API — Sertifika yönetimi
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models.certification import Certification
from app.schemas.certification import CertificationResponse

router = APIRouter()


@router.get("/", response_model=List[CertificationResponse])
async def list_certifications(
    db: AsyncSession = Depends(deps.get_db), skip: int = 0, limit: int = 100
):
    result = await db.execute(
        select(Certification).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/{cert_id}", response_model=CertificationResponse)
async def get_certification(cert_id: UUID, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(
        select(Certification).filter(Certification.id == cert_id)
    )
    cert = result.scalars().first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    return cert