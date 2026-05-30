from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.supply_chain import SupplyChainOrganization, SupplyChainStage
from app.modules.supply_chain import schemas
from uuid import UUID
from decimal import Decimal
from typing import List, Optional

class SupplyChainService:
    @staticmethod
    async def get_organizations(db: AsyncSession):
        from app.models.ai_analysis import SupplierAiAnalysis
        
        stmt = select(SupplyChainOrganization)
        result = await db.execute(stmt)
        orgs = result.scalars().all()
        
        org_list = []
        for org in orgs:
            ai_stmt = select(SupplierAiAnalysis).where(
                SupplierAiAnalysis.organization_id == org.id
            ).order_by(SupplierAiAnalysis.created_at.desc()).limit(1)
            
            ai_res = await db.execute(ai_stmt)
            latest_ai = ai_res.scalars().first()
            
            org_dict = {
                "id": str(org.id),
                "name": org.name,
                "role": org.role,
                "location_text": org.location_text,
                "country_code": org.country_code,
                "tax_id": org.tax_id,
                "city": org.city,
                "address": org.address,
                "website": org.website,
                "is_verified": org.is_verified,
                "latest_trust_score": float(latest_ai.trust_score) if latest_ai else None,
                "latest_risk_level": latest_ai.risk_level if latest_ai else None,
            }
            org_list.append(org_dict)
                
        return org_list

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
                "distance": float(str(distance)) if distance is not None else 0.0,
                "emission": float(str(emission)) if emission is not None else 0.0,
                "transport_method": stage.transport_method
            })

        return {
            "dpp_id": dpp_id,
            "total_distance_km": total_distance,
            "total_co2_kg": total_co2,
            "stages": stage_summaries
        }

    @staticmethod
    async def add_supplier_evaluation(db: AsyncSession, org_id: UUID, evaluator_id: Optional[UUID], eval_data: schemas.SupplierEvaluationCreate):
        from app.models.supply_chain import SupplierEvaluation
        db_eval = SupplierEvaluation(
            organization_id=org_id,
            evaluator_id=evaluator_id,
            **eval_data.model_dump()
        )
        db.add(db_eval)
        await db.commit()
        await db.refresh(db_eval)
        return db_eval

    @staticmethod
    async def get_supplier_score(db: AsyncSession, org_id: UUID):
        from app.models.supply_chain import SupplierEvaluation, SupplyChainOrganization
        from app.modules.ai.supplier_eval import analyze_supplier_evaluations
        
        # Get organization name
        org_stmt = select(SupplyChainOrganization).where(SupplyChainOrganization.id == org_id)
        org_result = await db.execute(org_stmt)
        org = org_result.scalars().first()
        if not org:
            return None
            
        # Get evaluations
        stmt = select(SupplierEvaluation).where(SupplierEvaluation.organization_id == org_id)
        result = await db.execute(stmt)
        evaluations_db = result.scalars().all()
        
        # Convert to dicts for the rule engine
        evals_list = []
        for e in evaluations_db:
            evals_list.append({
                "delivery_score": e.delivery_score,
                "quality_score": e.quality_score,
                "communication_score": e.communication_score,
                "estimated_delivery_days": e.estimated_delivery_days,
                "actual_delivery_days": e.actual_delivery_days,
                "damage_rate_pct": e.damage_rate_pct
            })
            
        # Analyze
        analysis = analyze_supplier_evaluations(evals_list)
        
        return {
            "organization_id": org_id,
            "organization_name": str(org.name) if org.name else "",
            **analysis
        }
