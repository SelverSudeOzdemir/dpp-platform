"""
GS1 Digital Link Service
CIRPASS uyumlu standart URL formatı

GS1 Digital Link formatı:
https://{domain}/{primary_key}/{value}/{qualifier}/{value}

Örnek:
https://dpp.kocaer.com/01/08690000123456/21/BATCH-2024-001
                        ↑ GTIN AI        ↑ Serial AI
"""
from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from typing import Optional


# GS1 Application Identifier'ları
class GS1AI:
    GTIN            = "01"   # Global Trade Item Number (14 hane)
    SERIAL_NUMBER   = "21"   # Seri numarası
    BATCH_LOT       = "10"   # Batch/lot numarası
    PRODUCTION_DATE = "11"   # Üretim tarihi (YYMMDD)
    EXPIRY_DATE     = "17"   # Son kullanma tarihi


@dataclass
class GS1DigitalLink:
    """Üretilen GS1 Digital Link bilgisi."""
    url: str              # Tam URL
    gtin: str             # GTIN (14 hane)
    serial_number: str    # Seri numarası
    domain: str           # Base domain


class GS1Service:

    DEFAULT_DOMAIN = "dpp.kocaer.com"

    @classmethod
    def build_digital_link(
        cls,
        gtin: str,
        serial_number: str,
        *,
        domain: Optional[str] = None,
        batch_number: Optional[str] = None,
        production_date: Optional[str] = None,
    ) -> GS1DigitalLink:
        """
        GS1 Digital Link URL oluştur.

        Args:
            gtin: 14 haneli GTIN (eksikse başına 0 ekler)
            serial_number: Ürün seri numarası
            domain: Base domain (varsayılan: dpp.kocaer.com)
            batch_number: Batch/lot numarası (opsiyonel)
            production_date: YYMMDD formatında üretim tarihi (opsiyonel)

        Returns:
            GS1DigitalLink

        Örnek çıktı:
            https://dpp.kocaer.com/01/08690000123456/21/BATCH-2024-001
        """
        use_domain = domain or cls.DEFAULT_DOMAIN
        normalized_gtin = cls.normalize_gtin(gtin)

        # Ana path: /01/{gtin}/21/{serial}
        url = f"https://{use_domain}/{GS1AI.GTIN}/{normalized_gtin}/{GS1AI.SERIAL_NUMBER}/{serial_number}"

        # Opsiyonel qualifier'lar
        if batch_number:
            url += f"/{GS1AI.BATCH_LOT}/{batch_number}"
        if production_date:
            url += f"/{GS1AI.PRODUCTION_DATE}/{production_date}"

        return GS1DigitalLink(
            url=url,
            gtin=normalized_gtin,
            serial_number=serial_number,
            domain=use_domain,
        )

    @classmethod
    def build_from_dpp(
        cls,
        dpp_id: uuid.UUID,
        gtin: str,
        gs1_serial_number: str,
        *,
        domain: Optional[str] = None,
    ) -> dict:
        """
        DPP nesnesinden GS1 Digital Link + DPP URL üret.
        İkisini birden döndürür — QR'a hangisi kodlanacak seçilebilir.
        """
        use_domain = domain or cls.DEFAULT_DOMAIN
        gs1_link = cls.build_digital_link(gtin, gs1_serial_number, domain=use_domain)
        dpp_url = f"https://{use_domain}/dpp/{dpp_id}"

        return {
            "gs1_digital_link": gs1_link.url,
            "dpp_url": dpp_url,
            "gtin": gs1_link.gtin,
            "serial_number": gs1_serial_number,
        }

    @staticmethod
    def normalize_gtin(gtin: str) -> str:
        """
        GTIN'i 14 haneye normalize et.
        Başına gerektiği kadar 0 ekler.
        """
        digits_only = re.sub(r"\D", "", gtin)
        if len(digits_only) > 14:
            raise ValueError(f"GTIN çok uzun: {len(digits_only)} hane (max 14)")
        return digits_only.zfill(14)

    @staticmethod
    def validate_gtin(gtin: str) -> bool:
        """
        GTIN check digit doğrula (GS1 standardı).
        """
        digits = re.sub(r"\D", "", gtin).zfill(14)
        if len(digits) != 14:
            return False

        # GS1 check digit algoritması
        total = sum(
            int(d) * (3 if i % 2 == 0 else 1)
            for i, d in enumerate(reversed(digits[:-1]))
        )
        check = (10 - (total % 10)) % 10
        return check == int(digits[-1])