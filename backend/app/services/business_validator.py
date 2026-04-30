"""
Business Rules Validator — Çelik grade-mekanik uyumu, batch format
"""
import re
from typing import Optional
from app.services.schema_validator import SchemaValidationResult


def validate_steel_grade_mechanical_match(
    steel_grade: str, yield_strength: float, tensile_strength: float
) -> SchemaValidationResult:
    """
    Çelik kalitesi ile mekanik özelliklerin uyumunu kontrol eder.
    Örn: S235JR için akma sınırı genelde > 235 MPa olmalıdır.
    """
    result = SchemaValidationResult()

    if not steel_grade or not yield_strength:
        return result

    # Basit mantık: SXXX -> XXX minimum akma sınırı
    match = re.search(r"S(\d{3})", steel_grade)
    if match:
        min_yield = float(match.group(1))
        if yield_strength < min_yield:
            result.add_error(
                "yield_strength_mpa",
                f"{steel_grade} için akma sınırı minimum {min_yield} MPa olmalıdır. (Mevcut: {yield_strength})",
            )

    return result