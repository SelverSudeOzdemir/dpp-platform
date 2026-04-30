"""
Manufacturers & Facilities API — Üretici ve tesis yönetimi
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models.manufacturer import Manufacturer, ProductionFacility
from app.schemas.manufacturer import ManufacturerResponse, FacilityResponse

router = APIRouter()


@router.get("/", response_model=List[ManufacturerResponse])
async def list_manufacturers(
    db: AsyncSession = Depends(deps.get_db), skip: int = 0, limit: int = 100
):
    result = await db.execute(select(Manufacturer).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{manufacturer_id}", response_model=ManufacturerResponse)
async def get_manufacturer(
    manufacturer_id: UUID, db: AsyncSession = Depends(deps.get_db)
):
    result = await db.execute(
        select(Manufacturer).filter(Manufacturer.id == manufacturer_id)
    )
    m = result.scalars().first()
    if not m:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    return m


@router.get("/facilities/{manufacturer_id}", response_model=List[FacilityResponse])
async def list_facilities(
    manufacturer_id: UUID, db: AsyncSession = Depends(deps.get_db)
):
    result = await db.execute(
        select(ProductionFacility).filter(
            ProductionFacility.manufacturer_id == manufacturer_id
        )
    )
    return result.scalars().all()