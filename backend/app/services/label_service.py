"""
Label Template Service
QR + ürün bilgileri → print edilebilir etiket HTML
"""
from __future__ import annotations

import base64
import uuid
from dataclasses import dataclass
from typing import Optional

from app.services.gs1_service import GS1Service
from app.services.qr_generator import QRGenerator


@dataclass
class LabelData:
    """Etiket üretimi için gerekli veriler."""
    dpp_id: uuid.UUID
    product_name: str
    gtin: str
    serial_number: str
    batch_number: Optional[str] = None
    production_date: Optional[str] = None
    steel_grade: Optional[str] = None      # Örn: S355JR
    dimensions: Optional[str] = None       # Örn: 12mm x 6000mm
    heat_number: Optional[str] = None      # Eriyik numarası
    company_name: str = "Kocaer Çelik"


class LabelService:

    @classmethod
    def generate_label_html(
        cls,
        label_data: LabelData,
        base_domain: str = "dpp.kocaer.com",
    ) -> str:
        """
        Print edilebilir etiket HTML'i üret.
        QR kodu base64 PNG olarak gömülü gelir — dış bağımlılık yok.
        """
        # GS1 URL ve QR üret
        links = GS1Service.build_from_dpp(
            dpp_id=label_data.dpp_id,
            gtin=label_data.gtin,
            gs1_serial_number=label_data.serial_number,
            domain=base_domain,
        )
        qr_png = QRGenerator.generate_for_dpp(
            label_data.dpp_id,
            f"https://{base_domain}",
        )
        qr_b64 = base64.b64encode(qr_png).decode("utf-8")

        return cls._render_template(label_data, links, qr_b64)

    @staticmethod
    def _render_template(
        d: LabelData,
        links: dict,
        qr_b64: str,
    ) -> str:
        """Etiket HTML şablonu."""
        optional_rows = ""
        if d.steel_grade:
            optional_rows += f"<tr><td>Çelik Sınıfı</td><td><b>{d.steel_grade}</b></td></tr>"
        if d.dimensions:
            optional_rows += f"<tr><td>Boyut</td><td>{d.dimensions}</td></tr>"
        if d.heat_number:
            optional_rows += f"<tr><td>Eriyik No</td><td>{d.heat_number}</td></tr>"
        if d.batch_number:
            optional_rows += f"<tr><td>Batch No</td><td>{d.batch_number}</td></tr>"
        if d.production_date:
            optional_rows += f"<tr><td>Üretim Tarihi</td><td>{d.production_date}</td></tr>"

        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: Arial, sans-serif; font-size: 11px; }}
  .label {{
    width: 100mm; padding: 4mm;
    border: 1px solid #000;
    display: flex; gap: 4mm;
  }}
  .qr-section {{ flex-shrink: 0; }}
  .qr-section img {{ width: 28mm; height: 28mm; }}
  .info-section {{ flex: 1; }}
  .company {{ font-size: 13px; font-weight: bold; margin-bottom: 2mm; }}
  .product {{ font-size: 12px; margin-bottom: 2mm; }}
  table {{ width: 100%; border-collapse: collapse; }}
  td {{ padding: 0.5mm 1mm; vertical-align: top; }}
  td:first-child {{ color: #555; width: 45%; }}
  .gs1-url {{
    font-size: 7px; color: #333;
    margin-top: 2mm; word-break: break-all;
  }}
  .dpp-id {{ font-size: 7px; color: #666; margin-top: 1mm; }}
  @media print {{
    body {{ margin: 0; }}
    .label {{ border: 1px solid #000; }}
  }}
</style>
</head>
<body>
<div class="label">
  <div class="qr-section">
    <img src="data:image/png;base64,{qr_b64}" alt="QR Code">
  </div>
  <div class="info-section">
    <div class="company">{d.company_name}</div>
    <div class="product">{d.product_name}</div>
    <table>
      <tr><td>GTIN</td><td>{links['gtin']}</td></tr>
      <tr><td>Seri No</td><td>{d.serial_number}</td></tr>
      {optional_rows}
    </table>
    <div class="gs1-url">{links['gs1_digital_link']}</div>
    <div class="dpp-id">DPP: {d.dpp_id}</div>
  </div>
</div>
</body>
</html>"""

    @classmethod
    def generate_label_png(
        cls,
        label_data: LabelData,
        base_domain: str = "dpp.kocaer.com",
    ) -> bytes:
        """
        Etiket PNG üret (HTML → PNG dönüşümü).
        Not: Bu metot için 'weasyprint' veya 'playwright' gerekir.
        Şimdilik sadece QR PNG döndürür — tam etiket sonraki fazda.
        """
        # TODO: weasyprint entegrasyonu — Faz C'de
        return QRGenerator.generate_for_dpp(
            label_data.dpp_id,
            f"https://{base_domain}",
        )