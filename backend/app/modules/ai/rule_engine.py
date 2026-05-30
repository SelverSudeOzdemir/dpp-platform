"""
DPP AI Analysis — Rule Engine (Kural Motoru)

LLM karar vermez. Karar burada verilir.
Skor, risk, eksik alanlar ve öneriler kural tabanlı üretilir.

ESPR (Ecodesign for Sustainable Products Regulation) ve
CBAM (Carbon Border Adjustment Mechanism) gereksinimlerine uyumlu.
"""
from typing import Any, Dict, List, Optional


# ── ESPR / CBAM / CIRPASS zorunlu alan tanımları ──────────────────────────────

# Her alan: (alan_adı, puan, kategori, açıklama)
DPP_FIELD_RULES: list[dict] = [
    # ─── Kimlik & Temel Bilgiler (30 puan) ────────────────────────────────
    {"field": "name",               "points": 5,  "category": "identity",    "label": "Ürün Adı",           "regulation": "ESPR Art.9"},
    {"field": "gs1_serial_number",  "points": 5,  "category": "identity",    "label": "GS1 Seri No",        "regulation": "ESPR Art.9"},
    {"field": "gtin",               "points": 3,  "category": "identity",    "label": "GTIN Kodu",          "regulation": "ESPR Art.9"},
    {"field": "batch_number",       "points": 3,  "category": "identity",    "label": "Parti Numarası",     "regulation": "ESPR Art.9"},
    {"field": "category",           "points": 3,  "category": "identity",    "label": "Ürün Kategorisi",    "regulation": "ESPR Art.7(2)"},
    {"field": "steel_grade",        "points": 5,  "category": "identity",    "label": "Çelik Kalitesi",     "regulation": "EN 10025"},
    {"field": "material_standard",  "points": 3,  "category": "identity",    "label": "Malzeme Standardı",  "regulation": "EN 10025"},
    {"field": "hs_code",            "points": 3,  "category": "identity",    "label": "HS/GTİP Kodu",       "regulation": "CBAM Annex I"},

    # ─── Üretici & Tesis (15 puan) ────────────────────────────────────────
    {"field": "manufacturer",       "points": 5,  "category": "manufacturer","label": "Üretici Bilgisi",    "regulation": "ESPR Art.7(2)(a)"},
    {"field": "facility",           "points": 3,  "category": "manufacturer","label": "Üretim Tesisi",      "regulation": "ESPR Art.7(2)(a)"},
    {"field": "production_date",    "points": 4,  "category": "manufacturer","label": "Üretim Tarihi",      "regulation": "ESPR Art.7(2)(e)"},
    {"field": "production_route",   "points": 3,  "category": "manufacturer","label": "Üretim Rotası",      "regulation": "CBAM Art.7"},

    # ─── Çevresel Etki (25 puan) ──────────────────────────────────────────
    {"field": "carbon_footprint",   "points": 10, "category": "environment", "label": "Karbon Ayak İzi (CO₂ A1-A3)", "regulation": "CBAM Art.7, ESPR Art.7(2)(d)"},
    {"field": "recycled_content",   "points": 8,  "category": "environment", "label": "Geri Dönüşüm Oranı",        "regulation": "ESPR Art.7(5)(c)"},
    {"field": "svhc_free",          "points": 7,  "category": "environment", "label": "SVHC / REACH Beyanı",       "regulation": "ESPR Art.7(5)(a), REACH"},

    # ─── Mekanik & Kimyasal (15 puan) ─────────────────────────────────────
    {"field": "yield_mpa",          "points": 3,  "category": "technical",   "label": "Akma Dayanımı (MPa)",       "regulation": "EN 10204 3.1"},
    {"field": "tensile_mpa",        "points": 3,  "category": "technical",   "label": "Çekme Dayanımı (MPa)",      "regulation": "EN 10204 3.1"},
    {"field": "elongation_pct",     "points": 3,  "category": "technical",   "label": "Uzama (%)",                 "regulation": "EN 10204 3.1"},
    {"field": "c_pct",              "points": 3,  "category": "technical",   "label": "Kimyasal Kompozisyon (C%)", "regulation": "EN 10204 3.1"},
    {"field": "weight_per_meter",   "points": 3,  "category": "technical",   "label": "Birim Ağırlık (kg/m)",      "regulation": "EN 10365"},

    # ─── Sertifikalar & Tedarik Zinciri (15 puan) ─────────────────────────
    {"field": "certifications",     "points": 8,  "category": "compliance",  "label": "Sertifikalar",              "regulation": "ESPR Art.7(2)(h)"},
    {"field": "supply_chain",       "points": 7,  "category": "compliance",  "label": "Tedarik Zinciri Bilgisi",   "regulation": "ESPR Art.7(2)(g)"},
]

# Toplam maks puan
MAX_SCORE = sum(r["points"] for r in DPP_FIELD_RULES)

# Kategori isimleri (Türkçe)
CATEGORY_LABELS = {
    "identity":     "Kimlik & Temel Bilgiler",
    "manufacturer": "Üretici & Tesis",
    "environment":  "Çevresel Etki",
    "technical":    "Mekanik & Kimyasal Veriler",
    "compliance":   "Sertifika & Tedarik Zinciri",
}


def _field_filled(dpp: Dict[str, Any], field: str) -> bool:
    """Alan dolu mu kontrol et — nested dict, list ve bool desteği."""
    val = dpp.get(field)
    if val is None:
        return False
    if isinstance(val, bool):
        return True  # bool alanlar (svhc_free vb.) True/False farketmez, beyan edilmiş
    if isinstance(val, (list, dict)):
        return len(val) > 0
    if isinstance(val, str):
        return len(val.strip()) > 0
    if isinstance(val, (int, float)):
        return True
    # Nested object (manufacturer, facility gibi)
    if hasattr(val, "__dict__"):
        return any(v for v in val.__dict__.values() if v is not None)
    return bool(val)


def analyze_dpp(dpp: Dict[str, Any]) -> Dict[str, Any]:
    """
    Kural tabanlı DPP analizi.

    Returns:
        {
            "score": int,            # 0-100
            "max_score": int,        # Maks puan
            "risk_level": str,       # DÜŞÜK / ORTA / YÜKSEK / KRİTİK
            "risk_color": str,       # green / yellow / orange / red
            "grade": str,            # A / B / C / D / F
            "filled_count": int,
            "total_count": int,
            "missing_fields": [...], # Eksik alanlar
            "filled_fields": [...],  # Dolu alanlar
            "category_scores": {...},# Kategori bazlı skor
            "recommendations": [...],# Öneriler
            "regulatory_gaps": [...],# Yasal boşluklar
        }
    """
    score = 0
    missing_fields: List[Dict[str, str]] = []
    filled_fields: List[Dict[str, str]] = []
    category_scores: Dict[str, Dict[str, int]] = {}

    # Kategori yapısını başlat
    for cat_key in CATEGORY_LABELS:
        category_scores[cat_key] = {"earned": 0, "max": 0, "filled": 0, "total": 0}

    for rule in DPP_FIELD_RULES:
        field = rule["field"]
        points = rule["points"]
        cat = rule["category"]
        label = rule["label"]
        regulation = rule["regulation"]

        category_scores[cat]["max"] += points
        category_scores[cat]["total"] += 1

        if _field_filled(dpp, field):
            score += points
            category_scores[cat]["earned"] += points
            category_scores[cat]["filled"] += 1
            filled_fields.append({
                "field": field,
                "label": label,
                "points": points,
                "regulation": regulation,
            })
        else:
            missing_fields.append({
                "field": field,
                "label": label,
                "points": points,
                "regulation": regulation,
                "category": CATEGORY_LABELS.get(cat, cat),
            })

    # Yüzde skoru
    pct = round((score / MAX_SCORE) * 100) if MAX_SCORE > 0 else 0

    # Risk seviyesi
    if pct >= 80:
        risk_level, risk_color, grade = "DÜŞÜK", "green", "A"
    elif pct >= 60:
        risk_level, risk_color, grade = "ORTA", "yellow", "B"
    elif pct >= 40:
        risk_level, risk_color, grade = "YÜKSEK", "orange", "C"
    elif pct >= 20:
        risk_level, risk_color, grade = "YÜKSEK", "orange", "D"
    else:
        risk_level, risk_color, grade = "KRİTİK", "red", "F"

    # ── Akıllı öneriler ──────────────────────────────────────────────────
    recommendations: List[str] = []
    regulatory_gaps: List[Dict[str, str]] = []

    # Çevresel etki kontrolleri
    if not _field_filled(dpp, "carbon_footprint"):
        recommendations.append(
            "⚠️ Karbon ayak izi (CO₂ A1-A3) bilgisi eksik. "
            "CBAM Yönetmeliği (EU 2023/956) kapsamında bu alan zorunludur. "
            "AB'ye ihracatta geçiş sertifikası almanız gerekecektir."
        )
        regulatory_gaps.append({
            "field": "carbon_footprint",
            "regulation": "CBAM Art.7",
            "severity": "critical",
        })

    if not _field_filled(dpp, "recycled_content"):
        recommendations.append(
            "♻️ Geri dönüştürülmüş içerik oranı belirtilmemiş. "
            "ESPR Art.7(5)(c) uyarınca bu bilgi zorunludur."
        )
        regulatory_gaps.append({
            "field": "recycled_content",
            "regulation": "ESPR Art.7(5)(c)",
            "severity": "high",
        })

    if not _field_filled(dpp, "svhc_free"):
        recommendations.append(
            "🧪 SVHC/REACH beyanı eksik. ESPR Art.7(5)(a) ve REACH Tüzüğü "
            "kapsamında endişe verici maddelerin beyanı zorunludur."
        )
        regulatory_gaps.append({
            "field": "svhc_free",
            "regulation": "ESPR Art.7(5)(a), REACH",
            "severity": "high",
        })

    # Tedarik zinciri kontrolleri
    if not _field_filled(dpp, "supply_chain"):
        recommendations.append(
            "🔗 Tedarik zinciri verileri eksik. ESPR Art.7(2)(g) uyarınca "
            "tedarik zinciri izlenebilirliği sağlanmalıdır."
        )

    # Sertifika kontrolleri
    if not _field_filled(dpp, "certifications"):
        recommendations.append(
            "📜 Sertifika bilgisi eksik. EN 10204, ISO 9001 gibi kalite "
            "sertifikalarını eklemeniz uyumluluk puanınızı artıracaktır."
        )

    # Mekanik/Kimyasal kontrolleri
    missing_technical = [
        m for m in missing_fields if m.get("field") in
        ("yield_mpa", "tensile_mpa", "elongation_pct", "c_pct")
    ]
    if missing_technical:
        recommendations.append(
            "🔬 Mekanik ve/veya kimyasal test verileri eksik. "
            "EN 10204 3.1 test sertifikası kapsamında bu veriler zorunludur."
        )

    # CBAM spesifik kontrol
    co2_val = dpp.get("carbon_footprint")
    if co2_val is not None and isinstance(co2_val, (int, float)) and co2_val > 2.0:
        recommendations.append(
            f"🔴 Karbon emisyon değeri ({co2_val} kg CO₂/kg) CBAM eşik değerinin "
            "üzerinde. Emisyon azaltma stratejisi geliştirilmeli veya "
            "karbon kredi satın alınmalıdır."
        )

    # Genel tamamlanma önerisi
    if pct < 60:
        recommendations.append(
            f"📊 DPP tamamlanma oranı %{pct}. AB pazarına ihracat için "
            "minimum %60 tamamlanma önerilir. Eksik alanları tamamlayın."
        )

    # Kategori bazlı yüzdeleri ekle
    category_summary = {}
    for cat_key, cat_data in category_scores.items():
        cat_pct = round((cat_data["earned"] / cat_data["max"]) * 100) if cat_data["max"] > 0 else 0
        category_summary[cat_key] = {
            "label": CATEGORY_LABELS[cat_key],
            "score": cat_data["earned"],
            "max": cat_data["max"],
            "percentage": cat_pct,
            "filled": cat_data["filled"],
            "total": cat_data["total"],
        }

    return {
        "score": pct,
        "raw_score": score,
        "max_score": MAX_SCORE,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "grade": grade,
        "filled_count": len(filled_fields),
        "total_count": len(DPP_FIELD_RULES),
        "missing_fields": missing_fields,
        "filled_fields": filled_fields,
        "category_scores": category_summary,
        "recommendations": recommendations,
        "regulatory_gaps": regulatory_gaps,
    }
