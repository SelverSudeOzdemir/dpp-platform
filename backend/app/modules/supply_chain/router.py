from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.core.deps import get_db, require_admin, require_permission
from app.middleware.rbac import get_current_token
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

@router.post("/organizations/{id}/evaluate", summary="Tedarikçi için değerlendirme/anket ekle")
async def evaluate_supplier(
    id: UUID,
    evaluation: schemas.SupplierEvaluationCreate,
    db: AsyncSession = Depends(get_db),
    token = Depends(get_current_token)
):
    if token.role not in ["ADMIN", "ENGINEER"]:
        raise HTTPException(status_code=403, detail="Bu işlem için admin veya engineer yetkisi gereklidir.")
        
    try:
        user_uuid = UUID(token.sub) if token and hasattr(token, 'sub') and token.sub else None
    except ValueError:
        user_uuid = None
        
    result = await services.SupplyChainService.add_supplier_evaluation(db, id, user_uuid, evaluation)
    if not result:
        raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
    return {"status": "success", "message": "Değerlendirme başarıyla eklendi."}

@router.get("/organizations/{id}/score", response_model=schemas.SupplierTrustScoreResponse, summary="Tedarikçinin güven skorunu ve AI yorumunu getir")
async def get_supplier_score(
    id: UUID,
    include_ai: bool = True,
    db: AsyncSession = Depends(get_db),
    token = Depends(get_current_token)
):
    if token.role not in ["ADMIN", "ENGINEER", "AUTHORITY"]:
        raise HTTPException(status_code=403, detail="Tedarikçi puanlarını görüntüleme yetkiniz yok.")

    score_data = await services.SupplyChainService.get_supplier_score(db, id)
    if not score_data:
        raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
        
    ai_report = None
    if include_ai and int(score_data.get("total_evaluations", 0)) > 0:
        from app.modules.ai.supplier_eval import build_supplier_prompt
        from app.modules.ai.llm_service import ask_llm, DEFAULT_MODEL
        from app.models.ai_analysis import SupplierAiAnalysis
        
        prompt = build_supplier_prompt(str(score_data.get("organization_name", "")), score_data)
        llm_result = await ask_llm(prompt, temperature=0.3, max_tokens=500)
        if llm_result["success"]:
            ai_report = llm_result["response"]
            
            # DB'ye kaydet
            new_analysis = SupplierAiAnalysis(
                organization_id=id,
                model_name=DEFAULT_MODEL,
                trust_score=score_data.get("trust_score", 0),
                risk_level=score_data.get("risk_level", "BİLİNMİYOR"),
                ai_report_text=ai_report
            )
            db.add(new_analysis)
            await db.commit()
            
    score_data["ai_report"] = ai_report
    return score_data

@router.get("/organizations/{id}/score/history", summary="Tedarikçinin geçmiş AI analizlerini getir")
async def get_supplier_score_history(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    token = Depends(get_current_token)
):
    if token.role not in ["ADMIN", "ENGINEER", "AUTHORITY"]:
        raise HTTPException(status_code=403, detail="Tedarikçi geçmişini görüntüleme yetkiniz yok.")
        
    from app.models.ai_analysis import SupplierAiAnalysis
    
    stmt = select(SupplierAiAnalysis).where(SupplierAiAnalysis.organization_id == id).order_by(SupplierAiAnalysis.created_at.desc())
    result = await db.execute(stmt)
    analyses = result.scalars().all()
    
    return [
        {
            "id": str(a.id),
            "organization_id": str(a.organization_id),
            "model_name": a.model_name,
            "trust_score": float(a.trust_score),
            "risk_level": a.risk_level,
            "ai_report_text": a.ai_report_text,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in analyses
    ]
