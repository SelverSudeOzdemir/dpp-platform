import { Package, FlaskConical, Award, GitBranch, Leaf, Factory, Zap } from 'lucide-react';
import type { UrunKatalog, BatchInfo, DppData, ExistingBatchData } from '../types/batch';

export const URUN_KATALOGU: UrunKatalog[] = [
  { urun_no: 'IPE-100', urun_tipi: 'IPE 100 Yapısal Çelik Profil',              gtin: '8691234567890', hs_code: '7216.32', malzeme_standard: 'EN 10025-2',  celik_kalitesi: 'S355JR', agirlik_m: '8.1',  en_mm: '100', kalinlik_mm: '5.7'  },
  { urun_no: 'IPE-200', urun_tipi: 'IPE 200 Yapısal Çelik Profil',              gtin: '8691234567891', hs_code: '7216.32', malzeme_standard: 'EN 10025-2',  celik_kalitesi: 'S355JR', agirlik_m: '26.2', en_mm: '200', kalinlik_mm: '8.5'  },
  { urun_no: 'IPE-240', urun_tipi: 'IPE 240 Yapısal Çelik Profil',              gtin: '8691234567892', hs_code: '7216.32', malzeme_standard: 'EN 10025-2',  celik_kalitesi: 'S355JR', agirlik_m: '30.7', en_mm: '240', kalinlik_mm: '9.5'  },
  { urun_no: 'HEB-300', urun_tipi: 'HEB 300 Geniş Başlıklı Profil',             gtin: '8691234567893', hs_code: '7216.33', malzeme_standard: 'EN 10025-2',  celik_kalitesi: 'S355JR', agirlik_m: '117',  en_mm: '300', kalinlik_mm: '19.0' },
  { urun_no: 'HEA-200', urun_tipi: 'HEA 200 Hafif Geniş Başlıklı Profil',      gtin: '8691234567894', hs_code: '7216.33', malzeme_standard: 'EN 10025-2',  celik_kalitesi: 'S355JR', agirlik_m: '42.3', en_mm: '200', kalinlik_mm: '15.0' },
  { urun_no: 'UPN-160', urun_tipi: 'UPN 160 Oluk Profil',                       gtin: '8691234567895', hs_code: '7216.31', malzeme_standard: 'EN 10279',    celik_kalitesi: 'S235JR', agirlik_m: '18.8', en_mm: '160', kalinlik_mm: '7.5'  },
  { urun_no: 'ANG-100x100x10', urun_tipi: 'Köşebent 100x100x10 Eşit Köşebent', gtin: '8691234567996', hs_code: '7216.40', malzeme_standard: 'EN 10056-1', celik_kalitesi: 'S355JR', agirlik_m: '14.9', en_mm: '100', kalinlik_mm: '10.0' },
];

export const DISMANTLING_OPTIONS = ['Çok Kolay', 'Kolay', 'Orta', 'Zor', 'Çok Zor'];
export const CO2_VERIFICATION_OPTIONS = ['Üçüncü Taraf Doğrulamalı', 'EPD Belgeli', 'Dahili Hesaplama', 'Varsayılan Değer'];
export const PRODUCTION_ROUTE_OPTIONS = ['EAF (Elektrik Ark Ocağı)', 'BOF (Bazik Oksijen Fırını)', 'EAF + LF (Pota Fırını)'];

export const MAIN_STEPS = ['Batch Bilgileri', 'DPP Verileri', 'Önizleme'];

export const DPP_SUBSTEPS = [
  { label: 'Teknik', icon: Package },
  { label: 'Kimyasal & Mekanik', icon: FlaskConical },
  { label: 'Sertifikalar', icon: Award },
  { label: 'Tedarik Zinciri', icon: GitBranch },
  { label: 'Sürdürülebilirlik', icon: Leaf },
  { label: 'Üretici & Tesis', icon: Factory },
];

export const MOCK_EXISTING_BATCHES = [
  { id: '1', parti_no: 'KCR-2026-0310-A', urun_tipi: 'IPE 200 Yapısal Çelik Profil', dpp_durum: 'Taslak' },
  { id: '2', parti_no: 'KCR-2026-0220-B', urun_tipi: 'HEA 200 Hafif Geniş Başlıklı Profil', dpp_durum: 'Yayınlandı' },
];

export const MOCK_UPLOADED_FILES: Record<string, any[]> = {
  '1': [
    { id: 'f1', file_type: 'xlsx', file_name: 'kimyasal_kompozisyon_03.xlsx', uploaded_by: 'Ali Yılmaz', fields_imported: 12, file_size: '24 KB', uploaded_at: '2026-03-26 14:30' },
  ],
};

export const DURUM_CLASS: Record<string, string> = {
  'Taslak': 'bg-amber-100 text-amber-700',
  'Yayınlandı': 'bg-green-100 text-green-700',
};

export const CATEGORIES = ['Kimyasal Kompozisyon', 'Mekanik Özellikler', 'Sürdürülebilirlik'];

export const DPP_FIELDS = [
  { category: 'Kimyasal Kompozisyon', key: 'c_pct',              label: 'Karbon (C) %',                  required: true  },
  { category: 'Kimyasal Kompozisyon', key: 'mn_pct',             label: 'Mangan (Mn) %',                 required: true  },
  { category: 'Mekanik Özellikler',   key: 'yield_mpa',          label: 'Akma Dayanımı (MPa)',            required: true  },
  { category: 'Mekanik Özellikler',   key: 'tensile_mpa',        label: 'Çekme Dayanımı (MPa)',           required: true  },
  { category: 'Sürdürülebilirlik',    key: 'recycled_content_pct', label: 'Geri Dönüştürülmüş İçerik %', required: false },
];


export const AUTO_MAPPING: Record<string, string> = {
  'c_pct':               'Karbon (C)',
  'mn_pct':              'Mangan (Mn)',
  'yield_mpa':           'Akma (Yield)',
  'tensile_mpa':         'Çekme (Tensile)',
  'recycled_content_pct': 'Geri Dönüşüm Oranı',
};

export const FIELD_TO_BATCHINFO: Record<string, string> = {};
export const FIELD_TO_DPPDATA: Record<string, string> = {
  'c_pct': 'c_pct', 'mn_pct': 'mn_pct', 'yield_mpa': 'yield_mpa',
  'tensile_mpa': 'tensile_mpa', 'recycled_content_pct': 'recycled_content_pct',
};

export const ERP_CONNECTIONS = [
  { id: 'SAP',    name: 'SAP S/4HANA',     version: 'ECC 6.0', status: 'connected'      as const, abbr: 'SAP', abbr_color: 'text-blue-700',   abbr_bg: 'bg-blue-50 border-blue-200'   },
  { id: 'LOGO',   name: 'Logo Tiger 3',     version: 'v3.82',   status: 'connected'      as const, abbr: 'LGO', abbr_color: 'text-orange-700', abbr_bg: 'bg-orange-50 border-orange-200' },
  { id: 'ORACLE', name: 'Oracle ERP Cloud', version: '—',       status: 'disconnected'   as const, abbr: 'ORC', abbr_color: 'text-gray-400',   abbr_bg: 'bg-gray-50 border-gray-200'   },
  { id: 'CUSTOM', name: 'Özel REST API',    version: '—',       status: 'not_configured' as const, abbr: 'API', abbr_color: 'text-gray-400',   abbr_bg: 'bg-gray-50 border-gray-200'   },
];

export const ERP_SYNC_CATEGORIES = [
  { name: 'Batch Kimliği',      total: 5, fetched: 5, Icon: Package,      full: true  },
  { name: 'Kimyasal Bileşim',   total: 6, fetched: 6, Icon: FlaskConical, full: true  },
  { name: 'Mekanik Özellikler', total: 5, fetched: 4, Icon: Zap,          full: false },
  { name: 'Sürdürülebilirlik',  total: 6, fetched: 3, Icon: Leaf,         full: false },
  { name: 'Sertifikalar',       total: 1, fetched: 1, Icon: Award,        full: true  },
  { name: 'Tedarik Zinciri',    total: 3, fetched: 3, Icon: GitBranch,    full: true  },
];

export const ERP_MISSING_FIELDS = [
  'Darbe Enerjisi (J)',
  'EPD Belge No',
  'Geri Dönüştürülmüş İçerik %',
  'Geri Dönüştürülebilirlik %',
];



export const EMPTY_DPP: DppData = {
  gtin: '', material_standard: '',
  celik_kalitesi: '', en_mm: '', boy_mm: '', kalinlik_mm: '', agirlik_m: '',
  mn_pct: '', c_pct: '', si_pct: '', p_pct: '', s_pct: '', n_pct: '',
  yield_mpa: '', tensile_mpa: '', elongation_pct: '', impact_energy_j: '', impact_temp_c: '',
  certifications: [],
  supply_chain: [],
  co2_a1a3: '', co2_a3: '', co2_a4: '', co2_verification: '',
  epd_no: '', epd_valid_until: '', epd_url: '',
  recycled_content_pct: '', recyclability_pct: '',
  svhc_free: true, disposal_instructions: '', hazardous_substances: [],
  dismantling_difficulty: '', hazardous_materials: false,
  uretici_adi: 'Kocaer Çelik A.Ş.', uretici_website: 'https://www.kocaersteel.com',
  uretici_email: 'dpp@kocaersteel.com', uretici_adres: '', uretici_vergi_no: '',
  tesis_adi: 'Aliağa Üretim Tesisi', tesis_ulkesi: 'Türkiye', tesis_gln: '', tesis_adres: '',
};

export const MOCK_BATCH_DPP: Record<string, ExistingBatchData> = {
  'B-001': {
    batchInfo: { parti_no: 'KCR-2026-0312-A', urun_no: 'IPE-200', urun_tipi: 'IPE 200 Yapısal Çelik Profil', ocak_no: 'EAF-03', uretim_tarihi: '2026-03-12', miktar_ton: '42.5' },
    dppData: { c_pct: '0.17', mn_pct: '1.48', si_pct: '0.32', p_pct: '0.018', s_pct: '0.012', yield_mpa: '385', tensile_mpa: '520', elongation_pct: '22', co2_a1a3: '1.92' },
  },
  'B-002': {
    batchInfo: { parti_no: 'KCR-2026-0315-B', urun_no: 'HEB-300', urun_tipi: 'HEB 300 Geniş Başlıklı Profil', ocak_no: 'EAF-01', uretim_tarihi: '2026-03-15', miktar_ton: '68.0' },
    dppData: { c_pct: '0.18', mn_pct: '1.52', si_pct: '0.35', p_pct: '0.020', s_pct: '0.015' },
  },
  'B-003': {
    batchInfo: { parti_no: 'KCR-2026-0316-A', urun_no: 'IPE-240', urun_tipi: 'IPE 240 Yapısal Çelik Profil', ocak_no: 'EAF-02', uretim_tarihi: '2026-03-16', miktar_ton: '31.2' },
    dppData: { c_pct: '0.16', mn_pct: '1.44', si_pct: '0.28', p_pct: '0.016', s_pct: '0.011' },
  },
  'B-004': {
    batchInfo: { parti_no: 'KCR-2026-0317-A', urun_no: 'UPN-160', urun_tipi: 'UPN 160 Oluk Profil', ocak_no: 'EAF-03', uretim_tarihi: '2026-03-17', miktar_ton: '25.8' },
    dppData: {},
  },
};
