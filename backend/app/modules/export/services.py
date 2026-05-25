from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.dpp import DigitalProductPassport, DppStatusEnum
from app.models.product import ProductType
from app.models.certification import Certification
from app.models.supply_chain import SupplyChainStage
from app.models.lifecycle import LifecycleEvent
from app.models.integration import DppChangelog
from app.modules.auth.models import AuditLog
import json
from io import BytesIO
from datetime import datetime

class ExportService:
    @staticmethod
    async def get_dpp_data_for_export(db: AsyncSession, date_from=None, date_to=None, product_id=None):
        from sqlalchemy.orm import joinedload
        from app.models.manufacturer import ProductionFacility
        
        stmt = select(DigitalProductPassport).options(
            joinedload(DigitalProductPassport.product_type).joinedload(ProductType.manufacturer),
            joinedload(DigitalProductPassport.production_facility)
        )
        if product_id:
            stmt = stmt.where(DigitalProductPassport.id == product_id)
        if date_from:
            stmt = stmt.where(DigitalProductPassport.created_at >= datetime.fromisoformat(date_from))
        if date_to:
            dto = date_to
            if len(dto) == 10:
                dto += "T23:59:59.999999"
            stmt = stmt.where(DigitalProductPassport.created_at <= datetime.fromisoformat(dto))
        
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    def _enrich_dpp(d):
        return {
            "id": str(d.public_identifier) if d.public_identifier else "N/A",
            "parti_no": d.gs1_serial_number or "MOCK-PARTI-001",
            "product_name": d.product_type.product_name if d.product_type else "Bilinmeyen Urun",
            "product_category": d.product_type.product_category.value if d.product_type and hasattr(d.product_type.product_category, 'value') else (d.product_type.product_category if d.product_type else "Structural Steel"),
            "passport_status": getattr(d.dpp_status, 'value', str(d.dpp_status)) if d.dpp_status else "draft",
            "version": d.dpp_version or "1.0",
            "blockchain_timestamp": (d.created_at or datetime.now()).isoformat() + "Z",
            "emissions": {
                "co2_cradle_to_gate_kg": float(d.product_type.co2_cradle_to_gate_kg) if d.product_type and d.product_type.co2_cradle_to_gate_kg else 1.15,
                "cbam_limit": 2.0,
                "cbam_compliant": True,
                "logistics_total_co2": 0.085,
                "logistics_routes": [
                    {
                        "from": "Eregli, Zonguldak",
                        "to": "Aliaga, Izmir",
                        "method": "Karayolu",
                        "dist_km": 850,
                        "co2": 0.045
                    }
                ]
            },
            "certificates": [
                {
                    "name": "EN 10204 3.1",
                    "type": "batch",
                    "issuer": "Kocaer QC",
                    "expiry": "2027-03-10",
                    "days_left": 348,
                    "status": "Gecerli"
                }
            ],
            "reach_svhc": [
                {
                    "substance": "Lead (Pb) - MOCK",
                    "cas": "7439-92-1",
                    "threshold_pct": 0.1,
                    "detected_pct": 0.003,
                    "exceeds": False
                }
            ],
            "supply_chain": {
                "suppliers": [
                    {
                        "name": "Erdemir A.S. - MOCK",
                        "role": "Ham Madde Tedarikcisi",
                        "verified": True,
                        "accuracy": 97,
                        "method": "EPD Belgeli",
                        "risk": "Dusuk"
                    }
                ]
            },
            "version_history": [
                {
                    "version": "1.0",
                    "by": "system",
                    "at": (d.created_at or datetime.now()).strftime("%Y-%m-%d %H:%M"),
                    "changes": "Initial creation"
                }
            ],
            "access_logs": [
                {
                    "user": "inspector@gtb.gov.tr",
                    "role": "AUTHORITY",
                    "action": "Pasaport PDF indirildi",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "ip": "195.142.0.1"
                }
            ]
        }

    @staticmethod
    def to_json(dpps):
        enriched_data = [ExportService._enrich_dpp(d) for d in dpps]
        output = {
            "export_metadata": {
                "generated_at": datetime.now().isoformat() + "Z",
                "generated_by": "system",
                "schema_version": "1.0"
            },
            "passports": enriched_data
        }
        return json.dumps(output, indent=2, default=str)

    @staticmethod
    def to_cbam_xml(dpps):
        import xml.etree.ElementTree as ET
        root = ET.Element("CBAMReport")
        header = ET.SubElement(root, "Header")
        ET.SubElement(header, "ReportDate").text = datetime.now().isoformat()
        
        for d in dpps:
            enriched = ExportService._enrich_dpp(d)
            declarant = ET.SubElement(root, "Declarant")
            ET.SubElement(declarant, "EORI").text = "Kocaer_YYS_001_MOCK"
            ET.SubElement(declarant, "Name").text = "Kocaer Celik (MOCK)"
            ET.SubElement(declarant, "Address").text = "Aliaga (MOCK)"
            ET.SubElement(declarant, "ReportingPeriod").text = "Q1 2026"

            item = ET.SubElement(root, "ImportedGoods")
            ET.SubElement(item, "DPP_ID").text = enriched["parti_no"]
            ET.SubElement(item, "CNCode").text = "7216.32"
            ET.SubElement(item, "GoodsDescription").text = enriched["product_name"]
            ET.SubElement(item, "CountryOfOrigin").text = "TR"
            ET.SubElement(item, "NetMass").text = "100"
            ET.SubElement(item, "CustomsProcedure").text = "4000"

            pi = ET.SubElement(root, "ProductionInstallation")
            ET.SubElement(pi, "InstallationName").text = "Kocaer Aliaga Tesisi"
            ET.SubElement(pi, "InstallationId").text = "TR-12345"
            ET.SubElement(pi, "UNLOCODE").text = "TR IZM"
            ET.SubElement(pi, "ProductionRoute").text = "EAF"

            em = ET.SubElement(root, "EmbeddedEmissions")
            ET.SubElement(em, "SpecificEmbeddedEmissions").text = str(enriched["emissions"]["co2_cradle_to_gate_kg"])
            ET.SubElement(em, "DirectEmissions").text = str(round(enriched["emissions"]["co2_cradle_to_gate_kg"] * 0.7, 2))
            ET.SubElement(em, "IndirectEmissions").text = str(round(enriched["emissions"]["co2_cradle_to_gate_kg"] * 0.3, 2))
            ET.SubElement(em, "EmissionFactor").text = "0.45"

            cp = ET.SubElement(root, "CarbonPrice")
            ET.SubElement(cp, "CarbonPricePaid").text = "0"
            ET.SubElement(cp, "Currency").text = "TRY"
            ET.SubElement(cp, "Instrument").text = "ETS"
            ET.SubElement(cp, "FreeAllocation").text = "0"

            ver = ET.SubElement(root, "Verification")
            ET.SubElement(ver, "VerifierName").text = "TUV NORD (MOCK)"
            ET.SubElement(ver, "Accreditation").text = "AC-123"
            ET.SubElement(ver, "VerificationDate").text = "2026-03-10"

        return ET.tostring(root, encoding='utf-8')

    @staticmethod
    def to_excel(dpps):
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment, PatternFill
        
        wb = Workbook()
        
        # Helper for styling
        def create_sheet(title, headers):
            ws = wb.create_sheet(title)
            ws.append(headers)
            header_font = Font(bold=True, color="FFFFFF")
            header_fill = PatternFill(start_color="4F81BD", end_color="4F81BD", fill_type="solid")
            for cell in ws[1]:
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = Alignment(horizontal="center")
            return ws

        ws_summary = create_sheet("Pasaport Ozeti", ["Batch ID", "Urun Adi", "Kategori", "Pasaport Durumu", "Versiyon", "Veri Kaynagi", "CO2", "CBAM", "Tarih"])
        ws_cert = create_sheet("Sertifikalar", ["Sertifika Adi", "Tipi", "Urun", "Veren", "Son Gecerlilik", "Kalan Gun", "Durum"])
        ws_reach = create_sheet("REACH SVHC", ["Madde", "CAS", "Esik", "Tespit", "Asildi mi"])
        ws_supply = create_sheet("Tedarik Zinciri", ["Tedarikci", "Rol", "Dogrulandi mi", "Guvenilirlik", "Risk"])
        ws_logistics = create_sheet("Lojistik Emisyon", ["Kalkis", "Varis", "Yontem", "Mesafe", "CO2"])

        wb.remove(wb["Sheet"]) # remove default sheet

        for d in dpps:
            enr = ExportService._enrich_dpp(d)
            ws_summary.append([
                enr["parti_no"], enr["product_name"], enr["product_category"], enr["passport_status"], enr["version"], "SAP/ERP", enr["emissions"]["co2_cradle_to_gate_kg"], "Hayir", enr["blockchain_timestamp"]
            ])
            for c in enr["certificates"]:
                ws_cert.append([c["name"], c["type"], enr["product_name"], c["issuer"], c["expiry"], c["days_left"], c["status"]])
            for r in enr["reach_svhc"]:
                ws_reach.append([r["substance"], r["cas"], r["threshold_pct"], r["detected_pct"], r["exceeds"]])
            for s in enr["supply_chain"]["suppliers"]:
                ws_supply.append([s["name"], s["role"], s["verified"], s["accuracy"], s["risk"]])
            for l in enr["emissions"]["logistics_routes"]:
                ws_logistics.append([l["from"], l["to"], l["method"], l["dist_km"], l["co2"]])

        from openpyxl.utils import get_column_letter
        for ws in wb.worksheets:
            for col in ws.columns:
                max_length = 0
                if not col or not col[0].column:
                    continue
                column = get_column_letter(col[0].column)
                for cell in col:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                ws.column_dimensions[column].width = max_length + 2

        output = BytesIO()
        wb.save(output)
        return output.getvalue()
