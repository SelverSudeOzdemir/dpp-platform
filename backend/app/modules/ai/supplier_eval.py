"""
Supplier Evaluation Rule Engine & LLM Prompt Generator
Tedarikçi anket sonuçlarına göre güven skorunu hesaplar ve AI yorumu üretir.
"""
from typing import Any, Dict, List
import statistics

# Ağırlıklar (0-1 arası, toplamı 1.0 olacak)
WEIGHT_DELIVERY = 0.4
WEIGHT_QUALITY = 0.4
WEIGHT_COMMUNICATION = 0.2

def analyze_supplier_evaluations(evaluations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Kural tabanlı tedarikçi skorlaması.
    
    Returns:
        {
            "trust_score": int (0-100),
            "avg_delivery_score": float,
            "avg_quality_score": float,
            "avg_communication_score": float,
            "avg_delay_days": float,
            "avg_damage_rate": float,
            "risk_level": str,
            "total_evaluations": int
        }
    """
    total = len(evaluations)
    if total == 0:
        return {
            "trust_score": 0,
            "avg_delivery_score": 0.0,
            "avg_quality_score": 0.0,
            "avg_communication_score": 0.0,
            "avg_delay_days": 0.0,
            "avg_damage_rate": 0.0,
            "risk_level": "BİLİNMİYOR",
            "total_evaluations": 0
        }

    # Temel metrikleri topla
    delivery_scores = [e.get("delivery_score", 5) for e in evaluations]
    quality_scores = [e.get("quality_score", 5) for e in evaluations]
    comm_scores = [e.get("communication_score", 5) for e in evaluations]
    
    # Gecikme hesabı (Eğer actual > estimated ise gecikme vardır)
    delay_days_list = []
    damage_rates = []
    
    for e in evaluations:
        est = e.get("estimated_delivery_days")
        act = e.get("actual_delivery_days")
        if est is not None and act is not None:
            delay = act - est
            delay_days_list.append(delay if delay > 0 else 0)  # Erken gelmesi negatif gecikme sayılmaz, 0 alınır
            
        dmg = e.get("damage_rate_pct")
        if dmg is not None:
            # Decimal değerini float'a çevir
            damage_rates.append(float(dmg))

    # Ortalamalar
    avg_del = statistics.mean(delivery_scores)
    avg_qual = statistics.mean(quality_scores)
    avg_comm = statistics.mean(comm_scores)
    
    avg_delay = statistics.mean(delay_days_list) if delay_days_list else 0.0
    avg_damage = statistics.mean(damage_rates) if damage_rates else 0.0

    # Skor Hesabı (1-5 arası puanları 0-100 arasına çek ve ağırlıklandır)
    # Formül: ((Puan - 1) / 4) * 100 -> 5 = 100, 1 = 0
    norm_del = ((avg_del - 1) / 4.0) * 100
    norm_qual = ((avg_qual - 1) / 4.0) * 100
    norm_comm = ((avg_comm - 1) / 4.0) * 100

    base_score = (norm_del * WEIGHT_DELIVERY) + (norm_qual * WEIGHT_QUALITY) + (norm_comm * WEIGHT_COMMUNICATION)

    # Ceza Puanları (Gecikme ve Hasar)
    # Her 1 günlük gecikme -2 puan, Her %1 hasar -5 puan ceza (Max ceza limitleri uygulanabilir)
    penalty_delay = min(avg_delay * 2.0, 20.0)  # Maksimum 20 puan ceza
    penalty_damage = min(avg_damage * 5.0, 30.0) # Maksimum 30 puan ceza

    trust_score = max(0, min(100, round(base_score - penalty_delay - penalty_damage)))

    # Risk Seviyesi
    if trust_score >= 80:
        risk_level = "DÜŞÜK"
    elif trust_score >= 60:
        risk_level = "ORTA"
    else:
        risk_level = "YÜKSEK"

    return {
        "trust_score": trust_score,
        "avg_delivery_score": round(avg_del, 2),
        "avg_quality_score": round(avg_qual, 2),
        "avg_communication_score": round(avg_comm, 2),
        "avg_delay_days": round(avg_delay, 2),
        "avg_damage_rate": round(avg_damage, 2),
        "risk_level": risk_level,
        "total_evaluations": total
    }


def build_supplier_prompt(supplier_name: str, analysis: Dict[str, Any]) -> str:
    """Ollama LLM için tedarikçi değerlendirme promptu."""
    if analysis["total_evaluations"] == 0:
        return f"{supplier_name} adlı tedarikçi için henüz değerlendirme bulunmuyor."
        
    return f"""Sen Kocaer Çelik tedarik zinciri analiz uzmanısın.
Aşağıda "{supplier_name}" adlı tedarikçiye ait performans verileri verilmiştir.
Bu verilere dayanarak, kısa ve profesyonel bir tedarikçi performans özeti yaz.
Sadece verilere odaklan. 100 kelimeyi geçme.

Tedarikçi Performans Verileri:
- Toplam Değerlendirme Sayısı: {analysis['total_evaluations']}
- Genel Güven Skoru: {analysis['trust_score']}/100
- Risk Seviyesi: {analysis['risk_level']}
- Ortalama Teslimat Puanı: {analysis['avg_delivery_score']}/5
- Ortalama Kalite Puanı: {analysis['avg_quality_score']}/5
- Ortalama İletişim Puanı: {analysis['avg_communication_score']}/5
- Ortalama Teslimat Gecikmesi: {analysis['avg_delay_days']} gün
- Ortalama Ürün Hasar/Fire Oranı: %{analysis['avg_damage_rate']}

Özeti 3 kısa madde halinde yaz:
1. Genel Durum
2. Güçlü ve Zayıf Yönler
3. Eylem Önerisi
"""
