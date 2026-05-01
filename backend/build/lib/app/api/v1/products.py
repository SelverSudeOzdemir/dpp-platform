from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models.product import ProductType
from app.schemas.product import ProductTypeResponse, ProductTypeCreate

router = APIRouter()


@router.get("/", response_model=List[ProductTypeResponse])
async def list_products(
    db: AsyncSession = Depends(deps.get_db), skip: int = 0, limit: int = 100
):
    result = await db.execute(select(ProductType).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/", response_model=ProductTypeResponse)
async def create_product(
    product_in: ProductTypeCreate, db: AsyncSession = Depends(deps.get_db)
):
    product = ProductType(**product_in.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductTypeResponse)
async def get_product(product_id: UUID, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(
        select(ProductType).filter(ProductType.id == product_id)
    )
    product = result.scalars().first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product