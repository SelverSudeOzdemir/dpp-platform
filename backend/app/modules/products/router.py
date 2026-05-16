from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_permission, Permission, TokenPayload
from app.middleware.rbac import require_admin, require_admin_or_engineer
from app.models.product import ProductType, ChemicalComposition, MechanicalProperties
from app.schemas.product import (
    ProductTypeCreate, ProductTypeResponse,
    ChemicalCompositionBase, MechanicalPropertiesBase,
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/products", tags=["Products"])


# ── G-02: ProductType CRUD ──────────────────────────────────────────

@router.get("/", response_model=list[ProductTypeResponse], summary="Tüm ürün tiplerini listele")
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProductType)
        .options(
            joinedload(ProductType.chemical_composition),
            joinedload(ProductType.mechanical_properties),
        )
        .offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("/", response_model=ProductTypeResponse, status_code=201, summary="Yeni ürün tipi oluştur")
async def create_product(
    body: ProductTypeCreate,
    request: Request,
    token: TokenPayload = Depends(require_admin_or_engineer),
    db: AsyncSession = Depends(get_db),
):
    pt = ProductType(**body.model_dump())
    db.add(pt)
    await db.flush()
    await AuditService.log(
        "Ürün tipi oluşturuldu", db=db, user_id=token.sub,
        resource_type="product_type", resource_id=str(pt.id),
        ip_address=request.client.host,
    )
    await db.commit()
    await db.refresh(pt)
    return pt


@router.get("/{product_id}", response_model=ProductTypeResponse, summary="Tekil ürün tipi")
async def get_product(
    product_id: UUID,
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProductType)
        .options(
            joinedload(ProductType.chemical_composition),
            joinedload(ProductType.mechanical_properties),
        )
        .where(ProductType.id == product_id)
    )
    pt = result.scalars().first()
    if not pt:
        raise HTTPException(status_code=404, detail="Ürün tipi bulunamadı")
    return pt


@router.put("/{product_id}", response_model=ProductTypeResponse, summary="Ürün tipi güncelle")
async def update_product(
    product_id: UUID,
    body: ProductTypeCreate,
    request: Request,
    token: TokenPayload = Depends(require_admin_or_engineer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ProductType).where(ProductType.id == product_id))
    pt = result.scalars().first()
    if not pt:
        raise HTTPException(status_code=404, detail="Ürün tipi bulunamadı")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(pt, field, value)
    await AuditService.log(
        "Ürün tipi güncellendi", db=db, user_id=token.sub,
        resource_type="product_type", resource_id=str(product_id),
        ip_address=request.client.host,
    )
    await db.commit()
    await db.refresh(pt)
    return pt


@router.delete("/{product_id}", summary="Ürün tipi sil (soft delete)")
async def delete_product(
    product_id: UUID,
    token: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ProductType).where(ProductType.id == product_id))
    pt = result.scalars().first()
    if not pt:
        raise HTTPException(status_code=404, detail="Ürün tipi bulunamadı")
    await db.delete(pt)
    await db.commit()
    return {"detail": "Ürün tipi silindi"}


# ── G-03: Kimyasal Kompozisyon & Mekanik Özellikler ────────────────

@router.get("/{product_id}/chemical", response_model=ChemicalCompositionBase, summary="Kimyasal kompozisyon getir")
async def get_chemical(
    product_id: UUID,
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChemicalComposition).where(ChemicalComposition.product_type_id == product_id)
    )
    chem = result.scalars().first()
    if not chem:
        raise HTTPException(status_code=404, detail="Kimyasal veri bulunamadı")
    return chem


@router.put("/{product_id}/chemical", response_model=ChemicalCompositionBase, summary="Kimyasal veri kaydet/güncelle")
async def upsert_chemical(
    product_id: UUID,
    body: ChemicalCompositionBase,
    request: Request,
    token: TokenPayload = Depends(require_admin_or_engineer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChemicalComposition).where(ChemicalComposition.product_type_id == product_id)
    )
    chem = result.scalars().first()
    if chem:
        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(chem, field, value)
    else:
        chem = ChemicalComposition(product_type_id=product_id, **body.model_dump())
        db.add(chem)
    await AuditService.log(
        "Kimyasal kompozisyon güncellendi", db=db, user_id=token.sub,
        resource_type="chemical_composition", resource_id=str(product_id),
        ip_address=request.client.host,
    )
    await db.commit()
    await db.refresh(chem)
    return chem


@router.get("/{product_id}/mechanical", response_model=MechanicalPropertiesBase, summary="Mekanik özellikler getir")
async def get_mechanical(
    product_id: UUID,
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MechanicalProperties).where(MechanicalProperties.product_type_id == product_id)
    )
    mech = result.scalars().first()
    if not mech:
        raise HTTPException(status_code=404, detail="Mekanik veri bulunamadı")
    return mech


@router.put("/{product_id}/mechanical", response_model=MechanicalPropertiesBase, summary="Mekanik veri kaydet/güncelle")
async def upsert_mechanical(
    product_id: UUID,
    body: MechanicalPropertiesBase,
    request: Request,
    token: TokenPayload = Depends(require_admin_or_engineer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MechanicalProperties).where(MechanicalProperties.product_type_id == product_id)
    )
    mech = result.scalars().first()
    if mech:
        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(mech, field, value)
    else:
        mech = MechanicalProperties(product_type_id=product_id, **body.model_dump())
        db.add(mech)
    await AuditService.log(
        "Mekanik özellikler güncellendi", db=db, user_id=token.sub,
        resource_type="mechanical_properties", resource_id=str(product_id),
        ip_address=request.client.host,
    )
    await db.commit()
    await db.refresh(mech)
    return mech