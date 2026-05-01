"""
QR Code Generator
UUID tabanlı QR kod üretimi — qrcode[pil] kullanır
"""
from __future__ import annotations

import io
import uuid
from enum import Enum
from typing import Optional

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer


class QRErrorCorrection(str, Enum):
    LOW      = "L"   # %7  — en küçük dosya
    MEDIUM   = "M"   # %15 — varsayılan
    QUARTILE = "Q"   # %25
    HIGH     = "H"   # %30 — en dayanıklı


class QRGenerator:

    # Varsayılan ayarlar
    DEFAULT_BOX_SIZE    = 10   # Her kutunun piksel boyutu
    DEFAULT_BORDER      = 4    # Beyaz kenar (minimum 4, standart gereği)
    DEFAULT_CORRECTION  = qrcode.constants.ERROR_CORRECT_M

    @classmethod
    def generate(
        cls,
        data: str,
        *,
        box_size: int = DEFAULT_BOX_SIZE,
        border: int = DEFAULT_BORDER,
        error_correction: str = QRErrorCorrection.MEDIUM,
        styled: bool = False,
    ) -> bytes:
        """
        QR kod üret, PNG bytes döndür.

        Args:
            data: QR'a kodlanacak veri (URL, UUID string vb.)
            box_size: Her modülün piksel büyüklüğü
            border: Beyaz kenar kalınlığı (minimum 4)
            error_correction: Hata düzeltme seviyesi
            styled: Yuvarlak köşeli modern stil
        Returns:
            PNG formatında bytes
        """
        correction_map = {
            QRErrorCorrection.LOW:      qrcode.constants.ERROR_CORRECT_L,
            QRErrorCorrection.MEDIUM:   qrcode.constants.ERROR_CORRECT_M,
            QRErrorCorrection.QUARTILE: qrcode.constants.ERROR_CORRECT_Q,
            QRErrorCorrection.HIGH:     qrcode.constants.ERROR_CORRECT_H,
        }

        qr = qrcode.QRCode(
            version=None,  # Otomatik boyut
            error_correction=correction_map.get(error_correction, qrcode.constants.ERROR_CORRECT_M),
            box_size=box_size,
            border=border,
        )
        qr.add_data(data)
        qr.make(fit=True)

        if styled:
            img = qr.make_image(
                image_factory=StyledPilImage,
                module_drawer=RoundedModuleDrawer(),
            )
        else:
            img = qr.make_image(fill_color="black", back_color="white")

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    def generate_for_dpp(
        cls,
        dpp_id: uuid.UUID,
        base_url: str,
        *,
        styled: bool = True,
    ) -> bytes:
        """
        DPP için QR kod üret.
        URL formatı: {base_url}/dpp/{dpp_id}
        Örnek: https://dpp.kocaer.com/dpp/550e8400-e29b-41d4-a716...
        """
        url = f"{base_url.rstrip('/')}/dpp/{dpp_id}"
        return cls.generate(url, styled=styled, error_correction=QRErrorCorrection.HIGH)

    @classmethod
    def generate_svg(cls, data: str) -> str:
        """
        SVG formatında QR kod üret.
        PNG gerekmediğinde, web sayfasına gömmek için kullanılır.
        """
        import qrcode.image.svg as qr_svg

        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(image_factory=qr_svg.SvgPathImage)
        buffer = io.BytesIO()
        img.save(buffer)
        return buffer.getvalue().decode("utf-8")