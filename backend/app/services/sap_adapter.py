"""
SAP Adapter — Temel bağlantı yönetimi

pyrfc gerektiriyor (Kocaer SAP ortamında kurulu olmalı):
  pip install pyrfc

Geliştirme ortamında mock mod çalışır.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Optional

logger = logging.getLogger("sap_adapter")


@dataclass
class SAPConfig:
    """SAP bağlantı ayarları — .env'den okunur."""
    host: str
    sysnr: str        # System number, örn: "00"
    client: str       # Client, örn: "100"
    user: str
    password: str
    lang: str = "TR"


@dataclass
class SAPMaterialData:
    """SAP'tan çekilen malzeme verisi."""
    material_number: str   # MATNR
    description: str       # MAKTX
    material_type: str     # MTART
    unit: str              # MEINS
    weight_gross: Optional[float] = None
    weight_net: Optional[float] = None
    steel_grade: Optional[str] = None


@dataclass
class SAPProductionOrder:
    """SAP üretim emri verisi."""
    order_number: str     # AUFNR
    material_number: str
    quantity: float
    unit: str
    plant: str            # Fabrika kodu
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    batch_number: Optional[str] = None


class SAPAdapter:
    """
    SAP RFC bağlantısı.

    Mock mod (SAP yokken):
        adapter = SAPAdapter(config=None, mock=True)
        data = await adapter.get_material("1000123")

    Gerçek mod (Kocaer SAP ortamında):
        config = SAPConfig(host="sap.kocaer.com", ...)
        adapter = SAPAdapter(config=config)
    """

    def __init__(
        self,
        config: Optional[SAPConfig] = None,
        mock: bool = False,
    ):
        self.config = config
        self.mock = mock or config is None
        self._connection = None

        if not self.mock:
            self._connect()

    def _connect(self) -> None:
        """SAP RFC bağlantısı kur."""
        try:
            import pyrfc
            self._connection = pyrfc.Connection(
                ashost=self.config.host,
                sysnr=self.config.sysnr,
                client=self.config.client,
                user=self.config.user,
                passwd=self.config.password,
                lang=self.config.lang,
            )
            logger.info("SAP bağlantısı kuruldu: %s", self.config.host)
        except ImportError:
            logger.warning("pyrfc kurulu değil — mock moda geçiliyor")
            self.mock = True
        except Exception as e:
            logger.error("SAP bağlantı hatası: %s", e)
            raise

    async def get_material(self, material_number: str) -> Optional[SAPMaterialData]:
        """
        SAP'tan malzeme verisi çek (RFC: BAPI_MATERIAL_GET_DETAIL).
        """
        if self.mock:
            return self._mock_material(material_number)

        try:
            result = self._connection.call(
                "BAPI_MATERIAL_GET_DETAIL",
                MATERIAL=material_number,
            )
            detail = result.get("MATERIAL_GENERAL_DATA", {})
            return SAPMaterialData(
                material_number=material_number,
                description=detail.get("MATL_DESC", ""),
                material_type=detail.get("MATL_TYPE", ""),
                unit=detail.get("BASE_UOM", ""),
            )
        except Exception as e:
            logger.error("SAP malzeme verisi çekme hatası: %s", e)
            return None

    async def get_production_order(
        self,
        order_number: str,
    ) -> Optional[SAPProductionOrder]:
        """
        SAP üretim emri verisi çek (RFC: BAPI_PRODORD_GET_DETAIL).
        """
        if self.mock:
            return self._mock_production_order(order_number)

        try:
            result = self._connection.call(
                "BAPI_PRODORD_GET_DETAIL",
                NUMBER=order_number,
            )
            header = result.get("HEADER", {})
            return SAPProductionOrder(
                order_number=order_number,
                material_number=header.get("MATERIAL", ""),
                quantity=float(header.get("TOTAL_QTY", 0)),
                unit=header.get("BASE_UOM", ""),
                plant=header.get("PLANT", ""),
                start_date=header.get("SCHED_START", None),
                end_date=header.get("SCHED_FIN", None),
            )
        except Exception as e:
            logger.error("SAP üretim emri çekme hatası: %s", e)
            return None

    def close(self) -> None:
        """Bağlantıyı kapat."""
        if self._connection:
            try:
                self._connection.close()
            except Exception:
                pass

    # ── Mock Verileri (geliştirme ortamı) ────────────────────────────────────

    @staticmethod
    def _mock_material(material_number: str) -> SAPMaterialData:
        return SAPMaterialData(
            material_number=material_number,
            description=f"[MOCK] Çelik Profil {material_number}",
            material_type="ROH",
            unit="KG",
            steel_grade="S355JR",
            weight_gross=1250.0,
            weight_net=1200.0,
        )

    @staticmethod
    def _mock_production_order(order_number: str) -> SAPProductionOrder:
        return SAPProductionOrder(
            order_number=order_number,
            material_number="MOCK-1000123",
            quantity=500.0,
            unit="KG",
            plant="1000",
            start_date="2026-03-01",
            end_date="2026-03-14",
            batch_number=f"BATCH-{order_number}",
        )