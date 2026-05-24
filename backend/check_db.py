import asyncio
import asyncpg

async def check():
    try:
        conn = await asyncpg.connect('postgresql://kocaer_user:Qwelke.01@localhost:5432/dpp_yeni')

        # 1. Users var mi?
        users = await conn.fetch('SELECT id, email, role, is_active FROM users LIMIT 5')
        print('=== USERS ===')
        for u in users:
            print(f'  {u["email"]} | {u["role"]} | active={u["is_active"]}')
        if not users:
            print('  *** BOŞ — hiç kullanıcı yok!')

        # 2. Tablo listesi
        tables = await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
        )
        print(f'\n=== TABLOLAR ({len(tables)} adet) ===')
        for t in tables:
            print(f'  {t["tablename"]}')

        # 3. Eksik kolonlar var mi?
        missing_checks = [
            ('digital_product_passports', 'production_route'),
            ('digital_product_passports', 'ocak_no'),
            ('digital_product_passports', 'miktar_ton'),
            ('product_types', 'boy_mm'),
            ('certifications', 'test_standard'),
            ('manufacturers', 'city'),
        ]
        print('\n=== EKSİK KOLON KONTROLÜ ===')
        for tbl, col in missing_checks:
            exists = await conn.fetchval(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_name=$1 AND column_name=$2",
                tbl, col
            )
            status = 'OK' if exists else 'EKSIK'
            print(f'  [{status}]  {tbl}.{col}')

        await conn.close()
    except Exception as e:
        print(f'BAGLANTI HATASI: {e}')

asyncio.run(check())
