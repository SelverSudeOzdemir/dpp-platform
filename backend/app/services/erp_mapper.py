"""
ERP Data Mapper
SAP verisi → DPP field mapping
"""
from __future__ import annotations

import uuid
from datetime import date
from typing import Any, Optional

from app.services.sap_adapter import SAPMaterialData, SAPProductionOrder


class ERPMapper:
    """
    SAP → DPP field dönüşümü.

    Kullanım:
        material = await sap.get_material("1000123")
        order = await sap.get_production_order("ORD-456")

        dpp_data = ERPMapper.map_to_dpp_create(
            material=material,
            order=order,
            product_type_id=pt_id,
        )
        # dpp_data artık DppCreate schema'ya hazır
    """

    @staticmethod
    def map_to_dpp_create(
        material: SAPMaterialData,
        order: SAPProductionOrder,
        product_type_id: uuid.UUID,
        *,
        gtin_prefix: str = "8690000",  # Kocaer GS1 prefix
    ) -> dict[str, Any]:
        """
        SAP malzeme + üretim emrini DPP oluşturma verisine çevir.

        Returns:
            DppCreate schema ile uyumlu dict
        """
        # GTIN: prefix + material_number (14 haneye tamamla)
        mat_digits = "".join(filter(str.isdigit, material.material_number))
        gtin_raw = f"{gtin_prefix}{mat_digits}"

        return {
            "product_type_id": product_type_id,
            "gtin": gtin_raw[:13].zfill(13),   # 13 hane + check digit sonra
            "gs1_serial_number": order.order_number,
            "production_date": ERPMapper._parse_sap_date(order.start_date),
            "production_order_number": order.order_number,
            "batch_number": order.batch_number,
            "production_line": order.plant,
        }

    @staticmethod
    def map_chemical_composition(
        sap_data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        SAP kalite belgesi verisi → ChemicalComposition schema.

        SAP field → DPP field mapping:
          STEEL_GRADE → grade_designation
          C_CONTENT   → carbon_c
          MN_CONTENT  → manganese_mn
          vb.
        """
        return {
            "carbon_c":       sap_data.get("C_CONTENT"),
            "manganese_mn":   sap_data.get("MN_CONTENT"),
            "silicon_si":     sap_data.get("SI_CONTENT"),
            "phosphorus_p":   sap_data.get("P_CONTENT"),
            "sulfur_s":       sap_data.get("S_CONTENT"),
            "chromium_cr":    sap_data.get("CR_CONTENT"),
            "nickel_ni":      sap_data.get("NI_CONTENT"),
            "molybdenum_mo":  sap_data.get("MO_CONTENT"),
            "grade_designation": sap_data.get("STEEL_GRADE") or sap_data.get("MATL_DESC"),
        }

    @staticmethod
    def map_mechanical_properties(
        sap_data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        SAP test sonuçları → MechanicalProperties schema.
        """
        return {
            "yield_strength_mpa":   sap_data.get("YIELD_STRENGTH"),
            "tensile_strength_mpa": sap_data.get("TENSILE_STRENGTH"),
            "elongation_percent":   sap_data.get("ELONGATION"),
            "impact_energy_j":      sap_data.get("IMPACT_ENERGY"),
            "hardness_hb":          sap_data.get("HARDNESS_HB"),
            "test_temperature_c":   sap_data.get("TEST_TEMP"),
        }

    @staticmethod
    def _parse_sap_date(sap_date: Optional[str]) -> Optional[date]:
        """
        SAP tarih formatını Python date'e çevir.
        SAP formatları: YYYYMMDD veya YYYY-MM-DD
        """
        if not sap_date:
            return None
        try:
            clean = sap_date.replace("-", "")
            return date(
                int(clean[0:4]),
                int(clean[4:6]),
                int(clean[6:8]),
            )
        except (ValueError, IndexError):
            return None