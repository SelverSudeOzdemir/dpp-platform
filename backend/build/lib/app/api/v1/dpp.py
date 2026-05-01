"""
DPP API endpoints
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models.dpp import DigitalProductPassport
from app.schemas.dpp import DppResponse, DppFullResponse

router = APIRouter()


@router.get("/", response_model=List[DppResponse])
async def list_dpps(
    db: AsyncSession = Depends(deps.get_db), skip: int = 0, limit: int = 100
):
    result = await db.execute(
        select(DigitalProductPassport).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/{dpp_id}", response_model=DppFullResponse)
async def get_dpp(dpp_id: UUID, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(
        select(DigitalProductPassport)
        .filter(DigitalProductPassport.id == dpp_id)
    )
    dpp = result.scalars().first()
    if not dpp:
        raise HTTPException(status_code=404, detail="DPP not found")
    return dpp