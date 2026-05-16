from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.core.deps import get_db, require_admin, require_permission
from app.modules.supply_chain import schemas, services
from app.modules.audit.services import AuditService, AuditActions

router = APIRouter(prefix="/supply-chain", tags=["Supply Chain"])

@router.get("/organizations", response_model=List[schemas.SupplyChainOrganization])
async def list_organizations(db: AsyncSession = Depends(get_db)):
    return await services.SupplyChainService.get_organizations(db)

@router.post("/organizations", response_model=schemas.SupplyChainOrganization)
async def create_organization(
    org: schemas.SupplyChainOrganizationCreate,
    db: AsyncSession = Depends(get_db),
    # current_user = Depends(require_admin) # Admin only
):
    return await services.SupplyChainService.create_organization(db, org)

@router.get("/dpp/{dpp_id}", response_model=List[schemas.SupplyChainStage])
async def get_dpp_stages(dpp_id: UUID, db: AsyncSession = Depends(get_db)):
    return await services.SupplyChainService.get_stages_by_dpp(db, dpp_id)

@router.post("/stage", response_model=schemas.SupplyChainStage)
async def add_stage(
    stage: schemas.SupplyChainStageCreate,
    db: AsyncSession = Depends(get_db)
):
    return await services.SupplyChainService.create_stage(db, stage)

@router.put("/stage/{id}", response_model=schemas.SupplyChainStage)
async def update_stage(
    id: UUID,
    stage: schemas.SupplyChainStageUpdate,
    db: AsyncSession = Depends(get_db)
):
    updated = await services.SupplyChainService.update_stage(db, id, stage)
    if not updated:
        raise HTTPException(status_code=404, detail="Stage not found")
    return updated

@router.delete("/stage/{id}")
async def delete_stage(id: UUID, db: AsyncSession = Depends(get_db)):
    success = await services.SupplyChainService.delete_stage(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Stage not found")
    return {"message": "Stage deleted successfully"}

@router.get("/logistics/{dpp_id}", response_model=schemas.LogisticsEmissionResponse)
async def get_logistics_emissions(dpp_id: UUID, db: AsyncSession = Depends(get_db)):
    return await services.SupplyChainService.calculate_logistics_emissions(db, dpp_id)
