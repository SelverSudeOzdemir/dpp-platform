"""
CIRPASS Compliance Scorer — Uyumluluk yüzdesi hesaplama
"""
from app.services.schema_validator import SchemaValidationResult


def calculate_compliance_score(result: SchemaValidationResult) -> float:
    """
    Validasyon sonucuna göre %0-100 arası uyumluluk puanı hesaplar.
    """
    if result.is_valid and result.total_issues == 0:
        return 100.0

    # Basit bir puanlama mantığı
    # Her hata -15 puan, her uyarı -5 puan düşürür
    score = 100.0 - (len(result.errors) * 15) - (len(result.warnings) * 5)

    return max(0.0, score)