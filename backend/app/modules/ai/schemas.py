"""
AI Modülü Pydantic Şemaları — Request / Response
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── REQUEST ───────────────────────────────────────────────────────────────────

class DppAnalyzeRequest(BaseModel):
    """DPP analiz isteği — doğrudan JSON veya dpp_id ile çalışır."""
    dpp_id: Optional[str] = Field(None, description="Mevcut DPP'nin ID'si (DB'den çekip analiz eder)")
    dpp_data: Optional[Dict[str, Any]] = Field(None, description="Doğrudan DPP JSON verisi")
    include_ai_report: bool = Field(True, description="LLM ile AI raporu üretilsin mi?")
    model: str = Field("llama3.2", description="Kullanılacak LLM modeli")


# ── RESPONSE ──────────────────────────────────────────────────────────────────

class FieldInfo(BaseModel):
    field: str
    label: str
    points: int
    regulation: str
    category: Optional[str] = None


class CategoryScore(BaseModel):
    label: str
    score: int
    max: int
    percentage: int
    filled: int
    total: int


class RegulatoryGap(BaseModel):
    field: str
    regulation: str
    severity: str  # critical, high, medium, low


class AnalysisResult(BaseModel):
    score: int = Field(..., description="0-100 arası skor")
    raw_score: int
    max_score: int
    risk_level: str = Field(..., description="DÜŞÜK / ORTA / YÜKSEK / KRİTİK")
    risk_color: str = Field(..., description="green / yellow / orange / red")
    grade: str = Field(..., description="A / B / C / D / F")
    filled_count: int
    total_count: int
    missing_fields: List[FieldInfo] = []
    filled_fields: List[FieldInfo] = []
    category_scores: Dict[str, CategoryScore] = {}
    recommendations: List[str] = []
    regulatory_gaps: List[RegulatoryGap] = []


class AiReportResult(BaseModel):
    success: bool
    report: Optional[str] = None
    model: Optional[str] = None
    generation_time_ms: Optional[float] = None
    error: Optional[str] = None
    fallback_report: Optional[str] = None


class DppAnalyzeResponse(BaseModel):
    """Tam analiz yanıtı."""
    dpp_id: Optional[str] = None
    dpp_name: Optional[str] = None
    analysis: AnalysisResult
    ai_report: Optional[AiReportResult] = None


class OllamaStatusResponse(BaseModel):
    """Ollama durum kontrol yanıtı."""
    status: str
    models: Optional[List[str]] = None
    default_model: Optional[str] = None
    has_default: Optional[bool] = None
    detail: Optional[str] = None
