// src/Services/productService.ts
// localStorage → gerçek backend API

import { apiGetDpps, apiGetDppById, apiDeleteDpp, apiCreateDpp } from "../lib/api";

// ─── Backend'den gelen ham veri modeli ───────────────────────────────────────
// (backend/app/modules/dpp/schemas.py → DppListItem ile uyumlu)
export interface BackendProduct {
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
  manufacturer?: {
    name?: string; tax_id?: string; contact_email?: string;
    website?: string; country?: string; city?: string; address?: string;
  };
  facility?: {
    name?: string; gln_code?: string; country?: string;
    city?: string; address?: string;
  };
  supply_chain?: Array<{
    sequence_number: number; stage_name: string;
    organization_name?: string; organization_role?: string;
    location?: string; country_code?: string;
    material_name?: string; quantity?: number; unit?: string;
    process_name?: string; stage_date?: string; traceability_id?: string;
  }>;
  certifications?: Array<{
    cert_type: string; issuer?: string; cert_number?: string;
    issue_date?: string; expiry_date?: string; document_url?: string;
  }>;
  lifecycle_events?: Array<{
    event_type: string; event_date: string;
    description?: string; performed_by?: string; location?: string;
  }>;
}

// ─── Status dönüşümü: backend büyük harf → frontend Türkçe ─────────────────
function mapStatus(raw?: string): Product["status"] {
  switch (raw?.toUpperCase()) {
    case "PUBLISHED":
    case "ACTIVE":
      return "Aktif";
    case "DRAFT":
      return "Taslak";
    default:
      return "Arşiv";
  }
}

// ─── Mapper: BackendProduct → Product ────────────────────────────────────────
export function mapBackendProduct(raw: BackendProduct): Product {
  return {
    id: raw.id,
    status: mapStatus(raw.status),
    createdAt: raw.issued_at ? new Date(raw.issued_at).toLocaleDateString("tr-TR") : "",
    product_name: raw.name,
    product_category: raw.category as Product["product_category"],
    gtin: raw.gtin,
    batch_number: raw.batch_number,
    material_standard: raw.material_standard,
    steel_grade: raw.steel_grade as Product["steel_grade"],
    weight_per_meter_kg: raw.weight_per_meter,
    dimensions: raw.dimensions,
    production_date: raw.production_date,
    version: raw.version,
    co2_cradle_to_gate_kg: raw.carbon_footprint,
    recycled_content_pct: raw.recycled_content,
    recyclability_pct: raw.recyclability,
    hazardous_materials: raw.svhc_free === undefined ? undefined : !raw.svhc_free,
    disposal_instructions: raw.disposal_instructions,
    dismantling_difficulty: raw.dismantling_difficulty,
    issued_at: raw.issued_at,
    valid_until: raw.valid_until,
    manufacturer: raw.manufacturer ? {
      name: raw.manufacturer.name,
      tax_id: raw.manufacturer.tax_id,
      dpp_support_email: raw.manufacturer.contact_email,
      website: raw.manufacturer.website,
      country: raw.manufacturer.country,
      city: raw.manufacturer.city,
      address: raw.manufacturer.address,
    } : undefined,
    facility: raw.facility ? {
      name: raw.facility.name,
      gln_code: raw.facility.gln_code,
      country: raw.facility.country,
      city: raw.facility.city,
      address: raw.facility.address,
    } : undefined,
    supply_chain: raw.supply_chain?.map(s => ({
      sequence_number: s.sequence_number,
      stage_name: s.stage_name,
      stage_date: s.stage_date,
      traceability_id: s.traceability_id,
      organization: {
        name: s.organization_name, role: s.organization_role,
        location_text: s.location, country_code: s.country_code,
      },
      material: { name: s.material_name, quantity: String(s.quantity ?? ""), unit: s.unit },
      process: { name: s.process_name },
    })),
    certifications: raw.certifications?.map(c => ({
      cert_type: c.cert_type, issuer: c.issuer, cert_number: c.cert_number,
      issue_date: c.issue_date, expiry_date: c.expiry_date, document_url: c.document_url,
    })),
    lifecycle_events: raw.lifecycle_events,
  };
}

// ─── Tipler ──────────────────────────────────────────────────────────────────
export type ProductCategory = "Structural Steel" | "Flat Products" | "Long Products" | "Tubes and Pipes";
export type SteelGrade = "S235JR" | "S275JR" | "S275J0" | "S275J2" | "S355JR" | "S355J0" | "S355J2" | "S355K2" | "S420" | "S460";
export type HeatTreatment = "Hot Rolled" | "Cold Rolled" | "Normalized" | "Quenched and Tempered" | "Thermomechanically Rolled";
export type SurfaceCondition = "Hot Rolled - Mill Finish" | "Shot Blasted and Primed" | "Galvanized" | "Painted" | "Coated";

export interface ChemicalComposition {
  carbon_pct: number; silicon_pct: number; manganese_pct: number;
  phosphorus_pct: number; sulfur_pct: number; nitrogen_pct: number;
  reference_standard?: string;
}

export interface MechanicalProperties {
  yield_strength_mpa: number; tensile_strength_mpa: number; elongation_pct: number;
  impact_energy_j?: number; impact_temperature_c?: number; reference_standard?: string;
}

export interface Product {
  id: string;
  status: "Aktif" | "Taslak" | "Arşiv";
  createdAt: string;
  product_name: string;
  product_category: ProductCategory;
  brand?: string;
  gtin?: string;
  batch_number?: string;
  dimensions?: string;
  manufacturer_part_number?: string;
  dimensional_standard?: string;
  material_standard?: string;
  steel_grade?: SteelGrade;
  weight_per_meter_kg?: number;
  section_area_cm2?: number;
  standard_length_m?: number;
  production_date?: string;
  heat_treatment?: HeatTreatment;
  surface_condition?: SurfaceCondition;
  version?: string;
  issued_at?: string;
  valid_until?: string;
  epd_number?: string;
  epd_url?: string;
  co2_cradle_to_gate_kg?: number;
  water_consumption_l_kg?: number;
  recycled_content_pct?: number;
  recyclability_pct?: number;
  hazardous_materials?: boolean;
  disposal_instructions?: string;
  dismantling_difficulty?: string;
  manufacturer?: {
    name?: string; tax_id?: string; dpp_support_email?: string;
    website?: string; country?: string; city?: string; address?: string;
  };
  facility?: {
    name?: string; gln_code?: string; country?: string; city?: string; address?: string;
  };
  supply_chain?: Array<{
    sequence_number: number; stage_name: string; stage_date?: string; traceability_id?: string;
    organization: { name?: string; role?: string; location_text?: string; country_code?: string };
    material: { name?: string; quantity?: string; unit?: string };
    process: { name?: string };
  }>;
  certifications?: Array<{
    cert_type: string; issuer?: string; cert_number?: string;
    issue_date?: string; expiry_date?: string; document_url?: string;
  }>;
  lifecycle_events?: Array<{
    event_type: string; event_date: string;
    description?: string; performed_by?: string; location?: string;
  }>;
  chemical_composition?: ChemicalComposition;
  mechanical_properties?: MechanicalProperties;
}

// ─── Servis ─────────────────────────────────────────────────────────────────

export const productService = {
  /** Tüm DPP'leri listele — dashboard tablosu */
  getProducts: async (): Promise<Product[]> => {
    const raw: BackendProduct[] = await apiGetDpps({ limit: 100 });
    return raw.map(mapBackendProduct);
  },

  /** Tekil DPP — detay sayfası */
  getProductById: async (id: string): Promise<Product | null> => {
    try {
      const raw: BackendProduct = await apiGetDppById(id);
      return mapBackendProduct(raw);
    } catch {
      return null;
    }
  },

  /** Yeni DPP oluştur */
  createProduct: async (payload: {
    product_type_id: string;
    gs1_serial_number: string;
    production_date: string;
    gtin?: string;
  }): Promise<Product> => {
    const raw: BackendProduct = await apiCreateDpp(payload);
    return mapBackendProduct(raw);
  },

  /** DPP sil */
  deleteProduct: async (id: string): Promise<void> => {
    await apiDeleteDpp(id);
  },
};