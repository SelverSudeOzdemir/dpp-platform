

-- Extensions
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- Full-text search için

-- Auto-update updated_at timestamp (erken tanım — tüm trigger'lardan önce gerekli)
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE product_category_enum AS ENUM (
    'Structural Steel',
    'Flat Products',
    'Long Products',
    'Tubes and Pipes'
);

CREATE TYPE steel_grade_enum AS ENUM (
    'S235JR', 'S275JR', 'S275J0', 'S275J2',
    'S355JR', 'S355J0', 'S355J2', 'S355K2',
    'S420', 'S460'
);

CREATE TYPE heat_treatment_enum AS ENUM (
    'Hot Rolled',
    'Cold Rolled',
    'Normalized',
    'Quenched and Tempered',
    'Thermomechanically Rolled'
);

CREATE TYPE certification_status_enum AS ENUM (
    'Valid',
    'Expired',
    'Suspended',
    'Revoked'
);

CREATE TYPE lifecycle_stage_enum AS ENUM (
    'A1',      -- Raw material supply
    'A2',      -- Transport to manufacturer
    'A3',      -- Manufacturing
    'A1-A3',   -- Cradle-to-gate
    'A4',      -- Transport to building site
    'A5',      -- Installation
    'B1',      -- Use
    'B2',      -- Maintenance
    'B3',      -- Repair
    'B4',      -- Replacement
    'B5',      -- Refurbishment
    'C1',      -- Deconstruction
    'C2',      -- Transport
    'C3',      -- Waste processing
    'C4',      -- Disposal
    'D'        -- Reuse/Recovery/Recycling
);

CREATE TYPE event_type_enum AS ENUM (
    'Manufacturing',
    'Quality Check',
    'Transportation',
    'Storage',
    'Installation',
    'Inspection',
    'Maintenance',
    'Disposal'
);

CREATE TYPE event_status_enum AS ENUM (
    'Pending',
    'InProgress',
    'Completed',
    'Failed',
    'Cancelled'
);

CREATE TYPE data_carrier_format_enum AS ENUM (
    'QR Code',
    'DataMatrix',
    'Barcode',
    'RFID',
    'NFC'
);

CREATE TYPE surface_condition_enum AS ENUM (
    'Hot Rolled - Mill Finish',
    'Shot Blasted and Primed',
    'Galvanized',
    'Painted',
    'Coated'
);

-- DÜZ-2: Sertifika scope tipi
CREATE TYPE cert_scope_enum AS ENUM (
    'product_type',   -- Tüm ürün tipini kapsıyor (CE, ISO gibi)
    'dpp_instance'    -- Tek bir ürün bireyini kapsıyor (3.1 sertifikası gibi)
);

-- DÜZ-4: Erişim seviyesi tipi
CREATE TYPE access_level_enum AS ENUM (
    'public',       -- Herkes görebilir (QR tarayan herkes)
    'registered',   -- Kayıtlı kullanıcılar (tedarikçiler, müşteriler)
    'verified',     -- Doğrulanmış kurumlar (denetçiler, regulatörler)
    'internal'      -- Sadece Kocaer personeli
);

-- YENİ: DPP yaşam döngüsü durum enum (Eksik #4)
-- is_active BOOLEAN yetersizdi; DRAFT→ACTIVE→REGISTERED akışı izlenebilsin
CREATE TYPE dpp_status_enum AS ENUM (
    'draft',           -- Henüz tamamlanmamış / onaylanmamış
    'active',          -- Yayında, kullanımda
    'deactivated',     -- Geçici olarak devre dışı
    'registered'       -- EU Registry'ye başarıyla kayıtlı
);

-- YENİ: Registry sync durumu (Eksik #5)
CREATE TYPE registry_sync_status_enum AS ENUM (
    'pending',
    'in_progress',
    'success',
    'failed',
    'retry'
);

-- YENİ: Kullanıcı rolü (Eksik #6)
CREATE TYPE user_role_enum AS ENUM (
    'admin',
    'operator',
    'viewer',
    'api_user'
);

-- =============================================================================
-- 0. COMPANIES — Çok Kiracılı (Multi-Tenant) Yapı (Eksik #1)
--    SaaS hedefi ve Faz 2 planı için zorunlu.
--    Tüm üreticiler, kullanıcılar ve DPP'ler bir company'e bağlıdır.
-- =============================================================================

CREATE TABLE companies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,   -- URL-friendly tanımlayıcı
    plan            VARCHAR(50) NOT NULL DEFAULT 'starter', -- 'starter','pro','enterprise'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    -- Contact
    contact_email   VARCHAR(255),
    website         VARCHAR(500),
    country_code    CHAR(2),
    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE companies IS
    'Multi-tenant yapı için şirket/kiracı tablosu.
     Aynı veritabanında birden fazla firma yönetimini destekler.
     SaaS hedefiyle uyumlu — Faz 2 gereksinimi.';

CREATE TRIGGER trg_companies_updated
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- =============================================================================
-- 1. MANUFACTURERS (Üreticiler)
-- =============================================================================

CREATE TABLE manufacturers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID REFERENCES companies(id) ON DELETE RESTRICT,  -- YENİ: multi-tenant bağlantı
    name                VARCHAR(255) NOT NULL,
    -- Address
    street              VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(100),
    postal_code         VARCHAR(20),
    country             VARCHAR(100),
    country_code        CHAR(2),
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),
    -- Contact
    email               VARCHAR(255),
    phone               VARCHAR(50),
    website             VARCHAR(500),
    dpp_support_email   VARCHAR(255),
    -- Business Identifiers
    vat_number          VARCHAR(50),
    eori_number         VARCHAR(50),
    duns                VARCHAR(20),
    lei                 VARCHAR(30),
    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE manufacturers IS 'Steel product manufacturers - maps to DPP manufacturer section';

CREATE TABLE manufacturer_certifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manufacturer_id     UUID NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
    certification_name  VARCHAR(100) NOT NULL,  -- e.g. 'ISO 9001:2015', 'EN 1090-1+A1'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. PRODUCTION FACILITIES (Üretim Tesisleri)
-- =============================================================================

CREATE TABLE production_facilities (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manufacturer_id     UUID NOT NULL REFERENCES manufacturers(id) ON DELETE RESTRICT,
    name                VARCHAR(255) NOT NULL,
    facility_code       VARCHAR(50) UNIQUE,
    location_text       VARCHAR(500),
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE production_facilities IS 'Physical production plants/facilities';

-- =============================================================================
-- 3. PRODUCT TYPES / CATALOG (Ürün Tipleri / Katalog)
-- DÜZ-1: Kimyasal ve mekanik kolonlar bu tablodan kaldırıldı,
--         chemical_compositions ve mechanical_properties tablolarına taşındı.
-- =============================================================================

CREATE TABLE product_types (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manufacturer_id         UUID NOT NULL REFERENCES manufacturers(id) ON DELETE RESTRICT,
    -- Identity
    product_name            VARCHAR(255) NOT NULL,       -- e.g. 'IPE 100', 'Köşebent 100x100x10.00'
    product_model           VARCHAR(500),                -- Full model description
    product_type            VARCHAR(100),                -- 'Steel Profile', 'Steel Angle Profile'
    product_category        product_category_enum NOT NULL DEFAULT 'Structural Steel',
    brand                   VARCHAR(100),
    manufacturer_part_number VARCHAR(100) UNIQUE,        -- e.g. 'KCR-IPE100-S275JR'
    gtin                    VARCHAR(14) UNIQUE,          -- GS1 GTIN-13
    -- Standards
    dimensional_standard    VARCHAR(100),               -- e.g. 'EN 10034:1993', 'EN 10056-1:2017'
    material_standard       VARCHAR(100),               -- e.g. 'EN 10025-2:2019'
    -- Steel Grade
    steel_grade             steel_grade_enum,
    -- Dimensions (mm)
    dim_height_mm           NUMERIC(8,2),
    dim_height_tolerance    VARCHAR(20),
    dim_width_mm            NUMERIC(8,2),
    dim_width_tolerance     VARCHAR(20),
    dim_web_thickness_mm    NUMERIC(6,3),
    dim_web_tolerance       VARCHAR(20),
    dim_flange_thickness_mm NUMERIC(6,3),
    dim_flange_tolerance    VARCHAR(20),
    dim_root_radius_mm      NUMERIC(6,2),
    dim_root_tolerance      VARCHAR(20),
    -- Geometric Properties
    section_area_cm2        NUMERIC(8,3),
    weight_per_meter_kg     NUMERIC(8,3),
    moment_inertia_iy_cm4   NUMERIC(10,2),
    moment_inertia_iz_cm4   NUMERIC(10,2),
    section_modulus_wely_cm3 NUMERIC(8,3),
    section_modulus_welz_cm3 NUMERIC(8,3),
    radius_gyration_iy_cm   NUMERIC(6,3),
    radius_gyration_iz_cm   NUMERIC(6,3),
    -- Available Lengths
    standard_length_m       NUMERIC(5,2),
    available_lengths       TEXT[],         -- e.g. '{6m,9m,12m}'
    custom_length_available BOOLEAN DEFAULT TRUE,
    -- Processing
    heat_treatment          heat_treatment_enum,
    surface_condition       surface_condition_enum,
    -- Environmental (per kg)
    epd_number              VARCHAR(100),
    epd_url                 VARCHAR(500),
    epd_valid_until         DATE,
    co2_cradle_to_gate_kg   NUMERIC(6,4),   -- kg CO2e/kg, scope A1-A3
    co2_production_kg       NUMERIC(6,4),   -- kg CO2e/kg, scope A3
    co2_transport_kg        NUMERIC(6,4),   -- kg CO2e/kg, scope A4
    embodied_energy_mj_kg   NUMERIC(8,3),
    water_consumption_l_kg  NUMERIC(6,3),
    recycled_content_pct    NUMERIC(5,2),
    recyclability_pct       NUMERIC(5,2) DEFAULT 100,
    -- End of Life
    dismantling_difficulty  VARCHAR(50),
    hazardous_materials     BOOLEAN DEFAULT FALSE,
    hazardous_declaration   TEXT,
    -- Documentation URLs
    technical_drawing_url   VARCHAR(500),
    model_3d_url            VARCHAR(500),
    -- Timestamps
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE product_types IS
    'Ürün katalogu / tip tanımları. Her ürün modeli için bir satır.
     v2.0.0: Kimyasal ve mekanik özellik kolonları normalize edildi —
     chemical_compositions ve mechanical_properties tablolarına taşındı.';

-- =============================================================================
-- 3A. CHEMICAL COMPOSITIONS (DÜZ-1)
-- product_types içindeki chem_* kolonlarından ayrıştırıldı.
-- =============================================================================

CREATE TABLE chemical_compositions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_type_id         UUID NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,

    -- Karbon
    carbon_pct              NUMERIC(5,4),
    carbon_max_pct          NUMERIC(5,4),

    -- Silisyum
    silicon_pct             NUMERIC(5,4),
    silicon_max_pct         NUMERIC(5,4),

    -- Manganez
    manganese_pct           NUMERIC(5,4),
    manganese_max_pct       NUMERIC(5,4),

    -- Fosfor
    phosphorus_pct          NUMERIC(6,5),
    phosphorus_max_pct      NUMERIC(6,5),

    -- Kükürt
    sulfur_pct              NUMERIC(6,5),
    sulfur_max_pct          NUMERIC(6,5),

    -- Nitrojen
    nitrogen_pct            NUMERIC(6,5),
    nitrogen_max_pct        NUMERIC(6,5),

    -- Referans standard (hangi standarda göre ölçüldü)
    reference_standard      VARCHAR(100),   -- örn: 'EN 10025-2:2019'

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Bir ürün tipinin tek bir kimyasal kompozisyon kaydı olsun
    CONSTRAINT uq_chem_product_type UNIQUE (product_type_id)
);

COMMENT ON TABLE chemical_compositions IS
    'Ürün tiplerine ait kimyasal kompozisyon verileri.
     product_types tablosundan ayrıştırılarak normalize edildi.
     Her product_type için tek kayıt.';

-- =============================================================================
-- 3B. MECHANICAL PROPERTIES (DÜZ-1)
-- product_types içindeki mekanik kolonlardan ayrıştırıldı.
-- =============================================================================

CREATE TABLE mechanical_properties (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_type_id             UUID NOT NULL REFERENCES product_types(id) ON DELETE CASCADE,

    -- Akma dayanımı (MPa)
    yield_strength_mpa          NUMERIC(7,2),
    yield_strength_min_mpa      NUMERIC(7,2),

    -- Çekme dayanımı (MPa)
    tensile_strength_mpa        NUMERIC(7,2),
    tensile_strength_min_mpa    NUMERIC(7,2),
    tensile_strength_max_mpa    NUMERIC(7,2),

    -- Uzama (%)
    elongation_pct              NUMERIC(5,2),
    elongation_min_pct          NUMERIC(5,2),

    -- Darbe enerjisi (Joule) ve sıcaklık (°C)
    impact_energy_j             NUMERIC(6,2),
    impact_temperature_c        NUMERIC(5,1),

    -- Referans standard
    reference_standard          VARCHAR(100),   -- örn: 'EN 10025-2:2019'

    -- Test koşulları (opsiyonel)
    test_temperature_c          NUMERIC(5,1),
    test_direction              VARCHAR(50),    -- örn: 'Longitudinal', 'Transverse'

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_mech_product_type UNIQUE (product_type_id)
);

COMMENT ON TABLE mechanical_properties IS
    'Ürün tiplerine ait mekanik özellik verileri.
     product_types tablosundan ayrıştırılarak normalize edildi.
     Her product_type için tek kayıt.';

-- =============================================================================
-- 4. DIGITAL PRODUCT PASSPORTS (Dijital Ürün Pasaportları)
-- =============================================================================

CREATE TABLE digital_product_passports (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- DPP Metadata
    dpp_version             VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    dpp_standard            VARCHAR(100) NOT NULL DEFAULT 'CIRPASS-Compatible',
    -- Product Link
    product_type_id         UUID NOT NULL REFERENCES product_types(id) ON DELETE RESTRICT,
    -- Public Identifier (UPI - Unique Product Identifier)
    public_identifier       UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    upi_url                 VARCHAR(500) GENERATED ALWAYS AS (
                                'https://dpp.kocaersteel.com/p/' || public_identifier::TEXT
                            ) STORED,
    -- GS1
    gtin                    VARCHAR(14),
    gs1_serial_number       VARCHAR(50) NOT NULL,
    gs1_digital_link        VARCHAR(500) GENERATED ALWAYS AS (
                                'https://dpp.kocaersteel.com/01/' || gtin || '/21/' || gs1_serial_number
                            ) STORED,
    -- Data Carrier
    data_carrier_type       data_carrier_format_enum NOT NULL DEFAULT 'DataMatrix',
    data_carrier_standard   VARCHAR(50) DEFAULT 'ISO/IEC 16022',
    -- Internal References (RESTRICTED - NOT exposed in public API)
    _batch_number           VARCHAR(100)
                                CONSTRAINT chk_batch_number_format CHECK (
                                    _batch_number IS NULL
                                    OR _batch_number ~ '^\d{8}-\d{3}$'
                                ),
    _serial_number          VARCHAR(100),
    _production_order_number VARCHAR(100),
    -- Production
    production_facility_id  UUID REFERENCES production_facilities(id),
    production_date         DATE NOT NULL,
    production_line         VARCHAR(255),
    shift                   VARCHAR(100),
    -- DPP Hosting
    api_endpoint            VARCHAR(500) DEFAULT 'https://api.kocaersteel.com/dpp/v1/',
    backup_primary_url      VARCHAR(500),
    backup_secondary_url    VARCHAR(500),
    data_format             VARCHAR(50) DEFAULT 'JSON-LD',
    data_schema             VARCHAR(100) DEFAULT 'CIRPASS DPP Schema v1.0',
    -- Version Control
    current_version         VARCHAR(20) DEFAULT '1.0.0',
    -- Status
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,  -- Geriye dönük uyumluluk için korundu
    -- YENİ: DPP Durum Yönetimi (Eksik #4) — DRAFT→ACTIVE→REGISTERED akışı
    dpp_status              dpp_status_enum NOT NULL DEFAULT 'draft',
    status_changed_at       TIMESTAMPTZ,
    -- YENİ: JSON-LD Depolama (Eksik #2)
    -- Dokümantasyondaki json_ld JSONB alanı — GIN index ile sorgulanabilir
    json_ld                 JSONB,
    -- YENİ: HTML İçerik Depolama (Eksik #3)
    -- 2C Engine + HTML modülünün beklediği HTML wrapper içeriği
    html_content            TEXT,
    -- YENİ: Full-text Search (Eksik #8)
    search_vector           TSVECTOR,
    -- Timestamps
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Constraints
    CONSTRAINT uq_gs1_serial UNIQUE (gtin, gs1_serial_number)
);

COMMENT ON TABLE digital_product_passports IS
    'Her bireysel ürün birimi için bir DPP. public_identifier UUID v4 (sayım saldırılarına karşı güvenli).
     _ önekli iç alanlar public API''de açılmamalıdır.';

COMMENT ON COLUMN digital_product_passports.public_identifier IS
    'RFC 4122 UUID v4 - kriptografik olarak rastgele, sayım saldırılarını önler';

COMMENT ON COLUMN digital_product_passports._batch_number IS
    'RESTRICTED: Sadece iç kullanım — public API''ye açılmaz.
     Format: YYYYMMDD-NNN (örn: 20240115-001)
     Regex kontrolü: chk_batch_number_format constraint ile zorunlu.';

COMMENT ON COLUMN digital_product_passports._serial_number IS
    'RESTRICTED: Internal use only - not exposed in public API';

-- =============================================================================
-- 5. CERTIFICATIONS (Sertifikalar)
-- DÜZ-2: cert_scope kolonu eklendi, bağlantı netleştirildi.
-- =============================================================================

CREATE TABLE certifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Can be linked to product type or individual DPP
    product_type_id     UUID REFERENCES product_types(id) ON DELETE CASCADE,
    dpp_id              UUID REFERENCES digital_product_passports(id) ON DELETE CASCADE,
    -- DÜZ-2: Hangi scope'a ait olduğunu netleştirir
    cert_scope          cert_scope_enum NOT NULL,
    -- Certificate Details
    cert_type           VARCHAR(200) NOT NULL,   -- e.g. 'CE Marking', 'EN 10204 3.1 Certificate'
    cert_number         VARCHAR(200) NOT NULL,
    issuer              VARCHAR(255) NOT NULL,
    issue_date          DATE NOT NULL,
    expiry_date         DATE,
    scope               TEXT,
    document_url        VARCHAR(500),
    status              certification_status_enum NOT NULL DEFAULT 'Valid',
    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- scope ile bağlantı tutarlı olmalı
    CONSTRAINT chk_cert_scope_consistency CHECK (
        (cert_scope = 'product_type' AND product_type_id IS NOT NULL AND dpp_id IS NULL)
        OR
        (cert_scope = 'dpp_instance' AND dpp_id IS NOT NULL AND product_type_id IS NULL)
    )
);

COMMENT ON TABLE certifications IS 'CE İşareti, EN 10204, ISO sertifikaları vb. ürün tipine veya DPP bireyine bağlı';

COMMENT ON COLUMN certifications.cert_scope IS
    'product_type: Bu sertifika tüm ürün tipini kapsar (CE, ISO vb.)
     dpp_instance: Bu sertifika tek bir ürün bireyi içindir (EN 10204 3.1 vb.)
     Hangi FK kolununun dolu olduğunu ve nasıl sorgulanacağını netleştirir.';

-- =============================================================================
-- 6. SUPPLY CHAIN (Tedarik Zinciri)
-- DÜZ-3: supply_chain_stages.organization_id → ON DELETE RESTRICT
-- =============================================================================

CREATE TABLE supply_chain_organizations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(255) NOT NULL,
    role                VARCHAR(100),           -- e.g. 'Iron Ore Supplier', 'Manufacturer'
    location_text       VARCHAR(500),
    country_code        CHAR(2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE supply_chain_stages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dpp_id              UUID NOT NULL REFERENCES digital_product_passports(id) ON DELETE CASCADE,
    -- DÜZ-3: ON DELETE RESTRICT eklendi — organizasyon silinmeden önce stage'ler temizlenmeli
    organization_id     UUID NOT NULL,
    sequence_number     SMALLINT NOT NULL,
    stage_name          VARCHAR(200) NOT NULL,   -- e.g. 'Raw Material Sourcing', 'Steel Production'
    stage_date          DATE,
    traceability_id     UUID DEFAULT uuid_generate_v4(),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dpp_stage_seq UNIQUE (dpp_id, sequence_number),
    CONSTRAINT fk_scs_organization
        FOREIGN KEY (organization_id)
        REFERENCES supply_chain_organizations(id)
        ON DELETE RESTRICT
);

COMMENT ON CONSTRAINT fk_scs_organization ON supply_chain_stages IS
    'Bir organizasyon silinmek istenirse önce o organizasyona bağlı
     supply_chain_stages kayıtları silinmeli ya da başka organizasyona
     taşınmalıdır. Sessiz veri kaybını önler.';

CREATE TABLE supply_chain_materials (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id            UUID NOT NULL REFERENCES supply_chain_stages(id) ON DELETE CASCADE,
    material_name       VARCHAR(255) NOT NULL,
    quantity            NUMERIC(12,3),
    unit                VARCHAR(20),
    origin_country      VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE supply_chain_processes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id            UUID NOT NULL REFERENCES supply_chain_stages(id) ON DELETE CASCADE,
    process_name        VARCHAR(200) NOT NULL,   -- e.g. 'Melting', 'Hot Rolling'
    sequence_number     SMALLINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 7. LIFECYCLE EVENTS (Yaşam Döngüsü Olayları)
-- DÜZ-5: event_id kolonu kaldırıldı — id ile aynı işlevi görüyordu.
-- =============================================================================

CREATE TABLE lifecycle_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dpp_id              UUID NOT NULL REFERENCES digital_product_passports(id) ON DELETE CASCADE,
    -- event_id KALDIRILDI (DÜZ-5): id zaten UUID PK, ikinci UUID gereksizdi.
    stage               lifecycle_stage_enum NOT NULL,
    stage_label         VARCHAR(100),            -- Human-readable e.g. 'A1-A3: Production'
    event_type          event_type_enum NOT NULL,
    event_date          TIMESTAMPTZ NOT NULL,
    description         TEXT,
    location_text       VARCHAR(500),
    result              VARCHAR(100),            -- e.g. 'Passed', 'Failed'
    status              event_status_enum NOT NULL DEFAULT 'Completed',
    actor               VARCHAR(255),            -- Who performed the event
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE lifecycle_events IS
    'DPP yaşam döngüsü olay kaydı — üretim, kalite kontrol, nakliye vb.
     Değişmez log yapısı (INSERT only, UPDATE/DELETE yapılmamalı).
     Public event referansı için doğrudan id (UUID) kullanılır.
     event_id kolonu kaldırıldı — id ile aynı işlevi görüyordu.';

-- =============================================================================
-- 8. SECURITY & ACCESS CONTROL (Güvenlik ve Erişim Kontrolü)
-- DÜZ-4: stakeholders tablosu eklendi, dpp_access_policies genişletildi.
-- =============================================================================

-- DÜZ-4A: Paydaşlar tablosu
CREATE TABLE stakeholders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    -- Paydaş tipi: manufacturer, supplier, customer, regulator, recycler, public
    stakeholder_type VARCHAR(50) NOT NULL DEFAULT 'customer',
    contact_email   VARCHAR(255),
    api_key_hash    VARCHAR(255),   -- API erişimi için hash'lenmiş anahtar
    country_code    CHAR(2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stakeholders IS
    'DPP verilerine erişen paydaşlar: müşteriler, tedarikçiler, denetçiler vb.
     CIRPASS farklı paydaş tiplerine farklı erişim seviyesi öngörür.';

-- DÜZ-4B: Erişim politikaları (genişletildi)
CREATE TABLE dpp_access_policies (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_type_id     UUID REFERENCES product_types(id) ON DELETE CASCADE,
    -- DÜZ-4: Paydaşa özgü erişim
    stakeholder_id      UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
    access_level        access_level_enum NOT NULL DEFAULT 'public',
    custom_fields       TEXT[],     -- Bu paydaşa özel ek alanlar
    -- Access Control
    public_fields       TEXT[] DEFAULT ARRAY[
        'productIdentification',
        'technicalSpecifications',
        'environmentalImpact',
        'certifications',
        'lifecycle',
        'endOfLife'
    ],
    restricted_fields   TEXT[] DEFAULT ARRAY[
        'internalReferences',
        'detailedCosts',
        'customerList',
        '_batchNumber',
        '_serialNumber',
        '_productionOrderNumber'
    ],
    auth_method         VARCHAR(100) DEFAULT 'OAuth 2.0 / eIDAS 2.0',
    rate_limit_enabled  BOOLEAN DEFAULT TRUE,
    rate_limit_value    VARCHAR(50) DEFAULT '100 requests/hour per IP',
    rate_limit_purpose  TEXT DEFAULT 'DDoS and enumeration attack prevention',
    -- GDPR
    gdpr_compliant      BOOLEAN DEFAULT TRUE,
    data_minimization   BOOLEAN DEFAULT TRUE,
    right_to_be_forgotten BOOLEAN DEFAULT TRUE,
    data_retention      VARCHAR(100) DEFAULT '10 years minimum (ESPR requirement)',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- stakeholder_id NULL → herkese açık default policy
    CONSTRAINT uq_dap_product_stakeholder UNIQUE (product_type_id, stakeholder_id)
);

COMMENT ON TABLE dpp_access_policies IS
    'Ürün tipi başına erişim politikaları.
     stakeholder_id NULL → herkese açık default policy
     stakeholder_id dolu → o paydaşa özel policy (özel alanlar veya kısıtlamalar)
     CIRPASS farklı paydaş tiplerine farklı veri görünürlüğü gerektirir.';

-- API Rate Limiting Audit Log
CREATE TABLE api_access_log (
    id                  BIGSERIAL PRIMARY KEY,
    dpp_public_id       UUID,                   -- which DPP was accessed
    ip_address          INET,
    user_agent          TEXT,
    endpoint            VARCHAR(500),
    http_method         VARCHAR(10),
    response_code       SMALLINT,
    accessed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE api_access_log IS 'Audit log for DPP API access - supports rate limiting and anomaly detection';

-- =============================================================================
-- 9. DPP VERSION HISTORY / CHANGELOG (Sürüm Geçmişi)
-- =============================================================================

CREATE TABLE dpp_changelog (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dpp_id              UUID NOT NULL REFERENCES digital_product_passports(id) ON DELETE CASCADE,
    version             VARCHAR(20) NOT NULL,
    changed_by          VARCHAR(255),
    change_summary      TEXT,
    changed_fields      JSONB,           -- JSON diff of changed fields
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dpp_changelog IS 'Immutable version history for each DPP - required for CIRPASS compliance';

-- =============================================================================
-- 10. EU REGISTRY SYNC QUEUE (Eksik #5)
--     Dokümantasyondaki async queue, retry, status tracking yapısı.
-- =============================================================================

CREATE TABLE registry_sync_queue (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dpp_id              UUID NOT NULL REFERENCES digital_product_passports(id) ON DELETE CASCADE,
    status              registry_sync_status_enum NOT NULL DEFAULT 'pending',
    -- Registry bilgisi
    registry_endpoint   VARCHAR(500),
    registry_ref        VARCHAR(255),   -- Registry tarafından verilen referans ID
    -- Retry mekanizması
    attempt_count       SMALLINT NOT NULL DEFAULT 0,
    max_attempts        SMALLINT NOT NULL DEFAULT 5,
    last_attempt_at     TIMESTAMPTZ,
    next_retry_at       TIMESTAMPTZ,
    -- Sonuç
    response_code       SMALLINT,
    response_body       JSONB,
    error_message       TEXT,
    processed_at        TIMESTAMPTZ,
    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE registry_sync_queue IS
    'EU Registry entegrasyon kuyruğu.
     Async queue, retry ve status tracking ile compliance tarafındaki
     REGISTERED durumunu doğrudan destekler.';

CREATE INDEX idx_rsq_status      ON registry_sync_queue(status);
CREATE INDEX idx_rsq_dpp         ON registry_sync_queue(dpp_id);
CREATE INDEX idx_rsq_next_retry  ON registry_sync_queue(next_retry_at) WHERE status IN ('pending','retry');

-- =============================================================================
-- 11. KULLANICI VE KİMLİK YÖNETİMİ (Eksik #6)
--     users, api_keys, audit_logs tabloları
-- =============================================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id) ON DELETE RESTRICT,
    email           VARCHAR(255) NOT NULL UNIQUE,
    full_name       VARCHAR(255),
    role            user_role_enum NOT NULL DEFAULT 'viewer',
    password_hash   VARCHAR(255),           -- bcrypt/argon2 hash
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS
    'Sistem ve uygulama kullanıcıları.
     Admin panel, role-based erişim ve audit için temel tablo.';

CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
    key_hash        VARCHAR(255) NOT NULL UNIQUE,   -- SHA-256 hash; asıl anahtar saklanmaz
    key_prefix      VARCHAR(10) NOT NULL,           -- Kullanıcıya gösterilecek kısım (örn: 'koc_abc1')
    label           VARCHAR(100),
    scopes          TEXT[] DEFAULT ARRAY['read'],   -- 'read','write','admin'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at      TIMESTAMPTZ,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE api_keys IS
    'API erişim anahtarları. Asıl anahtar asla saklanmaz, yalnızca hash''i tutulur.
     stakeholders.api_key_hash yerine daha granüler ve güvenli yapı.';

CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,  -- 'CREATE_DPP','UPDATE_STATUS','DELETE',vb.
    resource_type   VARCHAR(100),           -- 'digital_product_passports','certifications',vb.
    resource_id     UUID,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      INET,
    user_agent      TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS
    'Değişmez denetim kaydı. Admin panel ve compliance için tüm veri değişiklikleri izlenir.';

CREATE INDEX idx_audit_user     ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_time     ON audit_logs(occurred_at DESC);
CREATE INDEX idx_users_company  ON users(company_id);
CREATE INDEX idx_apikeys_user   ON api_keys(user_id);

-- =============================================================================
-- 12. BACKUP SNAPSHOTS (Eksik #7)
--     Hash/checksum temelli yedek metadata yapısı
-- =============================================================================

CREATE TABLE backup_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dpp_id          UUID REFERENCES digital_product_passports(id) ON DELETE SET NULL,
    snapshot_type   VARCHAR(50) NOT NULL DEFAULT 'full',  -- 'full','incremental','json_ld'
    -- Storage
    storage_url     VARCHAR(500) NOT NULL,
    storage_backend VARCHAR(100) DEFAULT 'S3',   -- 'S3','Azure Blob','GCS'
    -- Integrity
    file_size_bytes BIGINT,
    checksum_sha256 VARCHAR(64),   -- Bütünlük doğrulama zinciri
    checksum_md5    VARCHAR(32),
    -- Metadata
    snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    notes           TEXT
);

COMMENT ON TABLE backup_snapshots IS
    'Timestamped backup metadata. Checksum ile integrity doğrulama zinciri.
     Audit edilebilir backup geçmişi. backup_primary_url/backup_secondary_url
     alanları yerine daha kapsamlı yapı.';

CREATE INDEX idx_backup_dpp  ON backup_snapshots(dpp_id);
CREATE INDEX idx_backup_time ON backup_snapshots(snapshot_at DESC);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- DPP lookups
CREATE INDEX idx_dpp_public_identifier     ON digital_product_passports(public_identifier);
CREATE INDEX idx_dpp_gtin                  ON digital_product_passports(gtin);
CREATE INDEX idx_dpp_gs1_serial            ON digital_product_passports(gs1_serial_number);
CREATE INDEX idx_dpp_product_type          ON digital_product_passports(product_type_id);
CREATE INDEX idx_dpp_production_date       ON digital_product_passports(production_date);
CREATE INDEX idx_dpp_batch                 ON digital_product_passports(_batch_number);

-- Product types
CREATE INDEX idx_pt_gtin                   ON product_types(gtin);
CREATE INDEX idx_pt_mfr_part_num           ON product_types(manufacturer_part_number);
CREATE INDEX idx_pt_steel_grade            ON product_types(steel_grade);

-- DÜZ-1: Yeni normalize tablolar için index
CREATE INDEX idx_chem_product_type         ON chemical_compositions(product_type_id);
CREATE INDEX idx_mech_product_type         ON mechanical_properties(product_type_id);

-- Lifecycle events
CREATE INDEX idx_le_dpp_id                 ON lifecycle_events(dpp_id);
CREATE INDEX idx_le_event_date             ON lifecycle_events(event_date);
CREATE INDEX idx_le_event_type             ON lifecycle_events(event_type);

-- Supply chain
CREATE INDEX idx_scs_dpp_id               ON supply_chain_stages(dpp_id);

-- DÜZ-2: cert_scope indeksi
CREATE INDEX idx_cert_scope               ON certifications(cert_scope);
CREATE INDEX idx_cert_product_type        ON certifications(product_type_id);
CREATE INDEX idx_cert_dpp                 ON certifications(dpp_id);
CREATE INDEX idx_cert_expiry              ON certifications(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_cert_status              ON certifications(status);

-- DÜZ-4: stakeholder ve access_level indeksleri
CREATE INDEX idx_dap_stakeholder          ON dpp_access_policies(stakeholder_id);
CREATE INDEX idx_dap_access_level         ON dpp_access_policies(access_level);
CREATE INDEX idx_stakeholder_type         ON stakeholders(stakeholder_type);

-- API access log (time-series optimized)
CREATE INDEX idx_api_log_dpp              ON api_access_log(dpp_public_id);
CREATE INDEX idx_api_log_ip               ON api_access_log(ip_address);
CREATE INDEX idx_api_log_time             ON api_access_log(accessed_at DESC);

-- Changelog
CREATE INDEX idx_changelog_dpp            ON dpp_changelog(dpp_id);
CREATE INDEX idx_changelog_time           ON dpp_changelog(changed_at DESC);

-- YENİ: JSONB GIN index — json_ld alanı üzerinde hızlı JSON sorgular (Eksik #8)
CREATE INDEX idx_dpp_json_ld_gin          ON digital_product_passports USING GIN (json_ld);

-- YENİ: Full-text search index (Eksik #8)
CREATE INDEX idx_dpp_search_vector        ON digital_product_passports USING GIN (search_vector);

-- YENİ: dpp_status index
CREATE INDEX idx_dpp_status               ON digital_product_passports(dpp_status);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Public DPP View (hides restricted internal fields)
-- DÜZ-1: Mekanik özellikler artık mechanical_properties JOIN'den geliyor
CREATE OR REPLACE VIEW vw_dpp_public AS
SELECT
    d.public_identifier,
    d.upi_url,
    d.gtin,
    d.gs1_serial_number,
    d.gs1_digital_link,
    d.dpp_version,
    d.dpp_standard,
    d.data_carrier_type,
    d.production_date,
    d.created_at,
    d.updated_at,
    -- Product Type Info
    pt.product_name,
    pt.product_type,
    pt.product_category,
    pt.product_model,
    pt.brand,
    pt.manufacturer_part_number,
    pt.steel_grade,
    pt.dimensional_standard,
    pt.material_standard,
    -- Dimensions
    pt.dim_height_mm,
    pt.dim_width_mm,
    pt.dim_web_thickness_mm,
    pt.dim_flange_thickness_mm,
    pt.dim_root_radius_mm,
    -- Geometric Properties
    pt.section_area_cm2,
    pt.weight_per_meter_kg,
    pt.moment_inertia_iy_cm4,
    pt.moment_inertia_iz_cm4,
    pt.section_modulus_wely_cm3,
    pt.section_modulus_welz_cm3,
    -- Mechanical Properties (DÜZ-1: normalize tablodan JOIN)
    mp.yield_strength_mpa,
    mp.tensile_strength_mpa,
    mp.elongation_pct,
    mp.impact_energy_j,
    mp.impact_temperature_c,
    -- Environmental
    pt.co2_cradle_to_gate_kg,
    pt.co2_production_kg,
    pt.recycled_content_pct,
    pt.recyclability_pct,
    pt.embodied_energy_mj_kg,
    pt.water_consumption_l_kg,
    pt.epd_number,
    pt.epd_url,
    pt.epd_valid_until,
    -- End of Life
    pt.dismantling_difficulty,
    pt.hazardous_materials,
    -- Manufacturer (public info only)
    m.name AS manufacturer_name,
    m.city AS manufacturer_city,
    m.country AS manufacturer_country,
    m.website AS manufacturer_website
    -- NOTE: _batch_number, _serial_number, _production_order_number are intentionally excluded
FROM digital_product_passports d
JOIN product_types pt  ON d.product_type_id = pt.id
JOIN manufacturers m   ON pt.manufacturer_id = m.id
LEFT JOIN mechanical_properties mp ON mp.product_type_id = pt.id
WHERE d.is_active = TRUE;

COMMENT ON VIEW vw_dpp_public IS
    'Public-safe DPP view - internal/restricted fields are excluded. Use this for API responses.
     v2.0.0: mechanical_properties JOIN eklendi (normalize edilmiş tablodan).';

-- Expiring Certifications Alert View
CREATE OR REPLACE VIEW vw_certifications_expiring AS
SELECT
    c.id,
    c.cert_type,
    c.cert_number,
    c.issuer,
    c.expiry_date,
    c.expiry_date - CURRENT_DATE AS days_until_expiry,
    c.status,
    c.cert_scope,
    pt.product_name,
    pt.manufacturer_part_number
FROM certifications c
LEFT JOIN product_types pt ON c.product_type_id = pt.id
WHERE c.expiry_date IS NOT NULL
  AND c.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
  AND c.status = 'Valid'
ORDER BY c.expiry_date ASC;

COMMENT ON VIEW vw_certifications_expiring IS 'Certifications expiring within 90 days';

-- DÜZ-1: Ürün tipini tüm normalize edilmiş verilerle getiren view
CREATE OR REPLACE VIEW v_product_type_full AS
SELECT
    pt.id,
    pt.product_name,
    pt.product_model,
    pt.product_category,
    pt.steel_grade,
    pt.manufacturer_part_number,
    pt.gtin,

    -- Boyutsal veriler
    pt.dim_height_mm,
    pt.dim_width_mm,
    pt.dim_web_thickness_mm,
    pt.dim_flange_thickness_mm,

    -- Geometrik özellikler
    pt.section_area_cm2,
    pt.weight_per_meter_kg,
    pt.moment_inertia_iy_cm4,
    pt.moment_inertia_iz_cm4,

    -- Çevresel veriler
    pt.co2_cradle_to_gate_kg,
    pt.recycled_content_pct,
    pt.recyclability_pct,

    -- Kimyasal kompozisyon (ayrı tablodan JOIN)
    cc.carbon_pct,
    cc.carbon_max_pct,
    cc.manganese_pct,
    cc.phosphorus_pct,
    cc.sulfur_pct,

    -- Mekanik özellikler (ayrı tablodan JOIN)
    mp.yield_strength_mpa,
    mp.yield_strength_min_mpa,
    mp.tensile_strength_mpa,
    mp.elongation_pct,
    mp.impact_energy_j,
    mp.impact_temperature_c

FROM product_types pt
LEFT JOIN chemical_compositions cc ON cc.product_type_id = pt.id
LEFT JOIN mechanical_properties mp ON mp.product_type_id = pt.id;

COMMENT ON VIEW v_product_type_full IS
    'Ürün tipi + kimyasal kompozisyon + mekanik özellikler birleşik görünümü.
     API endpoint''lerinde tekrarlayan JOIN yazmaktan kurtarır.';

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Rol oluştur (yoksa)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dpp_internal_role') THEN
    CREATE ROLE dpp_internal_role;
  END IF;
END $$ LANGUAGE plpgsql;

ALTER TABLE digital_product_passports ENABLE ROW LEVEL SECURITY;

-- Public role can only see active DPPs, never internal fields
CREATE POLICY dpp_public_read ON digital_product_passports
    FOR SELECT
    TO PUBLIC
    USING (is_active = TRUE);

-- Internal staff can see everything
CREATE POLICY dpp_internal_all ON digital_product_passports
    FOR ALL
    TO dpp_internal_role
    USING (TRUE);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- fn_update_timestamp zaten dosyanın başında tanımlandı (erken tanım).
-- Burada yeniden tanımlanmıyor.

CREATE TRIGGER trg_manufacturers_updated
    BEFORE UPDATE ON manufacturers
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_product_types_updated
    BEFORE UPDATE ON product_types
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_dpp_updated
    BEFORE UPDATE ON digital_product_passports
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_chemical_compositions_updated
    BEFORE UPDATE ON chemical_compositions
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_mechanical_properties_updated
    BEFORE UPDATE ON mechanical_properties
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- YENİ: search_vector otomatik güncelleme trigger'ı (Eksik #8)
CREATE OR REPLACE FUNCTION fn_dpp_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        coalesce(NEW.gs1_serial_number, '') || ' ' ||
        coalesce(NEW.gtin, '') || ' ' ||
        coalesce(NEW.dpp_version, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dpp_search_vector
    BEFORE INSERT OR UPDATE ON digital_product_passports
    FOR EACH ROW EXECUTE FUNCTION fn_dpp_search_vector();

-- Auto-log DPP changes to changelog
CREATE OR REPLACE FUNCTION fn_dpp_changelog()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO dpp_changelog (dpp_id, version, change_summary, changed_fields)
    VALUES (
        NEW.id,
        NEW.current_version,
        'DPP record updated',
        jsonb_build_object(
            'old', to_jsonb(OLD) - '_batch_number' - '_serial_number' - '_production_order_number',
            'new', to_jsonb(NEW) - '_batch_number' - '_serial_number' - '_production_order_number'
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dpp_changelog
    AFTER UPDATE ON digital_product_passports
    FOR EACH ROW EXECUTE FUNCTION fn_dpp_changelog();

-- Function: Lookup DPP by GS1 Digital Link serial
CREATE OR REPLACE FUNCTION fn_get_dpp_by_gs1_serial(p_serial VARCHAR)
RETURNS TABLE (public_identifier UUID, upi_url TEXT, gs1_digital_link TEXT)
AS $$
    SELECT public_identifier, upi_url, gs1_digital_link
    FROM digital_product_passports
    WHERE gs1_serial_number = p_serial AND is_active = TRUE;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================================================
-- SEED DATA: Kocaer Çelik A.Ş.
-- =============================================================================

-- YENİ: Company (multi-tenant — Eksik #1)
INSERT INTO companies (id, name, slug, plan, contact_email, country_code) VALUES
    ('f0000000-0000-4000-8000-000000000001', 'Kocaer Çelik A.Ş.', 'kocaer-celik', 'enterprise', 'info@kocaersteel.com', 'TR');

-- Manufacturer
INSERT INTO manufacturers (
    id, company_id, name,
    street, city, state, postal_code, country, country_code,
    latitude, longitude,
    email, phone, website, dpp_support_email,
    vat_number, eori_number, duns
) VALUES (
    'a1b2c3d4-0000-4000-8000-000000000001',
    'f0000000-0000-4000-8000-000000000001',
    'Kocaer Çelik A.Ş.',
    'Aliağa Organize Sanayi Bölgesi', 'Aliağa', 'İzmir', '35800', 'Turkey', 'TR',
    38.8008, 26.9719,
    'info@kocaersteel.com', '+90-232-XXX-XXXX', 'https://www.kocaersteel.com', 'dpp@kocaersteel.com',
    'TR1234567890', 'TR12345678900000', '123456789'
);

INSERT INTO manufacturer_certifications (manufacturer_id, certification_name) VALUES
    ('a1b2c3d4-0000-4000-8000-000000000001', 'ISO 9001:2015'),
    ('a1b2c3d4-0000-4000-8000-000000000001', 'ISO 14001:2015'),
    ('a1b2c3d4-0000-4000-8000-000000000001', 'ISO 45001:2018'),
    ('a1b2c3d4-0000-4000-8000-000000000001', 'EN 1090-1+A1');

-- Production Facility
INSERT INTO production_facilities (
    id, manufacturer_id, name, facility_code, location_text, latitude, longitude
) VALUES (
    'b1b2c3d4-0000-4000-8000-000000000001',
    'a1b2c3d4-0000-4000-8000-000000000001',
    'Kocaer Aliağa Plant', 'KCR-ALA-01',
    'Aliağa, İzmir, Turkey', 38.8008, 26.9719
);

-- Supply Chain Organizations
INSERT INTO supply_chain_organizations (id, name, role, location_text, country_code)
VALUES (
    'c1b2c3d4-0000-4000-8000-000000000001',
    'Erdemir Steel', 'Iron Ore Supplier', 'Ereğli, Turkey', 'TR'
);

INSERT INTO supply_chain_organizations (id, name, role, location_text, country_code)
VALUES (
    'c1b2c3d4-0000-4000-8000-000000000002',
    'Kocaer Çelik', 'Manufacturer', 'Aliağa, İzmir, Turkey', 'TR'
);

-- Product Type: IPE 100 S275JR
-- DÜZ-1: Kimyasal ve mekanik kolonlar INSERT'ten çıkarıldı
INSERT INTO product_types (
    id, manufacturer_id,
    product_name, product_model, product_type, product_category, brand, manufacturer_part_number, gtin,
    dimensional_standard, material_standard, steel_grade,
    dim_height_mm, dim_height_tolerance,
    dim_width_mm, dim_width_tolerance,
    dim_web_thickness_mm, dim_web_tolerance,
    dim_flange_thickness_mm, dim_flange_tolerance,
    dim_root_radius_mm, dim_root_tolerance,
    section_area_cm2, weight_per_meter_kg,
    moment_inertia_iy_cm4, moment_inertia_iz_cm4,
    section_modulus_wely_cm3, section_modulus_welz_cm3,
    radius_gyration_iy_cm, radius_gyration_iz_cm,
    standard_length_m, available_lengths, custom_length_available,
    heat_treatment, surface_condition,
    epd_number, epd_url, epd_valid_until,
    co2_cradle_to_gate_kg, co2_production_kg, co2_transport_kg,
    embodied_energy_mj_kg, water_consumption_l_kg,
    recycled_content_pct, recyclability_pct,
    dismantling_difficulty, hazardous_materials, hazardous_declaration,
    technical_drawing_url, model_3d_url
) VALUES (
    'd1b2c3d4-0000-4000-8000-000000000001',
    'a1b2c3d4-0000-4000-8000-000000000001',
    'IPE 100', 'IPE 100 - Standard European I-Beam', 'Steel Profile', 'Structural Steel',
    'Kocaer', 'KCR-IPE100-S275JR', '8691234567890',
    'EN 10034:1993', 'EN 10025-2:2019', 'S275JR',
    100, '±2.0', 55, '±1.5', 4.1, '±0.3', 5.7, '±0.4', 7, '±1.0',
    10.32, 8.1,
    171, 15.9, 34.2, 5.79, 4.07, 1.24,
    12, ARRAY['6m','9m','12m'], TRUE,
    'Hot Rolled', 'Shot Blasted and Primed',
    'EPD-TR-2024-001-EN', 'https://dpp.kocaersteel.com/docs/epd/IPE100_EPD.pdf', '2027-01-10',
    1.85, 0.45, 0.08, 25.5, 2.5,
    35, 100,
    'Easy', FALSE,
    'No hazardous materials present. Compliant with REACH Regulation.',
    'https://dpp.kocaersteel.com/docs/ipe100/drawing.pdf',
    'https://dpp.kocaersteel.com/models/ipe100/model.step'
);

-- Product Type: Köşebent 100x100x10 S355JR
-- DÜZ-1: Kimyasal ve mekanik kolonlar INSERT'ten çıkarıldı
INSERT INTO product_types (
    id, manufacturer_id,
    product_name, product_model, product_type, product_category, brand, manufacturer_part_number, gtin,
    dimensional_standard, material_standard, steel_grade,
    dim_height_mm, dim_height_tolerance,
    dim_width_mm, dim_width_tolerance,
    dim_web_thickness_mm, dim_web_tolerance,
    dim_flange_thickness_mm, dim_flange_tolerance,
    dim_root_radius_mm, dim_root_tolerance,
    section_area_cm2, weight_per_meter_kg,
    moment_inertia_iy_cm4, moment_inertia_iz_cm4,
    section_modulus_wely_cm3, section_modulus_welz_cm3,
    radius_gyration_iy_cm, radius_gyration_iz_cm,
    standard_length_m, available_lengths, custom_length_available,
    heat_treatment, surface_condition,
    epd_number, epd_url, epd_valid_until,
    co2_cradle_to_gate_kg, co2_production_kg, co2_transport_kg,
    embodied_energy_mj_kg, water_consumption_l_kg,
    recycled_content_pct, recyclability_pct,
    dismantling_difficulty, hazardous_materials, hazardous_declaration,
    technical_drawing_url, model_3d_url
) VALUES (
    'd1b2c3d4-0000-4000-8000-000000000002',
    'a1b2c3d4-0000-4000-8000-000000000001',
    'Köşebent 100x100x10.00', 'Equal Angle 100x100x10.00 S355JR', 'Steel Angle Profile', 'Structural Steel',
    'Kocaer', 'KCR-ANG100X100X10-S355JR', '8691234567996',
    'EN 10056-1:2017', 'EN 10025-2:2019', 'S355JR',
    100, '±1.5', 100, '±1.5', 10.0, '±0.5', 10.0, '±0.5', 12, '±1.0',
    19.0, 14.9,
    182.0, 182.0, 25.7, 25.7, 3.1, 3.1,
    12, ARRAY['6m','9m','12m'], TRUE,
    'Hot Rolled', 'Hot Rolled - Mill Finish',
    'EPD-TR-2024-017-EN', 'https://dpp.kocaersteel.com/docs/epd/ANGLE100X100X10_EPD.pdf', '2027-02-01',
    1.78, 0.42, 0.08, 24.3, 2.2,
    38, 100,
    'Easy', FALSE,
    'No hazardous materials present. Compliant with REACH Regulation.',
    'https://dpp.kocaersteel.com/docs/angle100x100x10/drawing.pdf',
    'https://dpp.kocaersteel.com/models/angle100x100x10/model.step'
);

-- DÜZ-1: IPE 100 kimyasal kompozisyon (yeni tabloya)
INSERT INTO chemical_compositions (
    product_type_id,
    carbon_pct, carbon_max_pct,
    silicon_pct, silicon_max_pct,
    manganese_pct, manganese_max_pct,
    phosphorus_pct, phosphorus_max_pct,
    sulfur_pct, sulfur_max_pct,
    nitrogen_pct, nitrogen_max_pct,
    reference_standard
) VALUES (
    'd1b2c3d4-0000-4000-8000-000000000001',
    0.18, 0.21,
    0.25, 0.55,
    1.35, 1.50,
    0.022, 0.030,
    0.018, 0.030,
    0.009, 0.012,
    'EN 10025-2:2019'
);

-- DÜZ-1: IPE 100 mekanik özellikler (yeni tabloya)
INSERT INTO mechanical_properties (
    product_type_id,
    yield_strength_mpa, yield_strength_min_mpa,
    tensile_strength_mpa, tensile_strength_min_mpa, tensile_strength_max_mpa,
    elongation_pct, elongation_min_pct,
    impact_energy_j, impact_temperature_c,
    reference_standard
) VALUES (
    'd1b2c3d4-0000-4000-8000-000000000001',
    285, 275,
    450, 410, 560,
    25, 23,
    27, -20,
    'EN 10025-2:2019'
);

-- DÜZ-1: Köşebent 100x100x10 kimyasal kompozisyon (yeni tabloya)
INSERT INTO chemical_compositions (
    product_type_id,
    carbon_pct, carbon_max_pct,
    silicon_pct, silicon_max_pct,
    manganese_pct, manganese_max_pct,
    phosphorus_pct, phosphorus_max_pct,
    sulfur_pct, sulfur_max_pct,
    nitrogen_pct, nitrogen_max_pct,
    reference_standard
) VALUES (
    'd1b2c3d4-0000-4000-8000-000000000002',
    0.19, 0.24,
    0.30, 0.55,
    1.45, 1.60,
    0.022, 0.030,
    0.018, 0.030,
    0.009, 0.012,
    'EN 10025-2:2019'
);

-- DÜZ-1: Köşebent 100x100x10 mekanik özellikler (yeni tabloya)
INSERT INTO mechanical_properties (
    product_type_id,
    yield_strength_mpa, yield_strength_min_mpa,
    tensile_strength_mpa, tensile_strength_min_mpa, tensile_strength_max_mpa,
    elongation_pct, elongation_min_pct,
    impact_energy_j, impact_temperature_c,
    reference_standard
) VALUES (
    'd1b2c3d4-0000-4000-8000-000000000002',
    370, 355,
    530, 470, 630,
    24, 22,
    27, 20,
    'EN 10025-2:2019'
);

-- DÜZ-2: Certifications — cert_scope zorunlu olarak eklendi
-- product_type_id dolu olanlar → 'product_type', dpp_id dolu olanlar → 'dpp_instance'

-- Certifications for IPE 100
INSERT INTO certifications (product_type_id, cert_scope, cert_type, cert_number, issuer, issue_date, expiry_date, scope, document_url, status)
VALUES
    ('d1b2c3d4-0000-4000-8000-000000000001', 'product_type', 'CE Marking',        'CE-TR-2024-001',      'Turkish Standards Institution', '2024-01-10', '2027-01-10', 'EN 1090-1+A1', 'https://dpp.kocaersteel.com/certs/CE_Marking.pdf', 'Valid'),
    ('d1b2c3d4-0000-4000-8000-000000000001', 'product_type', 'EN 10204 3.1 Certificate', '3.1-20240115-001', 'Kocaer Quality Department',  '2024-01-15', NULL,         'Material Properties and Chemical Analysis', 'https://dpp.kocaersteel.com/certs/Certificate_3.1.pdf', 'Valid'),
    ('d1b2c3d4-0000-4000-8000-000000000001', 'product_type', 'ISO 9001:2015',     'ISO9001-TR-2023-456', 'TÜV SÜD',                       '2023-06-15', '2026-06-15', 'Quality Management System', NULL, 'Valid');

-- Certifications for Köşebent
INSERT INTO certifications (product_type_id, cert_scope, cert_type, cert_number, issuer, issue_date, expiry_date, scope, document_url, status)
VALUES
    ('d1b2c3d4-0000-4000-8000-000000000002', 'product_type', 'CE Marking',        'CE-TR-2024-017',      'Turkish Standards Institution', '2024-01-10', '2027-01-10', 'EN 1090-1+A1', 'https://dpp.kocaersteel.com/certs/ANGLE100X100X10_CE_Marking.pdf', 'Valid'),
    ('d1b2c3d4-0000-4000-8000-000000000002', 'product_type', 'EN 10204 3.1 Certificate', '3.1-20240205-017', 'Kocaer Quality Department',  '2024-01-15', NULL,         'Material Properties and Chemical Analysis', 'https://dpp.kocaersteel.com/certs/ANGLE100X100X10_3.1.pdf', 'Valid'),
    ('d1b2c3d4-0000-4000-8000-000000000002', 'product_type', 'ISO 9001:2015',     'ISO9001-TR-2023-456', 'TÜV SÜD',                       '2023-06-15', '2026-06-15', 'Quality Management System', NULL, 'Valid');

-- DPP Access Policies (default public policy, stakeholder_id NULL)
INSERT INTO dpp_access_policies (product_type_id) VALUES
    ('d1b2c3d4-0000-4000-8000-000000000001'),
    ('d1b2c3d4-0000-4000-8000-000000000002');

-- =============================================================================
-- SAMPLE DPP INSTANCES (IPE 100 - 10 adet)
-- DÜZ-6: _batch_number formatı YYYYMMDD-NNN olarak düzeltildi
-- =============================================================================

INSERT INTO digital_product_passports (
    public_identifier, product_type_id, gtin, gs1_serial_number,
    production_facility_id, production_date, production_line, shift,
    _batch_number, _serial_number
) VALUES
    ('a96ef72a-1e37-4e37-9b22-e6da0aa77762','d1b2c3d4-0000-4000-8000-000000000001','8691234567890','XR5UDU6UK63K','b1b2c3d4-0000-4000-8000-000000000001','2024-01-15','Line 3 - IPE Profile Production','Day Shift A','20240115-001','IPE100-2024-B001-001'),
    ('75aeb5f4-fe41-467a-a4e5-92a461481692','d1b2c3d4-0000-4000-8000-000000000001','8691234567890','ZQUJKUMRRDEU','b1b2c3d4-0000-4000-8000-000000000001','2024-01-16','Line 3 - IPE Profile Production','Day Shift A','20240116-002','IPE100-2024-B002-001'),
    ('a69c9bc7-cfb1-4fe4-a495-b3bd8d327a2c','d1b2c3d4-0000-4000-8000-000000000001','8691234567890','Y8JK4R2UXMWX','b1b2c3d4-0000-4000-8000-000000000001','2024-01-17','Line 3 - IPE Profile Production','Day Shift A','20240117-003','IPE100-2024-B003-001'),
    ('95dad3b2-d38c-4612-8426-f320d321eea5','d1b2c3d4-0000-4000-8000-000000000001','8691234567890','L9UWH8VEXYH2','b1b2c3d4-0000-4000-8000-000000000001','2024-01-18','Line 3 - IPE Profile Production','Day Shift A','20240118-004','IPE100-2024-B004-001'),
    ('4f6fc8f8-0445-4ccb-be2b-eb99aee8b286','d1b2c3d4-0000-4000-8000-000000000001','8691234567890','8DEJQKYQ4L4F','b1b2c3d4-0000-4000-8000-000000000001','2024-02-19','Line 3 - IPE Profile Production','Day Shift A','20240219-005','IPE100-2024-B005-001'),
    ('c3180a79-bb24-4433-ad37-f78a466d257b','d1b2c3d4-0000-4000-8000-000000000001','8691234567890','X8PZJGZRFU3T','b1b2c3d4-0000-4000-8000-000000000001','2024-02-20','Line 3 - IPE Profile Production','Day Shift A','20240220-006','IPE100-2024-B006-001'),
    ('a5fb1839-55fe-4de0-8628-407d54f253c1','d1b2c3d4-0000-4000-8000-000000000001','8691234567890','P2FLQCFKDU9H','b1b2c3d4-0000-4000-8000-000000000001','2024-02-21','Line 3 - IPE Profile Production','Day Shift A','20240221-007','IPE100-2024-B007-001'),
    ('858dfc94-daa6-4bc3-9e56-0ac074e81ce0','d1b2c3d4-0000-4000-8000-000000000001','8691234567890','LGWEDGUKXFB3','b1b2c3d4-0000-4000-8000-000000000001','2024-02-22','Line 3 - IPE Profile Production','Day Shift A','20240222-008','IPE100-2024-B008-001'),
    ('d09701dd-f168-47fe-90d6-238caa4cdb34','d1b2c3d4-0000-4000-8000-000000000001','8691234567890','66TPC4WUKCNH','b1b2c3d4-0000-4000-8000-000000000001','2024-03-23','Line 3 - IPE Profile Production','Day Shift A','20240323-009','IPE100-2024-B009-001'),
    ('8b563924-bb97-4950-81f0-9c4ad2569a5c','d1b2c3d4-0000-4000-8000-000000000001','8691234567890','JYSRXPZZKKGQ','b1b2c3d4-0000-4000-8000-000000000001','2024-03-24','Line 3 - IPE Profile Production','Day Shift A','20240324-010','IPE100-2024-B010-001');

-- =============================================================================
-- SAMPLE DPP INSTANCES (Köşebent - 5 adet)
-- DÜZ-6: _batch_number zaten doğru formatta (YYYYMMDD-NNN), değişiklik gerekmedi
-- =============================================================================

INSERT INTO digital_product_passports (
    public_identifier, product_type_id, gtin, gs1_serial_number,
    production_facility_id, production_date, production_line, shift,
    _batch_number, _serial_number
) VALUES
    ('7e03729a-2ded-4f02-b969-62d2faaf2d1a','d1b2c3d4-0000-4000-8000-000000000002','8691234567996','ER824JUQA2XG','b1b2c3d4-0000-4000-8000-000000000001','2024-02-05','Line 2 - Angle Profile Production','Night Shift B','20240205-001','ANG100X100X10-2024-B001-001'),
    ('efb63ca6-db79-436f-b4ea-e5abb34f816c','d1b2c3d4-0000-4000-8000-000000000002','8691234567996','DEULQV80WPR6','b1b2c3d4-0000-4000-8000-000000000001','2024-02-06','Line 2 - Angle Profile Production','Night Shift B','20240206-002','ANG100X100X10-2024-B002-001'),
    ('d0314001-b00c-4367-a263-e8c6a3d0670a','d1b2c3d4-0000-4000-8000-000000000002','8691234567996','GCKPRU0QZDYY','b1b2c3d4-0000-4000-8000-000000000001','2024-02-07','Line 2 - Angle Profile Production','Night Shift B','20240207-003','ANG100X100X10-2024-B003-001'),
    ('f9762f8f-33a3-473f-aa01-d37b912e8354','d1b2c3d4-0000-4000-8000-000000000002','8691234567996','SALGNP7IF0EZ','b1b2c3d4-0000-4000-8000-000000000001','2024-02-08','Line 2 - Angle Profile Production','Night Shift B','20240208-004','ANG100X100X10-2024-B004-001'),
    ('1f53d8cf-a278-449a-8693-e695df54be48','d1b2c3d4-0000-4000-8000-000000000002','8691234567996','ADTX3EF4KJ6H','b1b2c3d4-0000-4000-8000-000000000001','2024-02-09','Line 2 - Angle Profile Production','Night Shift B','20240209-005','ANG100X100X10-2024-B005-001');

-- =============================================================================
-- SAMPLE LIFECYCLE EVENTS (IPE 100 - first DPP)
-- DÜZ-5: event_id kolonu kaldırıldığı için INSERT'te yer almıyor
-- =============================================================================
INSERT INTO lifecycle_events (dpp_id, stage, stage_label, event_type, event_date, description, location_text, status)
VALUES
    ((SELECT id FROM digital_product_passports WHERE public_identifier = 'a96ef72a-1e37-4e37-9b22-e6da0aa77762'),
     'A1-A3', 'A1-A3: Production', 'Manufacturing', '2024-01-15T10:30:00Z',
     'Steel profile manufactured according to EN 10034', 'Aliağa, İzmir, Turkey', 'Completed'),
    ((SELECT id FROM digital_product_passports WHERE public_identifier = 'a96ef72a-1e37-4e37-9b22-e6da0aa77762'),
     'A3', 'A3: Quality Control', 'Quality Check', '2024-01-15T14:45:00Z',
     'Dimensional and material testing completed successfully', 'Aliağa, İzmir, Turkey', 'Completed');

INSERT INTO supply_chain_stages (dpp_id, organization_id, sequence_number, stage_name, stage_date)
VALUES
    ((SELECT id FROM digital_product_passports WHERE public_identifier = 'a96ef72a-1e37-4e37-9b22-e6da0aa77762'),
     'c1b2c3d4-0000-4000-8000-000000000001', 1, 'Raw Material Sourcing', '2023-12-20'),
    ((SELECT id FROM digital_product_passports WHERE public_identifier = 'a96ef72a-1e37-4e37-9b22-e6da0aa77762'),
     'c1b2c3d4-0000-4000-8000-000000000002', 2, 'Steel Production', '2024-01-15');


-- =============================================================================
-- END OF SCHEMA — v3.0.0
-- Değişiklikler (v2→v3):
--   YENİ #1 : companies tablosu — multi-tenant SaaS yapısı
--   YENİ #2 : digital_product_passports.json_ld JSONB + GIN index
--   YENİ #3 : digital_product_passports.html_content TEXT
--   YENİ #4 : dpp_status_enum (draft/active/deactivated/registered) + dpp_status kolonu
--   YENİ #5 : registry_sync_queue tablosu — EU Registry async queue & retry
--   YENİ #6 : users, api_keys, audit_logs tabloları — kimlik & yetkilendirme
--   YENİ #7 : backup_snapshots tablosu — checksum temelli yedek metadata
--   YENİ #8 : search_vector TSVECTOR + GIN index + pg_trgm + trigger
--   DÜZ     : fn_update_timestamp erken tanıma taşındı (companies trigger bağımlılığı)
-- =============================================================================
