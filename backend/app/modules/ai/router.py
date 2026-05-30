"""
AI Analysis Router — /ai/ prefix

Endpoint'ler:
  POST /ai/analyze        → DPP analizi (rule engine + opsiyonel LLM raporu)
  GET  /ai/ollama-status  → Ollama sunucu durumu
  GET  /ai/analyze/{id}   → Mevcut DPP'yi analiz et (DB'den çekip)
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_permission, Permission, TokenPayload
from app.modules.ai.rule_engine import analyze_dpp
from app.modules.ai.llm_service import check_ollama_status, generate_ai_report
from app.modules.ai.schemas import (
    DppAnalyzeRequest,
    DppAnalyzeResponse,
    OllamaStatusResponse,
)
from app.modules.dpp.services import DppService
from app.models.ai_analysis import DppAiAnalysis
from sqlalchemy import select

router = APIRouter(prefix="/ai", tags=["AI Analysis"])


@router.get(
    "/ollama-status",
    response_model=OllamaStatusResponse,
    summary="Ollama LLM sunucu durumunu kontrol et",
)
async def get_ollama_status(
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
):
    """Ollama sunucusunun çalışıp çalışmadığını ve mevcut modelleri döndürür."""
    result = await check_ollama_status()
    return result


@router.post(
    "/analyze",
    response_model=DppAnalyzeResponse,
    summary="DPP analizi — kural motoru + AI raporu",
)
async def analyze_dpp_endpoint(
    body: DppAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
):
    """
    DPP analizi yapar.

    İki mod:
    1. `dpp_id` verilirse → DB'den DPP çekilir, analiz edilir
    2. `dpp_data` verilirse → Doğrudan JSON analiz edilir

    `include_ai_report=true` ise Ollama LLM'den profesyonel rapor üretir.
    """
    dpp_dict = None
    dpp_name = ""
    dpp_id_str = None

    if body.dpp_id:
        # DB'den çek
        try:
            dpp_uuid = UUID(body.dpp_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Geçersiz DPP ID formatı",
            )

        dpp = await DppService.get_by_id(db, dpp_uuid)
        if not dpp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="DPP bulunamadı",
            )

        # DppDetailResponse → dict dönüştür
        dpp_dict = dpp.model_dump()
        dpp_name = dpp_dict.get("name", "")
        dpp_id_str = body.dpp_id

    elif body.dpp_data:
        dpp_dict = body.dpp_data
        dpp_name = dpp_dict.get("name", dpp_dict.get("product_name", ""))
        dpp_id_str = dpp_dict.get("id")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="dpp_id veya dpp_data alanlarından biri gerekli",
        )

    # ── Step 1: Rule Engine analizi ──────────────────────────────────────
    analysis_result = analyze_dpp(dpp_dict)

    # ── Step 2: Opsiyonel LLM raporu ─────────────────────────────────────
    ai_report = None
    if body.include_ai_report:
        ai_report = await generate_ai_report(
            analysis_result,
            dpp_name=str(dpp_name or ""),
            model=body.model,
        )

    return DppAnalyzeResponse(
        dpp_id=dpp_id_str,
        dpp_name=dpp_name,
        analysis=analysis_result,
        ai_report=ai_report,
    )


@router.get(
    "/analyze/{dpp_id}",
    response_model=DppAnalyzeResponse,
    summary="Mevcut DPP'yi ID ile analiz et",
)
async def analyze_dpp_by_id(
    dpp_id: UUID,
    include_ai_report: bool = True,
    model: str = "llama3.2",
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
):
    """Mevcut bir DPP'yi ID ile DB'den çekip analiz eder."""
    dpp = await DppService.get_by_id(db, dpp_id)
    if not dpp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DPP bulunamadı",
        )

    dpp_dict = dpp.model_dump()
    dpp_name = dpp_dict.get("name", "")

    # Rule Engine
    analysis_result = analyze_dpp(dpp_dict)

    # LLM Raporu
    ai_report = None
    if include_ai_report:
        ai_report = await generate_ai_report(
            analysis_result,
            dpp_name=dpp_name,
            model=model,
        )
        
        # Save to DB if successful
        if ai_report.get("success"):
            new_analysis = DppAiAnalysis(
                dpp_id=dpp_id,
                model_name=ai_report.get("model", model),
                score=analysis_result.get("score", 0),
                risk_level=analysis_result.get("risk_level", "BİLİNMİYOR"),
                ai_report_text=ai_report.get("report", "")
            )
            db.add(new_analysis)
            await db.commit()

    return DppAnalyzeResponse(
        dpp_id=str(dpp_id),
        dpp_name=dpp_name,
        analysis=analysis_result,
        ai_report=ai_report,
    )

@router.get(
    "/analyze/{dpp_id}/history",
    summary="Mevcut DPP'nin AI analiz geçmişini getir",
)
async def get_dpp_ai_history(
    dpp_id: UUID,
    db: AsyncSession = Depends(get_db),
    token: TokenPayload = Depends(require_permission(Permission.DPP_READ)),
):
    stmt = select(DppAiAnalysis).where(DppAiAnalysis.dpp_id == dpp_id).order_by(DppAiAnalysis.created_at.desc())
    result = await db.execute(stmt)
    analyses = result.scalars().all()
    
    return [
        {
            "id": str(a.id),
            "dpp_id": str(a.dpp_id),
            "model_name": a.model_name,
            "score": a.score,
            "risk_level": a.risk_level,
            "ai_report_text": a.ai_report_text,
            "created_at": a.created_at.isoformat(),
        }
        for a in analyses
    ]
