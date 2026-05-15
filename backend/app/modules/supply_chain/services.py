from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.supply_chain import SupplyChainOrganization, SupplyChainStage
from app.modules.supply_chain import schemas
from uuid import UUID
from decimal import Decimal

class SupplyChainService:
    @staticmethod
    async def get_organizations(db: AsyncSession):
        stmt = select(SupplyChainOrganization)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def create_organization(db: AsyncSession, org_data: schemas.SupplyChainOrganizationCreate):
        db_org = SupplyChainOrganization(**org_data.model_dump())
        db.add(db_org)
        await db.commit()
        await db.refresh(db_org)
        return db_org

    @staticmethod
    async def get_stages_by_dpp(db: AsyncSession, dpp_id: UUID):
        stmt = select(SupplyChainStage).where(SupplyChainStage.dpp_id == dpp_id).order_by(SupplyChainStage.sequence_number)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def create_stage(db: AsyncSession, stage_data: schemas.SupplyChainStageCreate):
        db_stage = SupplyChainStage(**stage_data.model_dump())
        db.add(db_stage)
        await db.commit()
        await db.refresh(db_stage)
        return db_stage

    @staticmethod
    async def update_stage(db: AsyncSession, stage_id: UUID, stage_data: schemas.SupplyChainStageUpdate):
        stmt = select(SupplyChainStage).where(SupplyChainStage.id == stage_id)
        result = await db.execute(stmt)
        db_stage = result.scalars().first()
        if not db_stage:
            return None
        
        for key, value in stage_data.model_dump(exclude_unset=True).items():
            setattr(db_stage, key, value)
        
        await db.commit()
        await db.refresh(db_stage)
        return db_stage

    @staticmethod
    async def delete_stage(db: AsyncSession, stage_id: UUID):
        stmt = select(SupplyChainStage).where(SupplyChainStage.id == stage_id)
        result = await db.execute(stmt)
        db_stage = result.scalars().first()
        if db_stage:
            await db.delete(db_stage)
            await db.commit()
            return True
        return False

    @staticmethod
    async def calculate_logistics_emissions(db: AsyncSession, dpp_id: UUID):
        stmt = select(SupplyChainStage).where(SupplyChainStage.dpp_id == dpp_id)
        result = await db.execute(stmt)
        stages = result.scalars().all()
        
        total_distance = Decimal(0)
        total_co2 = Decimal(0)
        stage_summaries = []

        for stage in stages:
            distance = stage.distance_km or Decimal(0)
            co2_per_km = stage.co2_kg_per_km or Decimal(0)
            
            emission = distance * co2_per_km
            total_distance += distance
            total_co2 += emission
            
            stage_summaries.append({
                "stage_name": stage.stage_name,
                "distance": float(distance),
                "emission": float(emission),
                "transport_method": stage.transport_method
            })

        return {
            "dpp_id": dpp_id,
            "total_distance_km": total_distance,
            "total_co2_kg": total_co2,
            "stages": stage_summaries
        }
