import {
  LayoutDashboard, ClipboardList, ShieldAlert, Users,
  Download,
} from 'lucide-react';
import type { AdminProduct, CertType, PendingBatch, IncompleteProduct, PassportStatus } from '../types/admin';

export const CBAM_LIMIT = 2.0;

export const CERT_ALERTS: { product: string; id: string; cert: string; issuer: string; expiry: string; days_left: number; type: CertType }[] = [
  // ── Firma Geneli ──────────────────────────────────────────────────────────
  { product: 'Firma Geneli', id: '', cert: 'ISO 9001 KYS',          issuer: 'TÜV NORD',                   expiry: '2026-04-15', days_left: 19,   type: 'firma' },
  { product: 'Firma Geneli', id: '', cert: 'ISO 14001 ÇYS',         issuer: 'Bureau Veritas',             expiry: '2025-12-01', days_left: -116, type: 'firma' },
  { product: 'Firma Geneli', id: '', cert: 'ISO 45001 İSG-YS',      issuer: "Lloyd's Register",           expiry: '2026-06-20', days_left: 85,   type: 'firma' },
  { product: 'Firma Geneli', id: '', cert: 'ISO 27001 BGYS',         issuer: 'BSI',                        expiry: '2027-09-15', days_left: 537,  type: 'firma' },
  { product: 'Firma Geneli', id: '', cert: 'ISO 50001 EnYS',         issuer: 'TÜV NORD',                   expiry: '2026-05-10', days_left: 44,   type: 'firma' },
  { product: 'Firma Geneli', id: '', cert: 'Sıfır Atık Belgesi A1', issuer: 'Çevre ve Şehircilik Bak.',  expiry: '2026-09-01', days_left: 158,  type: 'firma' },
  { product: 'Firma Geneli', id: '', cert: 'Sıfır Atık Belgesi A2', issuer: 'Çevre ve Şehircilik Bak.',  expiry: '2026-09-01', days_left: 158,  type: 'firma' },
  { product: 'Firma Geneli', id: '', cert: 'Sıfır Atık Belgesi A3', issuer: 'Çevre ve Şehircilik Bak.',  expiry: '2027-02-10', days_left: 320,  type: 'firma' },
  { product: 'Firma Geneli', id: '', cert: 'YYS (AEO)',              issuer: 'Gümrük İdaresi',             expiry: '2028-01-15', days_left: 659,  type: 'firma' },
  { product: 'Galvaniz Tesisi', id: '', cert: 'TSE EN ISO 1461',     issuer: 'TSE',                        expiry: '2026-11-30', days_left: 248,  type: 'firma' },
  { product: 'Galvaniz Tesisi', id: '', cert: 'Sıfır Atık Belgesi', issuer: 'Çevre ve Şehircilik Bak.',  expiry: '2026-08-20', days_left: 146,  type: 'firma' },
  // ── Ürün Tipi ─────────────────────────────────────────────────────────────
  { product: 'IPE 200 Yapısal Çelik',  id: 'KCR-742', cert: 'CE Marking (EN 10025-1)',  issuer: 'TSE',       expiry: '2027-01-10', days_left: 289,  type: 'urun-tipi' },
  { product: 'HEB 300 Geniş Başlıklı', id: 'KCR-891', cert: 'EPD Belgesi',              issuer: 'IBU',       expiry: '2026-03-25', days_left: -2,   type: 'urun-tipi' },
  { product: 'Tüm Çelik Profiller',    id: '',         cert: 'EN 1090-1:2009 CE',        issuer: 'TÜV NORD',  expiry: '2026-12-31', days_left: 279,  type: 'urun-tipi' },
  { product: 'I Profiller (IPE/HEA/HEB)', id: '',      cert: 'TSE NPI',                  issuer: 'TSE',       expiry: '2026-07-22', days_left: 117,  type: 'urun-tipi' },
  { product: 'U Profiller (UPN)',       id: '',         cert: 'TSE NPU',                  issuer: 'TSE',       expiry: '2026-07-22', days_left: 117,  type: 'urun-tipi' },
  { product: 'Köşebent (ANG)',          id: '',         cert: 'TSE KOS',                  issuer: 'TSE',       expiry: '2025-11-15', days_left: -132, type: 'urun-tipi' },
  { product: 'Tüm Profiller (UK)',      id: '',         cert: 'UKCA (BS EN 10025-1)',     issuer: 'BSI',       expiry: '2027-03-01', days_left: 339,  type: 'urun-tipi' },
  { product: 'Tüm Profiller (SA)',      id: '',         cert: 'SASO',                     issuer: 'SABER',     expiry: '2026-04-01', days_left: 5,    type: 'urun-tipi' },
  { product: 'Tüm Profiller (MY)',      id: '',         cert: 'SIRIM PC004401',           issuer: 'SIRIM',     expiry: '2026-10-15', days_left: 202,  type: 'urun-tipi' },
  { product: 'Tüm Profiller (MY)',      id: '',         cert: 'SIRIM PC004402',           issuer: 'SIRIM',     expiry: '2026-10-15', days_left: 202,  type: 'urun-tipi' },
  { product: 'Tüm Profiller (GCC)',     id: '',         cert: 'GI 120',                   issuer: 'ESMA',      expiry: '2027-05-20', days_left: 419,  type: 'urun-tipi' },
  { product: 'Tüm Profiller (TH)',      id: '',         cert: 'TH 7029',                  issuer: 'TISI',      expiry: '2026-08-10', days_left: 136,  type: 'urun-tipi' },
  { product: 'Kaynaklı Yapılar',        id: '',         cert: 'ISO 3834-2',               issuer: 'TÜV NORD',  expiry: '2027-06-15', days_left: 445,  type: 'urun-tipi' },
  // ── Batch ─────────────────────────────────────────────────────────────────
  { product: 'IPE 200 Yapısal Çelik',  id: 'KCR-742', cert: 'EN 10204 3.1', issuer: 'Kocaer QC', expiry: '2027-03-10', days_left: 348, type: 'batch' },
  { product: 'HEB 300 Geniş Başlıklı', id: 'KCR-891', cert: 'EN 10204 3.2', issuer: 'TÜV NORD',  expiry: '2027-03-12', days_left: 350, type: 'batch' },
  { product: 'UPN 160 U Profil',       id: 'KCR-315', cert: 'EN 10204 3.1', issuer: 'Kocaer QC', expiry: '2026-01-01', days_left: -85, type: 'batch' },
];

// VERSION_HISTORY removed


export const ACCESS_LOGS = [
  // Sayfa 1
  { user: 'inspector.mehmet@gtb.gov.tr', role: 'AUTHORITY', action: 'Pasaport PDF indirildi',        product: 'KCR-742', timestamp: '2026-03-15 14:32', ip: '195.142.x.x' },
  { user: 'purchasing@turkcell.com.tr',  role: 'CUSTOMER',  action: 'Tedarik zinciri görüntülendi',  product: 'KCR-742', timestamp: '2026-03-15 11:15', ip: '88.255.x.x'  },
  { user: 'quality@erdemir.com.tr',      role: 'SUPPLIER',  action: 'Kimyasal veriler görüntülendi', product: 'KCR-742', timestamp: '2026-03-14 16:44', ip: '80.251.x.x'  },
  { user: 'anonim',                      role: 'PUBLIC',    action: 'Pasaport genel görünümü',       product: 'KCR-742', timestamp: '2026-03-14 09:22', ip: '78.xxx.x.x'  },
  { user: 'inspector.mehmet@gtb.gov.tr', role: 'AUTHORITY', action: 'Sertifika doğrulama',           product: 'KCR-891', timestamp: '2026-03-13 15:00', ip: '195.142.x.x' },
  { user: 'anonim',                      role: 'PUBLIC',    action: 'QR kod tarandı',                product: 'KCR-315', timestamp: '2026-03-12 08:55', ip: '78.xxx.x.x'  },
  // Sayfa 2
  { user: 'purchasing@turkcell.com.tr',  role: 'CUSTOMER',  action: 'Pasaport PDF indirildi',        product: 'KCR-891', timestamp: '2026-03-11 17:03', ip: '88.255.x.x'  },
  { user: 'quality@erdemir.com.tr',      role: 'SUPPLIER',  action: 'Tedarik zinciri görüntülendi',  product: 'KCR-742', timestamp: '2026-03-11 14:20', ip: '80.251.x.x'  },
  { user: 'anonim',                      role: 'PUBLIC',    action: 'QR kod tarandı',                product: 'KCR-742', timestamp: '2026-03-10 11:44', ip: '78.xxx.x.x'  },
  { user: 'inspector.mehmet@gtb.gov.tr', role: 'AUTHORITY', action: 'Pasaport PDF indirildi',        product: 'KCR-315', timestamp: '2026-03-10 09:30', ip: '195.142.x.x' },
  { user: 'purchasing@turkcell.com.tr',  role: 'CUSTOMER',  action: 'Genel ürün bilgileri görüntülendi', product: 'KCR-558', timestamp: '2026-03-09 16:55', ip: '88.255.x.x' },
  { user: 'anonim',                      role: 'PUBLIC',    action: 'Pasaport genel görünümü',       product: 'KCR-891', timestamp: '2026-03-09 10:12', ip: '78.xxx.x.x'  },
  // Sayfa 3
  { user: 'quality@erdemir.com.tr',      role: 'SUPPLIER',  action: 'Sertifika doğrulama',           product: 'KCR-891', timestamp: '2026-03-08 15:30', ip: '80.251.x.x'  },
  { user: 'inspector.mehmet@gtb.gov.tr', role: 'AUTHORITY', action: 'Kimyasal veriler görüntülendi', product: 'KCR-742', timestamp: '2026-03-07 13:45', ip: '195.142.x.x' },
  { user: 'anonim',                      role: 'PUBLIC',    action: 'QR kod tarandı',                product: 'KCR-558', timestamp: '2026-03-07 09:18', ip: '78.xxx.x.x'  },
  { user: 'purchasing@turkcell.com.tr',  role: 'CUSTOMER',  action: 'Tedarik zinciri görüntülendi',  product: 'KCR-891', timestamp: '2026-03-06 14:22', ip: '88.255.x.x'  },
  { user: 'quality@erdemir.com.tr',      role: 'SUPPLIER',  action: 'Pasaport PDF indirildi',        product: 'KCR-742', timestamp: '2026-03-05 11:05', ip: '80.251.x.x'  },
  { user: 'anonim',                      role: 'PUBLIC',    action: 'Pasaport genel görünümü',       product: 'KCR-315', timestamp: '2026-03-04 08:40', ip: '78.xxx.x.x'  },
];

export const LOGS_PER_PAGE = 6;

export const SUPPLIER_PERF = [
  { name: 'Erdemir A.Ş.',    role: 'Ham Madde Tedarikçisi', verified: true,  accuracy: 97, method: 'EPD Belgeli',   updated: '2026-03-01', risk: 'Düşük'   },
  { name: 'Kocaer Çelik',    role: 'Üretici',               verified: true,  accuracy: 94, method: 'SAP/ERP',      updated: '2026-03-10', risk: 'Düşük'   },
  { name: 'Ekol Lojistik',   role: 'Lojistik Sağlayıcı',   verified: false, accuracy: 61, method: 'Manuel Beyan', updated: '2026-02-20', risk: 'Yüksek'  },
];

export const LOGISTICS = [
  { from: 'Ereğli, Zonguldak', to: 'Aliağa, İzmir',       method: 'Karayolu',  dist: '850 km',   co2: '0.045 kg CO₂e/kg' },
  { from: 'Aliağa, İzmir',     to: 'Ambarlı, İstanbul',   method: 'Karayolu',  dist: '420 km',   co2: '0.022 kg CO₂e/kg' },
  { from: 'Ambarlı, İstanbul', to: 'Hamburg, Almanya',    method: 'Denizyolu', dist: '2.100 km', co2: '0.018 kg CO₂e/kg' },
];

export const INCOMPLETE: IncompleteProduct[] = [
  {
    id: 'KCR-891', product: 'HEB 300 Geniş Başlıklı Profil', status: 'Taslak', version: '1.0',
    missing: [
      { section: 'Kimlik & Katalog',   field: 'GTIN Numarası'      },
      { section: 'Sürdürülebilirlik',  field: 'EPD Belgesi'        },
      { section: 'Blokzincir',         field: 'Blokzincir Mühürü'  },
    ],
  },
  {
    id: 'PB-001', product: 'HEB 300 Geniş Başlıklı Profil', status: 'Taslak', version: '1.0',
    missing: [
      { section: 'Kimyasal & Mekanik', field: 'Darbe Enerjisi (J)' },
      { section: 'Tedarik Zinciri',    field: 'Tedarikçi Parti Kodu' },
    ],
  },
  {
    id: 'KCR-558', product: 'CHS 88.9x3.2 Yuvarlak Boru', status: 'Geri Çağrıldı', version: '1.1',
    missing: [
      { section: 'Üretici Bilgileri',  field: 'Üretici Web Sitesi' },
      { section: 'Ömür Sonu',          field: 'İmha Talimatı'      },
      { section: 'Sürdürülebilirlik',  field: 'Geri Dönüşüm Oranı' },
    ],
  },
];

// PENDING_BATCHES removed


export const REACH_LIST = [
  { substance: 'Lead (Pb)',       cas: '7439-92-1',  threshold: 0.1,  concentration: 0.003, present: false },
  { substance: 'Chromium VI',     cas: '18540-29-9', threshold: 0.1,  concentration: 0,     present: false },
  { substance: 'Cadmium (Cd)',    cas: '7440-43-9',  threshold: 0.01, concentration: 0.002, present: false },
  { substance: 'Mercury (Hg)',    cas: '7439-97-6',  threshold: 0.1,  concentration: 0,     present: false },
  { substance: 'Arsenic (As)',    cas: '7440-38-2',  threshold: 0.1,  concentration: 0.004, present: false },
  { substance: 'Nickel (Ni)',     cas: '7440-02-0',  threshold: 0.1,  concentration: 0.081, present: false },
];

export const REACH_TOTAL = 240;

// Sütun sırası: PUBLIC, CUSTOMER, SUPPLIER, ENGINEER, AUTHORITY, ADMIN
export const ACCESS_MATRIX = [
  { feature: 'Genel Ürün Bilgileri',              access: [true,  true,  true,  true,  true,  true]  },
  { feature: 'Kimyasal Kompozisyon',              access: [true,  true,  true,  true,  true,  true]  },
  { feature: 'Sürdürülebilirlik (CO₂, EPD)',      access: [true,  true,  true,  true,  true,  true]  },
  { feature: 'Dijital Sertifikalar (Genel)',       access: [true,  true,  true,  true,  true,  true]  },
  { feature: 'Teknik / Mühendislik Verileri',     access: [false, false, true,  true,  true,  true]  },
  { feature: 'Tedarik Zinciri Detayları',         access: [false, false, true,  true,  true,  true]  },
  { feature: 'Batch Sertifikaları (EN 10204)',    access: [false, false, true,  true,  true,  true]  },
  { feature: 'PDF / Rapor İndirme',              access: [false, false, true,  true,  true,  true]  },
  { feature: 'Pasaport Düzenleme',               access: [false, false, false, true,  false, true]  },
  { feature: 'Pasaport Yayınlama',               access: [false, false, false, false, false, true]  },
];

export const STATUS_CFG: Record<PassportStatus, { bg: string; text: string; dot: string }> = {
  'Yayında':      { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
  'Taslak':       { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  'Arşivlendi':   { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400'   },
  'Geri Çağrıldı':{ bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
};

export const ROLE_CFG: Record<string, string> = {
  AUTHORITY: 'bg-purple-100 text-purple-700',
  CUSTOMER:  'bg-blue-100 text-blue-700',
  SUPPLIER:  'bg-orange-100 text-orange-700',
  ENGINEER:  'bg-teal-100 text-teal-700',
  PUBLIC:    'bg-gray-100 text-gray-600',
  ADMIN:     'bg-red-100 text-red-700',
};

export const TABS = [
  { id: 'overview',     label: 'Genel Bakış',           icon: LayoutDashboard },
  { id: 'passports',    label: 'Pasaport Yönetimi',     icon: ClipboardList   },
  { id: 'compliance',   label: 'Compliance & Alarmlar', icon: ShieldAlert     },
  { id: 'access',       label: 'Kullanıcı & Erişim',    icon: Users           },
  { id: 'reports',      label: 'Raporlama',              icon: Download        },
];

export const REJECTABLE_FIELDS = [
  { key: 'co2_a1a3',            label: 'CO₂ A1–A3 Emisyon Değeri' },
  { key: 'geri_donusum_orani',  label: 'Geri Dönüşüm Oranı' },
  { key: 'svhc_free',           label: 'SVHC / REACH Beyanı' },
  { key: 'celik_kalitesi',      label: 'Çelik Kalitesi' },
  { key: 'cift_kodu',           label: 'Çift Kodu (Heat No)' },
  { key: 'parti_no',            label: 'Parti Numarası' },
];
