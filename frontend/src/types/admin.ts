export type PassportStatus = 'Taslak' | 'Yayında' | 'Arşivlendi' | 'Geri Çağrıldı';

export interface AdminProduct {
  id: string;
  display_id?: string;
  product_name: string;
  product_category: string;
  co2_cradle_to_gate_kg: number;
  passport_status: PassportStatus;
  version: string;
  blockchain_timestamp: string;
}

export type CertType = 'firma' | 'urun-tipi' | 'batch';

export interface PendingBatch {
  id: string;
  parti_no: string;
  urun_tipi: string;
  miktar_ton: number;
  olusturan: string;
  gonderilme_tarihi: string;
  co2_a1a3: number;
  co2_verification: string;
}

export interface IncompleteProduct {
  id: string;
  display_id?: string;
  product: string;
  status: 'Taslak' | 'Geri Çağrıldı';
  version: string;
  missing: { section: string; field: string }[];
}
