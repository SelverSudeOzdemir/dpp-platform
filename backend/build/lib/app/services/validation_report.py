"""
Validation Report Generator — Hata/uyarı sınıflandırma raporu
"""
from datetime import datetime
from typing import Dict, Any
from app.services.schema_validator import SchemaValidationResult


def generate_validation_report(
    public_identifier: str, result: SchemaValidationResult, score: float
) -> Dict[str, Any]:
    """
    JSON formatında bir validasyon raporu oluşturur.
    """
    return {
        "dpp_id": public_identifier,
        "timestamp": datetime.utcnow().isoformat(),
        "compliance_score": score,
        "is_compliant": result.is_valid,
        "summary": {
            "total_errors": len(result.errors),
            "total_warnings": len(result.warnings),
        },
        "details": result.to_dict(),
    }