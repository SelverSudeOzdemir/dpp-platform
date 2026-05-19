export interface BatchInfo {
  parti_no: string;
  tedarikci_parti_kodu: string;
  urun_no: string;
  urun_tipi: string;
  ocak_no: string;
  uretim_tarihi: string;
  miktar_ton: string;
  production_route: string;
}

export interface Certification {
  id: number;
  cert_type: string;
  issuer: string;
  cert_no: string;
  issue_date: string;
  expiry_date: string;
  test_standard: string;
  file_name: string;
}

export interface SupplyStage {
  id: number;
  stage_name: string;
  organization: string;
  role: string;
  location: string;
  material_origin: string;
  process: string;
  material: string;
  quantity: string;
  unit: string;
  date: string;
}

export interface HazardousSubstance {
  id: number;
  name: string;
  cas_no: string;
  concentration_pct: string;
  svhc: boolean;
}

export interface DppData {
  gtin: string;
  material_standard: string;
  celik_kalitesi: string;
  en_mm: string;
  boy_mm: string;
  kalinlik_mm: string;
  agirlik_m: string;
  mn_pct: string;
  c_pct: string;
  si_pct: string;
  p_pct: string;
  s_pct: string;
  n_pct: string;
  yield_mpa: string;
  tensile_mpa: string;
  elongation_pct: string;
  impact_energy_j: string;
  impact_temp_c: string;
  certifications: Certification[];
  supply_chain: SupplyStage[];
  co2_a1a3: string;
  co2_a3: string;
  co2_a4: string;
  co2_verification: string;
  epd_no: string;
  epd_valid_until: string;
  epd_url: string;
  recycled_content_pct: string;
  recyclability_pct: string;
  svhc_free: boolean;
  disposal_instructions: string;
  dismantling_difficulty: string;
  hazardous_materials: boolean;
  hazardous_substances: HazardousSubstance[];
  uretici_adi: string;
  uretici_website: string;
  uretici_email: string;
  uretici_adres: string;
  uretici_vergi_no: string;
  tesis_adi: string;
  tesis_ulkesi: string;
  tesis_gln: string;
  tesis_adres: string;
}

export interface UrunKatalog {
  urun_no: string;
  urun_tipi: string;
  gtin: string;
  hs_code: string;
  malzeme_standard: string;
  celik_kalitesi: string;
  agirlik_m: string;
  en_mm: string;
  kalinlik_mm: string;
}

export interface ExcelImportData {
  batchInfo: Partial<BatchInfo>;
  dppData: Partial<DppData>;
}

export interface ExistingBatchData {
  batchInfo: Partial<BatchInfo>;
  dppData: Partial<DppData>;
}
