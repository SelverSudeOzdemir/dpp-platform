import asyncio
import uuid
import random
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Kendi DB URL'inizi buraya girin (alembic'in kullandığı db.sqlite veya postgresql URL'i)
from app.db.session import AsyncSessionLocal

async def seed_data():
    async with AsyncSessionLocal() as db:
        # 1. Tedarikçileri Bul
        result = await db.execute(text("SELECT id, name FROM supply_chain_organizations WHERE role != 'Müşteri'"))
        suppliers = result.fetchall()
        
        if not suppliers:
            logger.error("Veritabanında hiç tedarikçi (supply_chain_organizations) bulunamadı!")
            return
            
        # 2. Admin kullanıcısını bul (Değerlendirmeyi yapan kişi)
        result = await db.execute(text("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1"))
        admin = result.fetchone()
        admin_id = admin[0] if admin else None
        
        # 3. Biraz değerlendirme ekle
        evaluations_added = 0
        for supplier in suppliers:
            supplier_id = supplier[0]
            
            # Rastgele 2 ile 5 arası anket doldur
            num_evals = random.randint(2, 5)
            for i in range(num_evals):
                eval_id = uuid.uuid4()
                
                # Mock datalar (Bazen iyi bazen kötü)
                del_score = random.randint(3, 5)
                qual_score = random.randint(2, 5)
                comm_score = random.randint(3, 5)
                
                est_days = random.randint(5, 15)
                # Bazen gecikme olsun (est_days + 1 ile 5 gün arası)
                act_days = est_days + random.randint(-2, 4)
                if act_days < 1: act_days = 1
                
                # Hasar oranı %0 ile %5 arası
                damage = round(random.uniform(0, 5.0), 2)
                
                notes = f"{num_evals-i} ay önceki sevkiyat değerlendirmesi. Teslimat süresi: {act_days} gün."
                created_at = datetime.utcnow() - timedelta(days=30 * i)
                
                stmt = text("""
                    INSERT INTO supplier_evaluations 
                    (id, organization_id, evaluator_id, delivery_score, quality_score, communication_score, estimated_delivery_days, actual_delivery_days, damage_rate_pct, notes, created_at)
                    VALUES (:id, :org_id, :ev_id, :ds, :qs, :cs, :est, :act, :dmg, :notes, :created)
                """)
                
                await db.execute(stmt, {
                    "id": eval_id,
                    "org_id": supplier_id,
                    "ev_id": admin_id,
                    "ds": del_score,
                    "qs": qual_score,
                    "cs": comm_score,
                    "est": est_days,
                    "act": act_days,
                    "dmg": damage,
                    "notes": notes,
                    "created": created_at
                })
                evaluations_added += 1
                
        await db.commit()
        logger.info(f"Başarıyla {len(suppliers)} tedarikçi için toplam {evaluations_added} adet değerlendirme eklendi!")

if __name__ == "__main__":
    asyncio.run(seed_data())
