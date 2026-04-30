"""
Batch QR Code Service
Toplu QR üretimi — birden fazla DPP için aynı anda
"""
from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass
from typing import Optional

from app.services.gs1_service import GS1Service
from app.services.qr_generator import QRGenerator


@dataclass
class QRResult:
    """Tek bir QR kod üretim sonucu."""
    dpp_id: uuid.UUID
    qr_png: bytes         # PNG bytes
    gs1_url: str          # GS1 Digital Link URL
    dpp_url: str          # DPP direkt URL
    success: bool = True
    error: Optional[str] = None


@dataclass
class BatchQRRequest:
    """Toplu QR isteği için tek bir DPP bilgisi."""
    dpp_id: uuid.UUID
    gtin: str
    serial_number: str


class BatchQRService:

    @classmethod
    async def generate_batch(
        cls,
        requests: list[BatchQRRequest],
        base_domain: str = "dpp.kocaer.com",
        *,
        styled: bool = True,
        max_concurrent: int = 10,
    ) -> list[QRResult]:
        """
        Toplu QR üret — async, max_concurrent adet eş zamanlı çalışır.

        Args:
            requests: Her DPP için id + gtin + serial_number listesi
            base_domain: GS1 ve DPP URL'leri için domain
            styled: Yuvarlak köşeli QR stili
            max_concurrent: Aynı anda kaç QR üretilsin

        Returns:
            Her istek için QRResult listesi (aynı sırada)
        """
        semaphore = asyncio.Semaphore(max_concurrent)

        async def _generate_one(req: BatchQRRequest) -> QRResult:
            async with semaphore:
                try:
                    links = GS1Service.build_from_dpp(
                        dpp_id=req.dpp_id,
                        gtin=req.gtin,
                        gs1_serial_number=req.serial_number,
                        domain=base_domain,
                    )
                    # QR üretimi CPU-bound, thread pool'da çalıştır
                    qr_png = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: QRGenerator.generate(
                            links["gs1_digital_link"],
                            styled=styled,
                        ),
                    )
                    return QRResult(
                        dpp_id=req.dpp_id,
                        qr_png=qr_png,
                        gs1_url=links["gs1_digital_link"],
                        dpp_url=links["dpp_url"],
                        success=True,
                    )
                except Exception as e:
                    return QRResult(
                        dpp_id=req.dpp_id,
                        qr_png=b"",
                        gs1_url="",
                        dpp_url="",
                        success=False,
                        error=str(e),
                    )

        return await asyncio.gather(*[_generate_one(r) for r in requests])

    @classmethod
    def generate_batch_sync(
        cls,
        requests: list[BatchQRRequest],
        base_domain: str = "dpp.kocaer.com",
    ) -> list[QRResult]:
        """Senkron versiyon — test veya CLI kullanımı için."""
        results = []
        for req in requests:
            try:
                links = GS1Service.build_from_dpp(
                    dpp_id=req.dpp_id,
                    gtin=req.gtin,
                    gs1_serial_number=req.serial_number,
                    domain=base_domain,
                )
                qr_png = QRGenerator.generate(links["gs1_digital_link"])
                results.append(QRResult(
                    dpp_id=req.dpp_id,
                    qr_png=qr_png,
                    gs1_url=links["gs1_digital_link"],
                    dpp_url=links["dpp_url"],
                ))
            except Exception as e:
                results.append(QRResult(
                    dpp_id=req.dpp_id,
                    qr_png=b"",
                    gs1_url="",
                    dpp_url="",
                    success=False,
                    error=str(e),
                ))
        return results