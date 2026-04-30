"""
Schema Validator — CIRPASS zorunlu alan kontrolleri
"""
from typing import List, Optional, Any
from uuid import UUID

# CIRPASS tarafından zorunlu tutulan alanlar
CIRPASS_REQUIRED_FIELDS = {
    "product_type": [
        "product_name",
        "product_category",
        "manufacturer_part_number",
        "steel_grade",
        "material_standard",
        "dimensional_standard",
    ],
    "dpp": [
        "public_identifier",
        "dpp_version",
        "dpp_standard",
        "gs1_serial_number",
        "production_date",
        "data_carrier_type",
    ],
    "environmental": [
        "co2_cradle_to_gate_kg",
        "recycled_content_pct",
        "recyclability_pct",
    ],
    "chemical_composition": [
        "carbon_pct",
        "manganese_pct",
        "phosphorus_pct",
        "sulfur_pct",
        "reference_standard",
    ],
    "mechanical_properties": [
        "yield_strength_mpa",
        "tensile_strength_mpa",
        "elongation_pct",
        "reference_standard",
    ],
    "manufacturer": [
        "name",
        "country",
        "country_code",
    ],
    "certification": [
        "cert_type",
        "cert_number",
        "issuer",
        "issue_date",
        "status",
    ],
}


class ValidationError:
    """Tek bir validasyon hatası."""

    def __init__(self, field: str, message: str, severity: str = "error"):
        self.field = field
        self.message = message
        self.severity = severity  # 'error', 'warning', 'info'

    def to_dict(self) -> dict:
        return {
            "field": self.field,
            "message": self.message,
            "severity": self.severity,
        }


class SchemaValidationResult:
    """Validasyon sonucu."""

    def __init__(self):
        self.errors: List[ValidationError] = []
        self.warnings: List[ValidationError] = []

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    @property
    def total_issues(self) -> int:
        return len(self.errors) + len(self.warnings)

    def add_error(self, field: str, message: str):
        self.errors.append(ValidationError(field, message, "error"))

    def add_warning(self, field: str, message: str):
        self.warnings.append(ValidationError(field, message, "warning"))

    def to_dict(self) -> dict:
        return {
            "is_valid": self.is_valid,
            "total_errors": len(self.errors),
            "total_warnings": len(self.warnings),
            "errors": [e.to_dict() for e in self.errors],
            "warnings": [w.to_dict() for w in self.warnings],
        }


def validate_required_fields(
    data: dict,
    category: str,
    result: Optional[SchemaValidationResult] = None,
) -> SchemaValidationResult:
    """
    CIRPASS zorunlu alanlarını kontrol eder.
    Args:
        data: Kontrol edilecek veri (dict veya model.__dict__)
        category: Alan kategorisi (product_type, dpp, environmental, vb.)
        result: Var olan sonuç nesnesi (yoksa yenisi oluşturulur)
    Returns:
        SchemaValidationResult
    """
    if result is None:
        result = SchemaValidationResult()

    required = CIRPASS_REQUIRED_FIELDS.get(category, [])
    for field in required:
        value = data.get(field)
        if value is None or (isinstance(value, str) and value.strip() == ""):
            result.add_error(
                field,
                f"CIRPASS zorunlu alan '{field}' ({category}) eksik veya boş.",
            )
    return result


def validate_dpp_completeness(
    dpp_data: dict,
    product_type_data: dict,
    chemical_data: Optional[dict] = None,
    mechanical_data: Optional[dict] = None,
    manufacturer_data: Optional[dict] = None,
) -> SchemaValidationResult:
    """
    Tam bir DPP kaydının CIRPASS uyumluluğunu kontrol eder.
    """
    result = SchemaValidationResult()

    # DPP ana alanları
    validate_required_fields(dpp_data, "dpp", result)

    # Ürün tipi alanları
    validate_required_fields(product_type_data, "product_type", result)

    # Çevresel veriler
    validate_required_fields(product_type_data, "environmental", result)

    # Kimyasal kompozisyon
    if chemical_data:
        validate_required_fields(chemical_data, "chemical_composition", result)
    else:
        result.add_warning("chemical_composition", "Kimyasal kompozisyon verisi bulunamadı.")

    # Mekanik özellikler
    if mechanical_data:
        validate_required_fields(mechanical_data, "mechanical_properties", result)
    else:
        result.add_warning("mechanical_properties", "Mekanik özellik verisi bulunamadı.")

    # Üretici bilgileri
    if manufacturer_data:
        validate_required_fields(manufacturer_data, "manufacturer", result)
    else:
        result.add_warning("manufacturer", "Üretici bilgisi bulunamadı.")

    return result