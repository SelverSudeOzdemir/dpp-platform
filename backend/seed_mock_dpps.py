import asyncio
import uuid
from datetime import datetime, date
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.manufacturer import Manufacturer
from app.models.product import ProductType, ProductCategoryEnum, SteelGradeEnum
from app.models.dpp import DigitalProductPassport, DppStatusEnum, DataCarrierFormatEnum

async def seed_data():
    async with AsyncSessionLocal() as session:
        # 1. Check or create Manufacturer
        result = await session.execute(select(Manufacturer).limit(1))
        manufacturer = result.scalars().first()
        
        if not manufacturer:
            print("Creating dummy Manufacturer...")
            manufacturer = Manufacturer(
                id=uuid.uuid4(),
                name="Kocaer Steel Mock",
                legal_name="Kocaer Çelik Sanayi ve Ticaret A.Ş. (Mock)",
                tax_id="1234567890",
                website="https://www.kocaersteel.com"
            )
            session.add(manufacturer)
            await session.commit()
            await session.refresh(manufacturer)
        
        # 2. Check or create ProductType
        result = await session.execute(select(ProductType).limit(1))
        product_type = result.scalars().first()
        
        if not product_type:
            print("Creating dummy ProductType...")
            product_type = ProductType(
                id=uuid.uuid4(),
                manufacturer_id=manufacturer.id,
                product_name="IPE 200 Yapısal Çelik Profil (Mock)",
                product_category=ProductCategoryEnum.STRUCTURAL_STEEL,
                steel_grade=SteelGradeEnum.S275JR,
                co2_cradle_to_gate_kg=1.15
            )
            session.add(product_type)
            await session.commit()
            await session.refresh(product_type)

        # 3. Create mock DPPs
        print("Creating mock DPPs...")
        mock_dpps = [
            DigitalProductPassport(
                id=uuid.uuid4(),
                public_identifier=uuid.uuid4(),
                product_type_id=product_type.id,
                gs1_serial_number="MOCK-SN-001",
                dpp_status=DppStatusEnum.PUBLISHED,
                production_date=date(2026, 3, 10),
                gtin="08691234567890"
            ),
            DigitalProductPassport(
                id=uuid.uuid4(),
                public_identifier=uuid.uuid4(),
                product_type_id=product_type.id,
                gs1_serial_number="MOCK-SN-002",
                dpp_status=DppStatusEnum.DRAFT,
                production_date=date(2026, 3, 15),
                gtin=None # intentional missing data
            ),
            DigitalProductPassport(
                id=uuid.uuid4(),
                public_identifier=uuid.uuid4(),
                product_type_id=product_type.id,
                gs1_serial_number="MOCK-SN-003",
                dpp_status=DppStatusEnum.RECALLED,
                production_date=date(2026, 3, 20),
                gtin=None # intentional missing data
            ),
            DigitalProductPassport(
                id=uuid.uuid4(),
                public_identifier=uuid.uuid4(),
                product_type_id=product_type.id,
                gs1_serial_number="MOCK-SN-004",
                dpp_status=DppStatusEnum.PUBLISHED,
                production_date=date(2026, 3, 25),
                gtin="08691234567891"
            )
        ]
        
        session.add_all(mock_dpps)
        await session.commit()
        print("Successfully inserted mock DPPs.")

if __name__ == "__main__":
    asyncio.run(seed_data())
