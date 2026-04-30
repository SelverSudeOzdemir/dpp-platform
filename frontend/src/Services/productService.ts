// src/services/productService.ts

// ─── BACKEND HAM VERİ MODELİ ─────────────────────────────────────────────────
// Backend API'den gelen field isimleri burada tanımlanır.
// Frontend hiçbir zaman bu interface'e doğrudan dokunmaz — sadece mapper kullanır.
export interface BackendProduct {
  // 1. Temel Kimlik (Product)
  id: string;
  name: string;
  category: string;
  gtin?: string;
  batch_number?: string;
  material_standard?: string;
  steel_grade?: string;
  weight_per_meter?: number;
  dimensions?: string;
  production_date?: string;

  // 2. DPP / Sürdürülebilirlik
  version?: string;
  status?: string;
  carbon_footprint?: number;
  recycled_content?: number;
  recyclability?: number;
  svhc_free?: boolean;
  disposal_instructions?: string;
  dismantling_difficulty?: string;
  issued_at?: string;
  valid_until?: string;

  // 3. Üretici & Tesis
  manufacturer?: {
    name?: string;
    tax_id?: string;
    contact_email?: string;
    website?: string;
    country?: string;
    city?: string;
    address?: string;
  };
  facility?: {
    name?: string;
    gln_code?: string;
    country?: string;
    city?: string;
    address?: string;
  };

  // 4. Tedarik Zinciri
  supply_chain?: Array<{
    sequence_number: number;
    stage_name: string;
    organization_name?: string;
    organization_role?: string;
    location?: string;
    country_code?: string;
    material_name?: string;
    quantity?: number;
    unit?: string;
    process_name?: string;
    stage_date?: string;
    traceability_id?: string;
  }>;

  // 5. Sertifikalar
  certifications?: Array<{
    cert_type: string;
    issuer?: string;
    cert_number?: string;
    issue_date?: string;
    expiry_date?: string;
    document_url?: string;
  }>;

  // 6. Yaşam Döngüsü Olayları
  lifecycle_events?: Array<{
    event_type: string;
    event_date: string;
    description?: string;
    performed_by?: string;
    location?: string;
  }>;
}

// ─── MAPPER: Backend → Frontend ──────────────────────────────────────────────
// Tüm alan adı dönüşümleri bu tek fonksiyonda yönetilir.
// ERP, SAP veya farklı bir kaynak eklendiğinde sadece burası değişir.
export function mapBackendProduct(raw: BackendProduct): Product {
  return {
    // Kimlik
    id: raw.id,
    status: (raw.status === 'ACTIVE' ? 'Aktif' : raw.status === 'DRAFT' ? 'Taslak' : 'Arşiv') as Product['status'],
    createdAt: raw.issued_at ? new Date(raw.issued_at).toLocaleDateString('tr-TR') : '',

    // Temel bilgiler (name → product_name, category → product_category)
    product_name: raw.name,
    product_category: raw.category as Product['product_category'],
    gtin: raw.gtin,
    batch_number: raw.batch_number,
    material_standard: raw.material_standard,
    steel_grade: raw.steel_grade as Product['steel_grade'],
    weight_per_meter_kg: raw.weight_per_meter,
    dimensions: raw.dimensions,
    production_date: raw.production_date,

    // DPP verileri (carbon_footprint → co2_cradle_to_gate_kg vb.)
    version: raw.version,
    co2_cradle_to_gate_kg: raw.carbon_footprint,
    recycled_content_pct: raw.recycled_content,
    recyclability_pct: raw.recyclability,
    hazardous_materials: raw.svhc_free === undefined ? undefined : !raw.svhc_free, // svhc_free=true → hazardous=false
    disposal_instructions: raw.disposal_instructions,
    dismantling_difficulty: raw.dismantling_difficulty,
    issued_at: raw.issued_at,
    valid_until: raw.valid_until,

    // Üretici (contact_email → dpp_support_email)
    manufacturer: raw.manufacturer ? {
      name: raw.manufacturer.name,
      tax_id: raw.manufacturer.tax_id,
      dpp_support_email: raw.manufacturer.contact_email,
      website: raw.manufacturer.website,
      country: raw.manufacturer.country,
      city: raw.manufacturer.city,
      address: raw.manufacturer.address,
    } : undefined,

    // Tesis
    facility: raw.facility ? {
      name: raw.facility.name,
      gln_code: raw.facility.gln_code,
      country: raw.facility.country,
      city: raw.facility.city,
      address: raw.facility.address,
    } : undefined,

    // Tedarik zinciri (organization_name/role → object formatına)
    supply_chain: raw.supply_chain?.map(stage => ({
      sequence_number: stage.sequence_number,
      stage_name: stage.stage_name,
      stage_date: stage.stage_date,
      traceability_id: stage.traceability_id,
      organization: {
        name: stage.organization_name,
        role: stage.organization_role,
        location_text: stage.location,
        country_code: stage.country_code,
      },
      material: {
        name: stage.material_name,
        quantity: String(stage.quantity ?? ''),
        unit: stage.unit,
      },
      process: { name: stage.process_name },
    })),

    // Sertifikalar
    certifications: raw.certifications?.map(cert => ({
      cert_type: cert.cert_type,
      issuer: cert.issuer,
      cert_number: cert.cert_number,
      issue_date: cert.issue_date,
      expiry_date: cert.expiry_date,
      document_url: cert.document_url,
    })),

    // Yaşam döngüsü
    lifecycle_events: raw.lifecycle_events,
  };
}

export type ProductCategory = "Structural Steel" | "Flat Products" | "Long Products" | "Tubes and Pipes";
export type SteelGrade = "S235JR" | "S275JR" | "S275J0" | "S275J2" | "S355JR" | "S355J0" | "S355J2" | "S355K2" | "S420" | "S460";
export type HeatTreatment = "Hot Rolled" | "Cold Rolled" | "Normalized" | "Quenched and Tempered" | "Thermomechanically Rolled";
export type SurfaceCondition = "Hot Rolled - Mill Finish" | "Shot Blasted and Primed" | "Galvanized" | "Painted" | "Coated";

// ─── ALT MODELLER ────────────────────────────────────────────────────────
export interface ChemicalComposition {
  carbon_pct: number;
  silicon_pct: number;
  manganese_pct: number;
  phosphorus_pct: number;
  sulfur_pct: number;
  nitrogen_pct: number;
  reference_standard?: string;
}

export interface MechanicalProperties {
  yield_strength_mpa: number;
  tensile_strength_mpa: number;
  elongation_pct: number;
  impact_energy_j?: number;
  impact_temperature_c?: number;
  reference_standard?: string;
}

// ─── ANA ÜRÜN MODELİ (ProductType) ───────────────────────────────────────
export interface Product {
  // Frontend'e Özel Durumlar
  id: string;
  status: 'Aktif' | 'Taslak' | 'Arşiv';
  createdAt: string;

  // Kimlik ve Temel Bilgiler
  product_name: string;
  product_category: ProductCategory;
  brand?: string;
  gtin?: string;
  batch_number?: string;
  dimensions?: string;
  manufacturer_part_number?: string;

  // Standartlar
  dimensional_standard?: string;
  material_standard?: string;
  steel_grade?: SteelGrade;

  // Geometri
  weight_per_meter_kg?: number;
  section_area_cm2?: number;
  standard_length_m?: number;
  production_date?: string;

  // İşlem
  heat_treatment?: HeatTreatment;
  surface_condition?: SurfaceCondition;

  // DPP Yaşam Döngüsü
  version?: string;
  issued_at?: string;
  valid_until?: string;

  // Çevresel ve Sürdürülebilirlik
  epd_number?: string;
  epd_url?: string;
  co2_cradle_to_gate_kg?: number;
  water_consumption_l_kg?: number;
  recycled_content_pct?: number;
  recyclability_pct?: number;
  hazardous_materials?: boolean;
  disposal_instructions?: string;
  dismantling_difficulty?: string;

  // Üretici & Tesis
  manufacturer?: {
    name?: string;
    tax_id?: string;
    dpp_support_email?: string;
    website?: string;
    country?: string;
    city?: string;
    address?: string;
  };
  facility?: {
    name?: string;
    gln_code?: string;
    country?: string;
    city?: string;
    address?: string;
  };

  // Tedarik Zinciri
  supply_chain?: Array<{
    sequence_number: number;
    stage_name: string;
    stage_date?: string;
    traceability_id?: string;
    organization: { name?: string; role?: string; location_text?: string; country_code?: string };
    material: { name?: string; quantity?: string; unit?: string };
    process: { name?: string };
  }>;

  // Sertifikalar
  certifications?: Array<{
    cert_type: string;
    issuer?: string;
    cert_number?: string;
    issue_date?: string;
    expiry_date?: string;
    document_url?: string;
  }>;

  // Yaşam Döngüsü Olayları
  lifecycle_events?: Array<{
    event_type: string;
    event_date: string;
    description?: string;
    performed_by?: string;
    location?: string;
  }>;

  // İlişkiler (teknik)
  chemical_composition?: ChemicalComposition;
  mechanical_properties?: MechanicalProperties;
}

const STORAGE_KEY = 'kocaer_dpp_v3';

const INITIAL_DATA: Product[] = [
  { 
    id: 'KCR-742', 
    status: 'Aktif', 
    createdAt: '10.03.2026',
    
    product_name: 'IPE 200 Yapısal Çelik Profil', 
    product_category: 'Structural Steel', 
    brand: 'Kocaer Çelik',
    gtin: '08691234567890',
    steel_grade: 'S275JR',
    dimensional_standard: 'EN 10365',
    material_standard: 'EN 10025-2',
    weight_per_meter_kg: 22.4,
    section_area_cm2: 28.5,
    surface_condition: 'Galvanized',
    
    // Sürdürülebilirlik
    co2_cradle_to_gate_kg: 1.15, // 1 kg çelik için 1.15 kg CO2
    recycled_content_pct: 85.5,
    recyclability_pct: 100,
    epd_number: 'EPD-KCR-2023-01',
    
    // Kimyasal Değerler
    chemical_composition: {
      carbon_pct: 0.21,
      silicon_pct: 0.15,
      manganese_pct: 1.50,
      phosphorus_pct: 0.035,
      sulfur_pct: 0.035,
      nitrogen_pct: 0.012
    },
    
    // Mekanik Değerler
    mechanical_properties: {
      yield_strength_mpa: 275,
      tensile_strength_mpa: 410,
      elongation_pct: 22,
      impact_energy_j: 27,
      impact_temperature_c: 20
    }
  }
];

export const productService = {
  // 1. Tüm ürünleri listele (Dashboard için)
  getProducts: async (): Promise<Product[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = localStorage.getItem(STORAGE_KEY);
        resolve(data ? JSON.parse(data) : INITIAL_DATA);
      }, 600);
    });
  },

  // 2. İŞTE EKSİK OLAN FONKSİYON: Sadece istenen ID'ye sahip ürünü getir (Detay sayfası için)
  getProductById: async (id: string): Promise<Product | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = localStorage.getItem(STORAGE_KEY);
        // Data varsa parse et, yoksa INITIAL_DATA'yı kullan
        const products: Product[] = data ? JSON.parse(data) : INITIAL_DATA; 
        const product = products.find(p => p.id === id);
        resolve(product || null); // Bulursa ürünü, bulamazsa null döner
      }, 500);
    });
  },

  // 3. Yeni ürün oluştur
  createProduct: async (payload: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = localStorage.getItem(STORAGE_KEY);
        const products = data ? JSON.parse(data) : INITIAL_DATA;
        const newProduct = {
          ...payload,
          id: `KCR-${Math.floor(100 + Math.random() * 900)}`,
          createdAt: new Date().toLocaleDateString('tr-TR'),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...products, newProduct]));
        resolve(newProduct);
      }, 800);
    });
  },

  // 4. Ürün sil
  deleteProduct: async (id: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const products: Product[] = JSON.parse(data);
          const filtered = products.filter(p => p.id !== id);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
        resolve();
      }, 500);
    });
  }
};