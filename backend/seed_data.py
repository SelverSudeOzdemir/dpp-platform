"""
Seed Script v3 - Mevcut product_types uzerinden DPP ve iliskili veriler ekler.
Her adimi ayri commit yapar, bir hata butunu bozmasin.
"""
import asyncio
import uuid
import json
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:asel.02@localhost:5433/kocaer_dpp"
engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def seed():
    async with async_session() as db:
        # ---- Mevcut product_type ID'lerini cek ----
        r = await db.execute(text("""
            SELECT id, product_name, product_category, manufacturer_id
            FROM product_types
            ORDER BY created_at
            LIMIT 5
        """))
        pts = r.fetchall()
        if not pts:
            print("HATA: product_types tablosu bos!")
            return

        for pt in pts:
            print(f"  PT: {pt[0]} -> {pt[1]} ({pt[2]})")

        pt1_id = pts[0][0]
        pt2_id = pts[1][0]
        pt3_id = pts[2][0] if len(pts) > 2 else pts[0][0]
        mfr_id = pts[0][3]

        # ---- Facility ----
        r = await db.execute(text("SELECT id FROM production_facilities LIMIT 1"))
        fac_row = r.fetchone()
        if fac_row:
            fac_id = fac_row[0]
        else:
            fac_id = uuid.uuid4()
            await db.execute(text("""
                INSERT INTO production_facilities (id, manufacturer_id, facility_name, location_text, country_code, is_active, gln, created_at, updated_at)
                VALUES (:id, :mfr_id, 'Aliaga Steel Works', 'Aliaga OSB, Izmir', 'TR', true, '8690000112345', NOW(), NOW())
            """), {"id": fac_id, "mfr_id": mfr_id})
            await db.commit()
        print(f"Facility: {fac_id}")

        # ---- DPPs ----
        dpp1_id = uuid.uuid4()
        dpp2_id = uuid.uuid4()
        dpp3_id = uuid.uuid4()

        dpps_data = [
            {"id": dpp1_id, "pt_id": pt1_id, "status": "published", "serial": f"KCR-2026-A-{uuid.uuid4().hex[:6]}", "prod_date": date(2026, 3, 12), "line": "EAF-03", "ver": "1.2"},
            {"id": dpp2_id, "pt_id": pt2_id, "status": "draft", "serial": f"KCR-2026-B-{uuid.uuid4().hex[:6]}", "prod_date": date(2026, 3, 15), "line": "EAF-01", "ver": "1.0"},
            {"id": dpp3_id, "pt_id": pt3_id, "status": "pending_approval", "serial": f"KCR-2026-C-{uuid.uuid4().hex[:6]}", "prod_date": date(2026, 3, 16), "line": "EAF-02", "ver": "1.1"},
        ]
        for d in dpps_data:
            await db.execute(text("""
                INSERT INTO digital_product_passports (
                    id, product_type_id, dpp_status, gs1_serial_number, production_date,
                    production_line, production_facility_id, current_version,
                    public_identifier, dpp_version, dpp_standard, data_carrier_type, is_active,
                    created_at, updated_at
                ) VALUES (
                    :id, :pt_id, :status, :serial, :prod_date,
                    :line, :fac_id, :ver,
                    :pub_id, '1.0.0', 'CIRPASS-Compatible', 'DataMatrix', true,
                    NOW(), NOW()
                )
            """), {"fac_id": fac_id, "pub_id": uuid.uuid4(), **d})
        await db.commit()
        print(f"3 DPP olusturuldu")

        # ---- Certifications ----
        r = await db.execute(text("SELECT count(*) FROM certifications"))
        if r.scalar() == 0:
            certs = [
                {"pt_id": pt1_id, "type": "CE Marking (EN 10025-1)", "number": "CE-TSE-2024-001", "issuer": "TSE", "issue": date(2024, 1, 10), "expiry": date(2027, 1, 10)},
                {"pt_id": pt1_id, "type": "ISO 9001 KYS", "number": "ISO9001-TUV-2024", "issuer": "TUV NORD", "issue": date(2024, 5, 20), "expiry": date(2027, 5, 20)},
                {"pt_id": pt2_id, "type": "EPD Belgesi", "number": "EPD-IBU-2024-021", "issuer": "IBU", "issue": date(2024, 3, 25), "expiry": date(2027, 3, 25)},
                {"pt_id": pt2_id, "type": "EN 1090-1 CE", "number": "CE-TUV-2024-003", "issuer": "TUV NORD", "issue": date(2024, 12, 31), "expiry": date(2027, 12, 31)},
                {"pt_id": pt3_id, "type": "TSE EN ISO 1461 Galvaniz", "number": "TSE-GAL-2024", "issuer": "TSE", "issue": date(2024, 11, 30), "expiry": date(2027, 11, 30)},
            ]
            for c in certs:
                await db.execute(text("""
                    INSERT INTO certifications (id, product_type_id, cert_scope, cert_type, cert_number, issuer, issue_date, expiry_date, status, created_at, updated_at)
                    VALUES (:id, :pt_id, 'product_type', :type, :number, :issuer, :issue, :expiry, 'Valid', NOW(), NOW())
                """), {"id": uuid.uuid4(), **c})
            await db.commit()
            print("5 Certification olusturuldu")

        # ---- Supply Chain Organizations ----
        r = await db.execute(text("SELECT count(*) FROM supply_chain_organizations"))
        org1_id = uuid.uuid4()
        org2_id = uuid.uuid4()
        org3_id = uuid.uuid4()
        if r.scalar() == 0:
            orgs = [
                {"id": org1_id, "name": "Erdemir A.S.", "role": "Ham Madde Tedarikçisi", "loc": "Eregli, Zonguldak", "cc": "TR", "verified": 1},
                {"id": org2_id, "name": "Kocaer Celik", "role": "Uretici", "loc": "Aliaga, Izmir", "cc": "TR", "verified": 1},
                {"id": org3_id, "name": "Ekol Lojistik", "role": "Lojistik Saglayici", "loc": "Istanbul", "cc": "TR", "verified": 0},
            ]
            for o in orgs:
                await db.execute(text("""
                    INSERT INTO supply_chain_organizations (id, name, role, location_text, country_code, is_verified, created_at)
                    VALUES (:id, :name, :role, :loc, :cc, :verified, NOW())
                """), o)
            await db.commit()
            print("3 Organization olusturuldu")
        else:
            r = await db.execute(text("SELECT id FROM supply_chain_organizations LIMIT 3"))
            eo = r.fetchall()
            org1_id = eo[0][0]
            org2_id = eo[1][0] if len(eo) > 1 else org1_id
            org3_id = eo[2][0] if len(eo) > 2 else org1_id

        # ---- Supply Chain Stages ----
        stage1_id = uuid.uuid4()
        stage2_id = uuid.uuid4()
        stage3_id = uuid.uuid4()
        stages = [
            {"id": stage1_id, "dpp_id": dpp1_id, "org_id": org1_id, "seq": 1, "name": "Raw Material Sourcing",
             "s_date": date(2025, 12, 20), "from_loc": "Eregli, Zonguldak", "to_loc": "Aliaga, Izmir",
             "method": "Karayolu", "dist": Decimal("850"), "co2km": Decimal("0.0529")},
            {"id": stage2_id, "dpp_id": dpp1_id, "org_id": org2_id, "seq": 2, "name": "Manufacturing & Profiling",
             "s_date": date(2026, 1, 10), "from_loc": "Aliaga, Izmir", "to_loc": "Aliaga, Izmir",
             "method": "Tesis Ici", "dist": Decimal("0"), "co2km": Decimal("0")},
            {"id": stage3_id, "dpp_id": dpp1_id, "org_id": org3_id, "seq": 3, "name": "Lojistik & Sevkiyat",
             "s_date": date(2026, 3, 12), "from_loc": "Aliaga, Izmir", "to_loc": "Hamburg, Almanya",
             "method": "Denizyolu", "dist": Decimal("2100"), "co2km": Decimal("0.0086")},
        ]
        for s in stages:
            await db.execute(text("""
                INSERT INTO supply_chain_stages (id, dpp_id, organization_id, sequence_number, stage_name, stage_date, from_location, to_location, transport_method, distance_km, co2_kg_per_km, traceability_id, created_at)
                VALUES (:id, :dpp_id, :org_id, :seq, :name, :s_date, :from_loc, :to_loc, :method, :dist, :co2km, :trace_id, NOW())
            """), {"trace_id": uuid.uuid4(), **s})
        await db.commit()
        print("3 Stage olusturuldu")

        # ---- Materials & Processes ----
        await db.execute(text("INSERT INTO supply_chain_materials (id, stage_id, material_name, quantity, unit, origin_country, created_at) VALUES (:id, :sid, 'Steel Billet', 25.000, 'tonnes', 'Turkey', NOW())"), {"id": uuid.uuid4(), "sid": stage1_id})
        await db.execute(text("INSERT INTO supply_chain_materials (id, stage_id, material_name, quantity, unit, origin_country, created_at) VALUES (:id, :sid, 'IPE 200 Profil', 42.5, 'tonnes', 'Turkey', NOW())"), {"id": uuid.uuid4(), "sid": stage2_id})
        await db.execute(text("INSERT INTO supply_chain_processes (id, stage_id, process_name, sequence_number, created_at) VALUES (:id, :sid, 'Melting', 1, NOW())"), {"id": uuid.uuid4(), "sid": stage1_id})
        await db.execute(text("INSERT INTO supply_chain_processes (id, stage_id, process_name, sequence_number, created_at) VALUES (:id, :sid, 'Hot Rolling', 1, NOW())"), {"id": uuid.uuid4(), "sid": stage2_id})
        await db.execute(text("INSERT INTO supply_chain_processes (id, stage_id, process_name, sequence_number, created_at) VALUES (:id, :sid, 'Sea Freight', 1, NOW())"), {"id": uuid.uuid4(), "sid": stage3_id})
        await db.commit()
        print("Materials & Processes olusturuldu")

        # ---- Audit Logs ----
        r = await db.execute(text("SELECT id, role FROM users LIMIT 5"))
        users = r.fetchall()
        if users:
            actions = ["DPP PDF indirildi", "DPP QR tarandi", "DPP kimyasal kompozisyon goruntulendi", "DPP tedarik zinciri goruntulendi", "DPP PDF indirildi", "DPP QR tarandi"]
            for i, action in enumerate(actions):
                user = users[i % len(users)]
                await db.execute(text(f"""
                    INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, ip_address, created_at)
                    VALUES (:id, :uid, :action, 'dpp', :rid, :ip, NOW() - INTERVAL '{i * 2} hours')
                """), {"id": uuid.uuid4(), "uid": user[0], "action": action, "rid": str(dpp1_id), "ip": f"195.142.{10+i}.{50+i}"})
            await db.commit()
            print(f"{len(actions)} Audit Log olusturuldu")

        # ---- DPP Changelog ----
        # Tablo: dpp_changelog, kolonlar: id, dpp_id, changed_by_user_id, change_type, previous_state (JSONB), new_state (JSONB), created_at
        if users:
            changelogs = [
                {"change_type": "UPDATE", "prev": {"co2_a1a3": "1.20"}, "new": {"co2_a1a3": "1.15", "verification_status": "Third-Party Verified"}},
                {"change_type": "UPDATE", "prev": {"epd_number": None}, "new": {"epd_number": "EPD-TR-2024-017"}},
                {"change_type": "ACTIVATE", "prev": {"dpp_status": "draft"}, "new": {"dpp_status": "published"}},
            ]
            for j, cl in enumerate(changelogs):
                await db.execute(text(f"""
                    INSERT INTO dpp_changelog (id, dpp_id, changed_by_user_id, change_type, previous_state, new_state, created_at)
                    VALUES (:id, :dpp_id, :uid, :ct, :prev, :new_s, NOW() - INTERVAL '{j * 48} hours')
                """), {
                    "id": uuid.uuid4(), "dpp_id": dpp1_id, "uid": users[0][0],
                    "ct": cl["change_type"], "prev": json.dumps(cl["prev"]), "new_s": json.dumps(cl["new"]),
                })
            await db.commit()
            print("3 DPP Changelog olusturuldu")

        print("\n=== SEED TAMAMLANDI ===")
        print(f"DPP IDs:")
        print(f"  published: {dpp1_id}")
        print(f"  draft:     {dpp2_id}")
        print(f"  pending:   {dpp3_id}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
