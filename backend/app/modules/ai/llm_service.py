"""
Ollama Local LLM Entegrasyonu

Ollama HTTP API üzerinden yerel LLM ile iletişim kurar.
LLM sadece rapor yazar / yorumlar / profesyonel dil üretir.
Kararı kod (rule_engine) verir.

Desteklenen modeller:
  - phi3:mini   (3-4 GB RAM, hızlı)
  - llama3.2:3b (4-6 GB RAM, hızlı)
  - mistral:7b  (8 GB+ RAM, kaliteli)
"""
import httpx
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("ai.llm")

# Ollama varsayılan adresi
OLLAMA_BASE_URL = "http://127.0.0.1:11434"
DEFAULT_MODEL = "llama3.2" #"mistral"
REQUEST_TIMEOUT = 120.0  # saniye


async def check_ollama_status() -> Dict[str, Any]:
    """Ollama sunucusunun durumunu kontrol et."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m["name"] for m in data.get("models", [])]
                return {
                    "status": "online",
                    "models": models,
                    "default_model": DEFAULT_MODEL,
                    "has_default": DEFAULT_MODEL in models,
                }
            return {"status": "error", "detail": f"HTTP {resp.status_code}"}
    except httpx.ConnectError:
        return {
            "status": "offline",
            "detail": "Ollama sunucusu çalışmıyor. 'ollama serve' komutunu çalıştırın.",
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}


async def ask_llm(
    prompt: str,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.3,
    max_tokens: int = 1024,
) -> Dict[str, Any]:
    """
    Ollama API üzerinden LLM'ye soru gönder.

    Args:
        prompt: LLM'ye gönderilecek prompt
        model: Kullanılacak model adı
        temperature: Yaratıcılık (0.0-1.0, düşük = tutarlı)
        max_tokens: Maksimum çıktı token sayısı

    Returns:
        {"success": True, "response": "...", "model": "...", "eval_duration_ms": ...}
        veya
        {"success": False, "error": "..."}
    """
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens,
                    },
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "response": data.get("response", ""),
                    "model": data.get("model", model),
                    "eval_duration_ms": data.get("eval_duration", 0) / 1_000_000,  # ns → ms
                    "total_duration_ms": data.get("total_duration", 0) / 1_000_000,
                }
            else:
                error_detail = resp.text
                logger.error("Ollama API error: %s — %s", resp.status_code, error_detail)
                return {
                    "success": False,
                    "error": f"Ollama HTTP {resp.status_code}: {error_detail}",
                }
    except httpx.ConnectError:
        return {
            "success": False,
            "error": "Ollama sunucusuna bağlanılamıyor. 'ollama serve' komutunu çalıştırın.",
        }
    except httpx.ReadTimeout:
        return {
            "success": False,
            "error": f"Ollama yanıt süresi aşıldı ({REQUEST_TIMEOUT}s). Model yükleniyor olabilir.",
        }
    except Exception as e:
        logger.exception("LLM isteği başarısız")
        return {"success": False, "error": str(e)}


def build_analysis_prompt(analysis_result: Dict[str, Any], dpp_name: str = "") -> str:
    """
    Rule engine sonucundan LLM promptu oluştur.

    Kritik: LLM'ye KARAR VERDİRMİYORUZ.
    Tüm veriler (skor, risk, eksik alanlar) zaten belirli.
    LLM sadece profesyonel rapor yazıyor.
    """
    score = analysis_result["score"]
    risk = analysis_result["risk_level"]
    grade = analysis_result["grade"]
    filled = analysis_result["filled_count"]
    total = analysis_result["total_count"]

    # Eksik alanları formatla
    missing_list = "\n".join(
        f"  - {m['label']} ({m['regulation']})"
        for m in analysis_result.get("missing_fields", [])[:10]  # max 10
    )

    # Önerileri formatla
    recs_list = "\n".join(
        f"  {i+1}. {r}"
        for i, r in enumerate(analysis_result.get("recommendations", [])[:5])
    )

    # Kategori özetleri
    cat_lines = []
    for cat_key, cat_data in analysis_result.get("category_scores", {}).items():
        cat_lines.append(
            f"  - {cat_data['label']}: %{cat_data['percentage']} "
            f"({cat_data['filled']}/{cat_data['total']} alan dolu)"
        )
    categories_str = "\n".join(cat_lines)

    product_label = f" — {dpp_name}" if dpp_name else ""

    prompt = f"""Sen Kocaer Çelik için çalışan profesyonel bir DPP (Dijital Ürün Pasaportu) analiz uzmanısın.

Aşağıdaki DPP analiz sonuçlarına göre kısa ve profesyonel bir değerlendirme raporu yaz.

KARAR VERME. Sadece verilen verilere göre rapor yaz.

═══ DPP ANALİZ SONUÇLARI{product_label} ═══

Skor: {score}/100 (Not: {grade})
Risk Seviyesi: {risk}
Tamamlanma: {filled}/{total} alan dolu

─── KATEGORİ BAZLI DURUM ───
{categories_str}

─── EKSİK ALANLAR ───
{missing_list if missing_list else "  Tüm alanlar dolu."}

─── ÖNERİLER ───
{recs_list if recs_list else "  Öneri yok."}

═══════════════════════════════

Kurallar:
1. Türkçe yaz.
2. 150 kelimeyi geçme.
3. Raporu 3 bölümde yaz: Genel Değerlendirme, Kritik Eksikler, Sonraki Adımlar.
4. Profesyonel ve teknik bir dil kullan.
5. ESPR ve CBAM yönetmeliklerine referans ver.
6. Verilerin dışına çıkma, hallucination yapma.
"""
    return prompt


async def generate_ai_report(
    analysis_result: Dict[str, Any],
    dpp_name: str = "",
    model: str = DEFAULT_MODEL,
) -> Dict[str, Any]:
    """
    Rule engine sonucundan AI raporu üret.

    1. Promptu oluştur
    2. LLM'ye gönder
    3. Sonucu döndür
    """
    prompt = build_analysis_prompt(analysis_result, dpp_name)
    llm_result = await ask_llm(prompt, model=model, temperature=0.3, max_tokens=800)

    if llm_result["success"]:
        return {
            "success": True,
            "report": llm_result["response"],
            "model": llm_result["model"],
            "generation_time_ms": llm_result.get("total_duration_ms", 0),
        }
    else:
        return {
            "success": False,
            "error": llm_result["error"],
            "fallback_report": _generate_fallback_report(analysis_result),
        }


def _generate_fallback_report(analysis_result: Dict[str, Any]) -> str:
    """LLM çalışmazsa basit kural tabanlı rapor üret."""
    score = analysis_result["score"]
    risk = analysis_result["risk_level"]
    grade = analysis_result["grade"]
    missing_count = len(analysis_result.get("missing_fields", []))

    lines = [
        f"📊 DPP Analiz Raporu",
        f"",
        f"Genel Değerlendirme:",
        f"DPP tamamlanma skoru: {score}/100 (Not: {grade}). Risk seviyesi: {risk}.",
    ]

    if missing_count > 0:
        lines.append(f"")
        lines.append(f"Kritik Eksikler:")
        lines.append(f"{missing_count} alan eksik.")
        for m in analysis_result.get("missing_fields", [])[:5]:
            lines.append(f"  • {m['label']} ({m['regulation']})")

    if analysis_result.get("recommendations"):
        lines.append(f"")
        lines.append(f"Sonraki Adımlar:")
        for r in analysis_result["recommendations"][:3]:
            lines.append(f"  {r}")

    return "\n".join(lines)
