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
            stmt = stmt.where(DigitalProductPassport.product_type_id == product_id)
        
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    def to_json(dpps):
        data = []
        for d in dpps:
            data.append({
                "public_id": str(d.public_identifier),
                "gtin": d.gtin,
                "serial": d.gs1_serial_number,
                "status": d.dpp_status,
                "version": d.dpp_version,
                "product": {
                    "name": d.product_type.product_name if d.product_type else None,
                    "manufacturer": d.product_type.manufacturer.name if d.product_type and d.product_type.manufacturer else "Kocaer Steel",
                    "manufacturer_legal": d.product_type.manufacturer.legal_name if d.product_type and d.product_type.manufacturer else None
                }
            })
        return json.dumps(data, indent=2, default=str)

    @staticmethod
    def to_cbam_xml(dpps):
        import xml.etree.ElementTree as ET
        root = ET.Element("CBAMReport")
        header = ET.SubElement(root, "Header")
        ET.SubElement(header, "ReportDate").text = datetime.now().isoformat()
        
        for d in dpps:
            item = ET.SubElement(root, "ImportedGoods")
            ET.SubElement(item, "DPP_ID").text = str(d.public_identifier)
            
        return ET.tostring(root, encoding='utf-8')

    @staticmethod
    def to_excel(dpps):
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment, PatternFill
        
        wb = Workbook()
        ws = wb.active
        ws.title = "DPP Export"
        
        # Header
        headers = ["Public ID", "GTIN", "Serial Number", "Status", "Version", "Product Name", "Manufacturer", "Created At"]
        ws.append(headers)
        
        # Style Header
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="4F81BD", end_color="4F81BD", fill_type="solid")
        for cell in ws[1]:
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")
            
        # Data
        for d in dpps:
            ws.append([
                str(d.public_identifier),
                d.gtin,
                d.gs1_serial_number,
                d.dpp_status,
                d.dpp_version,
                d.product_type.product_name if d.product_type else "N/A",
                d.product_type.manufacturer.name if d.product_type and d.product_type.manufacturer else "Kocaer Steel",
                d.created_at.strftime("%Y-%m-%d %H:%M") if d.created_at else "N/A"
            ])
            
        # Column width adjustment
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
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
