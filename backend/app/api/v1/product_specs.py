"""
Product Specs API — Chemical & Mechanical CRUD
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models.product import ChemicalComposition, MechanicalProperties
from app.schemas.product import ChemicalCompositionResponse, MechanicalPropertiesResponse

router = APIRouter()


@router.get("/chemical/{product_type_id}", response_model=ChemicalCompositionResponse)
async def get_chemical_composition(
    product_type_id: UUID, db: AsyncSession = Depends(deps.get_db)
):
    result = await db.execute(
        select(ChemicalComposition).filter(
            ChemicalComposition.product_type_id == product_type_id
        )
    )
    chem = result.scalars().first()
    if not chem:
        raise HTTPException(status_code=404, detail="Chemical composition not found")
    return chem


@router.get("/mechanical/{product_type_id}", response_model=MechanicalPropertiesResponse)
async def get_mechanical_properties(
    product_type_id: UUID, db: AsyncSession = Depends(deps.get_db)
):
    result = await db.execute(
        select(MechanicalProperties).filter(
            MechanicalProperties.product_type_id == product_type_id
        )
    )
    mech = result.scalars().first()
    if not mech:
        raise HTTPException(status_code=404, detail="Mechanical properties not found")
    return mech