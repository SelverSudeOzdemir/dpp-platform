import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import {
  LayoutDashboard, ClipboardList, ShieldAlert, Users,
  GitBranch, Download, AlertTriangle, CheckCircle2,
  Clock, XCircle, Eye, FileText, Globe,
  Lock, Package, Flag, Calendar, User, Activity,
  TrendingUp, Database, Bell, Edit3, Shield, Archive,
  Truck, Zap, Plus, ChevronDown, Loader2, ArrowRight,
} from 'lucide-react';

// ─── TİPLER ──────────────────────────────────────────────────────────────────
type PassportStatus = 'Taslak' | 'Yayında' | 'Arşivlendi' | 'Geri Çağrıldı';

interface AdminProduct {
  id: string;
  product_name: string;
  product_category: string;
  co2_cradle_to_gate_kg: number;
  passport_status: PassportStatus;
  version: string;
  data_source: 'Manuel' | 'SAP/ERP' | 'API';
  blockchain_timestamp: string;
}

// ─── MOCK VERİLER ────────────────────────────────────────────────────────────
const CBAM_LIMIT = 2.0;

const INITIAL_PRODUCTS: AdminProduct[] = [
  { id: 'KCR-742', product_name: 'IPE 200 Yapısal Çelik Profil', product_category: 'Structural Steel', co2_cradle_to_gate_kg: 1.15, passport_status: 'Yayında',      version: '1.2', data_source: 'SAP/ERP', blockchain_timestamp: '2026-03-10T08:42:11Z' },
  { id: 'KCR-891', product_name: 'HEB 300 Geniş Başlıklı Profil', product_category: 'Structural Steel', co2_cradle_to_gate_kg: 2.31, passport_status: 'Taslak',       version: '1.0', data_source: 'Manuel',  blockchain_timestamp: '' },
  { id: 'KCR-315', product_name: 'UPN 160 U Profil',              product_category: 'Structural Steel', co2_cradle_to_gate_kg: 1.72, passport_status: 'Arşivlendi',   version: '2.1', data_source: 'API',     blockchain_timestamp: '2026-01-01T10:00:00Z' },
  { id: 'KCR-558', product_name: 'CHS 88.9x3.2 Yuvarlak Boru',   product_category: 'Tubes and Pipes',  co2_cradle_to_gate_kg: 2.78, passport_status: 'Geri Çağrıldı', version: '1.1', data_source: 'Manuel',  blockchain_timestamp: '' },
];

type CertType = 'firma' | 'urun-tipi' | 'batch';

const CERT_ALERTS: { product: string; id: string; cert: string; issuer: string; expiry: string; days_left: number; type: CertType }[] = [
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

const VERSION_HISTORY = [
  { id: 'KCR-742', name: 'IPE 200', version: '1.2', by: 'mehmet.yilmaz@kocaer.com', at: '2026-03-10 08:42', changes: 'CO₂ değeri SAP entegrasyonu ile güncellendi (1.22 → 1.15)' },
  { id: 'KCR-742', name: 'IPE 200', version: '1.1', by: 'admin@kocaer.com',          at: '2026-02-15 11:20', changes: 'ISO 9001 sertifikası eklendi, EPD numarası güncellendi' },
  { id: 'KCR-742', name: 'IPE 200', version: '1.0', by: 'admin@kocaer.com',          at: '2026-01-10 09:00', changes: 'İlk pasaport oluşturuldu' },
  { id: 'KCR-891', name: 'HEB 300', version: '1.0', by: 'kemal.arslan@kocaer.com',   at: '2026-03-12 14:30', changes: 'İlk taslak oluşturuldu, kimyasal veriler manuel girildi' },
  { id: 'KCR-315', name: 'UPN 100', version: '2.1', by: 'admin@kocaer.com',          at: '2026-01-01 10:00', changes: 'Arşivleme işlemi yapıldı, QR kodu devre dışı bırakıldı' },
];

const ACCESS_LOGS = [
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
const LOGS_PER_PAGE = 6;

const SUPPLIER_PERF = [
  { name: 'Erdemir A.Ş.',    role: 'Ham Madde Tedarikçisi', verified: true,  accuracy: 97, method: 'EPD Belgeli',   updated: '2026-03-01', risk: 'Düşük'   },
  { name: 'Kocaer Çelik',    role: 'Üretici',               verified: true,  accuracy: 94, method: 'SAP/ERP',      updated: '2026-03-10', risk: 'Düşük'   },
  { name: 'Ekol Lojistik',   role: 'Lojistik Sağlayıcı',   verified: false, accuracy: 61, method: 'Manuel Beyan', updated: '2026-02-20', risk: 'Yüksek'  },
];

const LOGISTICS = [
  { from: 'Ereğli, Zonguldak', to: 'Aliağa, İzmir',       method: 'Karayolu',  dist: '850 km',   co2: '0.045 kg CO₂e/kg' },
  { from: 'Aliağa, İzmir',     to: 'Ambarlı, İstanbul',   method: 'Karayolu',  dist: '420 km',   co2: '0.022 kg CO₂e/kg' },
  { from: 'Ambarlı, İstanbul', to: 'Hamburg, Almanya',    method: 'Denizyolu', dist: '2.100 km', co2: '0.018 kg CO₂e/kg' },
];

const INCOMPLETE = [
  {
    id: 'KCR-891', product: 'HEB 300 Geniş Başlıklı Profil', status: 'Taslak', version: '1.0', data_source: 'Manuel',
    missing: [
      { section: 'Kimlik & Katalog',   field: 'GTIN Numarası'      },
      { section: 'Sürdürülebilirlik',  field: 'EPD Belgesi'        },
      { section: 'Blokzincir',         field: 'Blokzincir Mühürü'  },
    ],
  },
  {
    id: 'PB-001', product: 'HEB 300 Geniş Başlıklı Profil', status: 'Taslak', version: '1.0', data_source: 'Manuel',
    missing: [
      { section: 'Kimyasal & Mekanik', field: 'Darbe Enerjisi (J)' },
      { section: 'Tedarik Zinciri',    field: 'Tedarikçi Parti Kodu' },
    ],
  },
  {
    id: 'KCR-558', product: 'CHS 88.9x3.2 Yuvarlak Boru', status: 'Geri Çağrıldı', version: '1.1', data_source: 'Manuel',
    missing: [
      { section: 'Üretici Bilgileri',  field: 'Üretici Web Sitesi' },
      { section: 'Ömür Sonu',          field: 'İmha Talimatı'      },
      { section: 'Sürdürülebilirlik',  field: 'Geri Dönüşüm Oranı' },
    ],
  },
];

// ─── ONAY BEKLİYEN BATCH'LER ────────────────────────────────────────────────
interface PendingBatch {
  id: string;
  parti_no: string;
  urun_tipi: string;
  miktar_ton: number;
  veri_kaynagi: string;
  olusturan: string;
  gonderilme_tarihi: string;
  co2_a1a3: number; co2_verification: string;
}

const PENDING_BATCHES: PendingBatch[] = [
  {
    id: 'PB-001',
    parti_no: 'KCR-2026-0315-B',
    urun_tipi: 'HEB 300 Geniş Başlıklı Profil',
    miktar_ton: 68.0,
    veri_kaynagi: 'Manuel',
    olusturan: 'Furkan Yıldız',
    gonderilme_tarihi: '2026-03-15 14:22',
    co2_a1a3: 1.92, co2_verification: 'Dahili Hesaplama',
  },
  {
    id: 'PB-002',
    parti_no: 'KCR-2026-0314-A',
    urun_tipi: 'UPN 160 Oluk Profil',
    miktar_ton: 25.8,
    veri_kaynagi: 'Excel',
    olusturan: 'Furkan Yıldız',
    gonderilme_tarihi: '2026-03-14 09:05',
    co2_a1a3: 2.45, co2_verification: 'Dahili Hesaplama',
  },
];

const REACH_LIST = [
  { substance: 'Lead (Pb)',       cas: '7439-92-1',  threshold: 0.1,  concentration: 0.003, present: false },
  { substance: 'Chromium VI',     cas: '18540-29-9', threshold: 0.1,  concentration: 0,     present: false },
  { substance: 'Cadmium (Cd)',    cas: '7440-43-9',  threshold: 0.01, concentration: 0.002, present: false },
  { substance: 'Mercury (Hg)',    cas: '7439-97-6',  threshold: 0.1,  concentration: 0,     present: false },
  { substance: 'Arsenic (As)',    cas: '7440-38-2',  threshold: 0.1,  concentration: 0.004, present: false },
  { substance: 'Nickel (Ni)',     cas: '7440-02-0',  threshold: 0.1,  concentration: 0.081, present: false },
];
const REACH_TOTAL = 240;

// Sütun sırası: PUBLIC, CUSTOMER, SUPPLIER, ENGINEER, AUTHORITY, ADMIN
const ACCESS_MATRIX = [
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

// ─── YARDIMCI BİLEŞENLER ─────────────────────────────────────────────────────
const STATUS_CFG: Record<PassportStatus, { bg: string; text: string; dot: string }> = {
  'Yayında':      { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
  'Taslak':       { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  'Arşivlendi':   { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400'   },
  'Geri Çağrıldı':{ bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
};

function StatusBadge({ status }: { status: PassportStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

const ROLE_CFG: Record<string, string> = {
  AUTHORITY: 'bg-purple-100 text-purple-700',
  CUSTOMER:  'bg-blue-100 text-blue-700',
  SUPPLIER:  'bg-orange-100 text-orange-700',
  ENGINEER:  'bg-teal-100 text-teal-700',
  PUBLIC:    'bg-gray-100 text-gray-600',
  ADMIN:     'bg-red-100 text-red-700',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${ROLE_CFG[role] || 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  );
}


// ─── SEKMELER ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',     label: 'Genel Bakış',         icon: LayoutDashboard },
  { id: 'passports',    label: 'Pasaport Yönetimi',   icon: ClipboardList   },
  { id: 'compliance',   label: 'Compliance & Alarmlar', icon: ShieldAlert   },
  { id: 'access',       label: 'Kullanıcı & Erişim',  icon: Users           },
  { id: 'supplychain',  label: 'Tedarik Zinciri',     icon: GitBranch       },
  { id: 'reports',      label: 'Raporlama',            icon: Download        },
];

// ─── ANA BİLEŞEN ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [products, setProducts] = useState<AdminProduct[]>(INITIAL_PRODUCTS);
  const [pendingBatches, setPendingBatches] = useState<PendingBatch[]>(PENDING_BATCHES);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectFields, setRejectFields] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [pendingStatusChange, setPendingStatusChange] = useState<{ id: string; status: PassportStatus } | null>(null);
  const [certFilter, setCertFilter] = useState<'tumu' | CertType>('tumu');
  const [showAllReach, setShowAllReach] = useState(false);
  const [showCbamInfo, setShowCbamInfo] = useState(false);
  const [showExcelInfo, setShowExcelInfo] = useState(false);
  const [showJsonInfo, setShowJsonInfo] = useState(false);
  const [incompleteFilter, setIncompleteFilter] = useState<'taslak' | 'geri-cagrildi'>('taslak');
  const [selectedIncomplete, setSelectedIncomplete] = useState<typeof INCOMPLETE[0] | null>(null);
  const [exportDateFrom, setExportDateFrom] = useState('2026-01-01');
  const [exportDateTo, setExportDateTo] = useState('2026-03-27');
  const [exportProduct, setExportProduct] = useState('all');
  const [logPage, setLogPage] = useState(0);
  const [menuOpen, setMenuOpen]               = useState(false);
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [loadingBatch, setLoadingBatch]       = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleSelectExisting = (productId: string) => {
    setLoadingBatch(productId);
    setTimeout(() => {
      router.push(`/batches/new?batchId=${productId}`);
    }, 1200);
  };

  const REJECTABLE_FIELDS = [
    { key: 'co2_a1a3',            label: 'CO₂ A1–A3 Emisyon Değeri' },
    { key: 'geri_donusum_orani',  label: 'Geri Dönüşüm Oranı' },
    { key: 'svhc_free',           label: 'SVHC / REACH Beyanı' },
    { key: 'celik_kalitesi',      label: 'Çelik Kalitesi' },
    { key: 'cift_kodu',           label: 'Çift Kodu (Heat No)' },
    { key: 'parti_no',            label: 'Parti Numarası' },
  ];

  const toggleRejectField = (key: string) =>
    setRejectFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );

  const handleApproveBatch = (id: string) =>
    setPendingBatches(prev => prev.filter(b => b.id !== id));

  const handleRejectBatch = (id: string) => {
    if (!rejectReason.trim()) return;
    setPendingBatches(prev => prev.filter(b => b.id !== id));
    setRejectId(null);
    setRejectReason('');
    setRejectFields([]);
  };

  const criticalCerts  = CERT_ALERTS.filter(c => c.days_left <= 30);
  const cbamWarnings   = products.filter(p => p.co2_cradle_to_gate_kg > CBAM_LIMIT);
  const totalAlerts    = criticalCerts.length + cbamWarnings.length;
  const filteredProducts = search.trim()
    ? products.filter(p =>
        p.product_name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const handleStatusChange = (id: string, status: PassportStatus) =>
    setProducts(prev => prev.map(p => p.id === id ? { ...p, passport_status: status } : p));


  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
    <div className="min-h-screen bg-gray-50/50">

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Admin Kontrol Paneli</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Kocaer DPP Platform • v2.4.1</p>
          </div>
          <div className="flex items-center gap-3">
            {totalAlerts > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
                <Bell size={14} className="text-red-500 animate-pulse" />
                <span className="text-xs font-black text-red-700">{totalAlerts} Kritik Uyarı</span>
              </div>
            )}

            {/* DPP İşlemleri dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-100 transition-colors"
              >
                <Plus size={14} /> DPP İşlemleri <ChevronDown size={13} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-100 z-50 overflow-hidden">
                  <button
                    onClick={() => { setMenuOpen(false); router.push('/batches/new'); }}
                    className="w-full text-left px-5 py-4 hover:bg-blue-50 transition-colors group border-b border-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                        <Plus size={15} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Yeni DPP Oluştur</p>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">Sıfırdan yeni bir üretim partisi</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setShowBatchPicker(true); }}
                    className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-colors">
                        <FileText size={15} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Mevcut DPP&apos;ye Devam Et</p>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">Taslak bir partiye veri ekle</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">A</div>
              <span className="text-xs font-bold text-gray-700">admin@kocaer.com</span>
              <span className="bg-red-100 text-red-700 text-[10px] font-black px-1.5 py-0.5 rounded">ADMIN</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB NAVİGASYON ── */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={15} />
                {tab.label}
                {tab.id === 'compliance' && totalAlerts > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {totalAlerts}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── İÇERİK ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ════════════════════════════════════════
            TAB 1 — GENEL BAKIŞ
        ════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-8">

            {/* KPI Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {[
                { label: 'Toplam Pasaport',   value: products.length,                                                 tab: 'passports',  icon: Package,      border: 'border-blue-500',   text: 'text-blue-700',   iconBg: 'bg-blue-50'   },
                { label: 'Yayında',           value: products.filter(p => p.passport_status === 'Yayında').length,    tab: 'passports',  icon: CheckCircle2, border: 'border-green-500',  text: 'text-green-700',  iconBg: 'bg-green-50'  },
                { label: 'Taslak',            value: products.filter(p => p.passport_status === 'Taslak').length,     tab: 'passports',  icon: Clock,        border: 'border-yellow-500', text: 'text-yellow-700', iconBg: 'bg-yellow-50' },
                { label: 'Arşivlendi',        value: products.filter(p => p.passport_status === 'Arşivlendi').length, tab: 'passports',  icon: Archive,      border: 'border-gray-400',   text: 'text-gray-600',   iconBg: 'bg-gray-50'   },
                { label: 'Onay Bekleyen',     value: pendingBatches.length,                                           tab: 'passports',  icon: Zap,          border: 'border-amber-500',  text: 'text-amber-700',  iconBg: 'bg-amber-50'  },
                { label: 'Sertifika Uyarısı', value: criticalCerts.length,                                            tab: 'compliance', icon: Bell,         border: 'border-orange-500', text: 'text-orange-700', iconBg: 'bg-orange-50' },
                { label: 'CBAM Uyarısı',      value: cbamWarnings.length,                                             tab: 'compliance', icon: Flag,         border: 'border-red-500',    text: 'text-red-700',    iconBg: 'bg-red-50'    },
              ].map((k, i) => {
                const Icon = k.icon;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveTab(k.tab)}
                    className={`bg-white rounded-2xl border-l-4 p-4 shadow-sm text-left transition-shadow hover:shadow-md cursor-pointer w-full ${k.border}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{k.label}</p>
                      <div className={`p-1.5 rounded-lg ${k.iconBg}`}>
                        <Icon size={14} className={k.text} />
                      </div>
                    </div>
                    <p className={`text-3xl font-black ${k.text}`}>{k.value}</p>
                  </button>
                );
              })}
            </div>

            {/* ── ONAY BEKLİYEN BATCH'LER ── */}
            {pendingBatches.length > 0 && (
              <div className="bg-white rounded-3xl border-2 border-amber-200 shadow-sm p-6">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <Clock size={16} className="text-amber-500" />
                  Onay Bekleyen DPP'ler
                  <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-black px-2.5 py-0.5 rounded-full">
                    {pendingBatches.length} bekliyor
                  </span>
                </h2>
                <div className="space-y-4">
                  {pendingBatches.map((batch) => (
                    <div key={batch.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
                      <div
                        className="flex items-start justify-between gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => rejectId !== batch.id && router.push(`/batches/${batch.id}`)}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[11px] font-mono font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                              {batch.parti_no}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                              {batch.veri_kaynagi}
                            </span>
                            {batch.co2_a1a3 > CBAM_LIMIT && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1">
                                <Flag size={10} /> CBAM Uyarısı
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-black text-gray-900">{batch.urun_tipi}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500 font-medium">{batch.miktar_ton} ton</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs text-gray-500 font-medium">CO₂ A1–A3: {batch.co2_a1a3} kg CO₂e/kg</span>
                            <span className="text-gray-300">•</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              batch.co2_verification === 'Dahili Hesaplama'
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-green-50 text-green-700'
                            }`}>
                              {batch.co2_verification}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs text-gray-500 font-medium">
                              {batch.olusturan} • {batch.gonderilme_tarihi}
                            </span>
                          </div>
                        </div>
                      </div>

                      {rejectId === batch.id ? (
                        <div className="mt-3 space-y-3 bg-red-50 border border-red-100 rounded-xl p-4">
                          <p className="text-xs font-black text-red-700 uppercase tracking-wider">Hatalı Alanları İşaretle</p>
                          <div className="grid grid-cols-2 gap-2">
                            {REJECTABLE_FIELDS.map(f => (
                              <label key={f.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs font-bold transition-colors ${
                                rejectFields.includes(f.key)
                                  ? 'bg-red-100 border-red-400 text-red-800'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
                              }`}>
                                <input type="checkbox" checked={rejectFields.includes(f.key)}
                                  onChange={() => toggleRejectField(f.key)}
                                  className="accent-red-600" />
                                {f.label}
                              </label>
                            ))}
                          </div>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Red gerekçesini yazın... (zorunlu)"
                            rows={2}
                            className="w-full px-3 py-2 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRejectBatch(batch.id)}
                              className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40"
                              disabled={!rejectReason.trim()}
                            >
                              Reddet
                            </button>
                            <button
                              onClick={() => { setRejectId(null); setRejectReason(''); setRejectFields([]); }}
                              className="px-4 py-1.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              İptal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/batches/${batch.id}`); }}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Eye size={13} /> İçeriği Gör
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApproveBatch(batch.id); }}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle2 size={13} /> Onayla & Yayınla
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setRejectId(batch.id); }}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <XCircle size={13} /> Reddet
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Kritik Uyarılar */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  Acil Aksiyon Gerektiren Uyarılar
                </h2>
                <div className="space-y-3">
                  {cbamWarnings.map((p, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                      <Flag size={16} className="text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-red-800">{p.product_name}</p>
                        <p className="text-xs text-red-600 font-medium">CO₂: {p.co2_cradle_to_gate_kg} kg/kg — CBAM limitini ({CBAM_LIMIT} kg/kg) aşıyor</p>
                      </div>
                    </div>
                  ))}
                  {CERT_ALERTS.filter(c => c.days_left <= 10).map((c, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                      <Clock size={16} className="text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-orange-800">{c.product} — {c.cert}</p>
                        <p className="text-xs text-orange-600 font-medium">
                          {c.days_left <= 0 ? 'SÜRESİ DOLDU' : `${c.days_left} gün kaldı`} • {c.expiry}
                        </p>
                      </div>
                    </div>
                  ))}
                  {INCOMPLETE.filter(p => p.missing.length >= 3).map((p, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                      <AlertTriangle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-yellow-800">{p.product} ({p.id})</p>
                        <p className="text-xs text-yellow-600 font-medium">Eksik: {p.missing.join(', ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Son Aktiviteler */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <Activity size={16} className="text-blue-500" />
                  Son Sistem Aktiviteleri
                </h2>
                <div className="space-y-3">
                  {ACCESS_LOGS.slice(0, 5).map((log, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <User size={12} className="text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {log.action} — <span className="text-blue-600">{log.product}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium">{log.user} • {log.timestamp}</p>
                      </div>
                      <RoleBadge role={log.role} />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('access')}
                  className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Tümünü Gör →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 2 — PASAPORT YÖNETİMİ
        ════════════════════════════════════════ */}
        {activeTab === 'passports' && (
          <div className="space-y-8">

            {/* Onay Bekleyen Banner */}
            {pendingBatches.length > 0 && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
                <div className="flex items-center gap-3">
                  <Zap size={15} className="text-amber-600 shrink-0" />
                  <span className="text-sm font-black text-amber-800">
                    {pendingBatches.length} batch onay bekliyor
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="text-xs font-black text-amber-700 hover:text-amber-900 transition-colors"
                >
                  Genel Bakış'ta İncele →
                </button>
              </div>
            )}

            {/* Pasaport Tablosu */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList size={16} className="text-blue-600" />
                  Tüm Pasaportlar
                </h2>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="ID veya ürün adı ara..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                  />
                  <span className="text-xs text-gray-400 font-bold whitespace-nowrap">{filteredProducts.length} kayıt</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['ID & Ürün', 'Pasaport Durumu', 'Versiyon', 'Veri Kaynağı', 'Blokzincir Mühürü'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded block w-max mb-1">{p.id}</span>
                          <span className="text-sm font-bold text-gray-900">{p.product_name}</span>
                        </td>
                        <td className="px-5 py-4">
                          {pendingStatusChange?.id === p.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-500">{p.passport_status} →</span>
                              <span className="text-xs font-black text-blue-700">{pendingStatusChange.status}</span>
                              <button
                                onClick={() => { handleStatusChange(p.id, pendingStatusChange.status); setPendingStatusChange(null); }}
                                className="px-2 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Onayla
                              </button>
                              <button
                                onClick={() => setPendingStatusChange(null)}
                                className="px-2 py-1 border border-gray-200 text-gray-500 text-[10px] font-black rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                İptal
                              </button>
                            </div>
                          ) : (
                            <select
                              value={p.passport_status}
                              onChange={e => {
                                const newStatus = e.target.value as PassportStatus;
                                if (newStatus === p.passport_status) return;
                                if (newStatus === 'Geri Çağrıldı' || newStatus === 'Arşivlendi') {
                                  setPendingStatusChange({ id: p.id, status: newStatus });
                                } else {
                                  handleStatusChange(p.id, newStatus);
                                }
                              }}
                              className="text-xs font-bold border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {(['Taslak', 'Yayında', 'Arşivlendi', 'Geri Çağrıldı'] as PassportStatus[]).map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-mono font-black text-gray-700 bg-gray-100 px-2 py-1 rounded">v{p.version}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg ${
                            p.data_source === 'SAP/ERP' ? 'bg-green-50 text-green-700' :
                            p.data_source === 'API'     ? 'bg-blue-50 text-blue-700'   :
                                                          'bg-yellow-50 text-yellow-700'
                          }`}>
                            {p.data_source === 'SAP/ERP' ? <Zap size={11} /> : p.data_source === 'API' ? <Database size={11} /> : <Edit3 size={11} />}
                            {p.data_source}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {p.blockchain_timestamp ? (
                            <div className="flex items-center gap-1.5">
                              <Shield size={12} className="text-green-600" />
                              <span className="text-[10px] font-mono font-bold text-green-700">{p.blockchain_timestamp.split('T')[0]}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-bold italic">Mühürsüz</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Versiyon Geçmişi */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <GitBranch size={16} className="text-purple-600" />
                Versiyon Geçmişi (Audit Trail)
              </h2>
              <div className="relative border-l-2 border-gray-100 ml-3 space-y-5">
                {VERSION_HISTORY.map((v, i) => (
                  <div key={i} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-purple-300 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 block" />
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{v.id}</span>
                          <span className="text-[10px] font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded">v{v.version}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold">{v.at}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">{v.changes}</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-1">→ {v.by}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 3 — COMPLIANCE & ALARMLAR
        ════════════════════════════════════════ */}
        {activeTab === 'compliance' && (
          <div className="space-y-8">

            {/* CBAM Emisyon Takibi */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Flag size={16} className="text-red-500" />
                  CBAM Emisyon Limit Takibi
                </h2>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded">Eşik: {CBAM_LIMIT} kg CO₂e/kg</span>
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Uyarı: &gt; {(CBAM_LIMIT * 0.85).toFixed(2)} kg</span>
                </div>
              </div>
              <div className="space-y-4">
                {products.map((p, i) => {
                  const co2 = p.co2_cradle_to_gate_kg;
                  const pct = Math.min((co2 / (CBAM_LIMIT * 1.5)) * 100, 100);
                  const isOver = co2 > CBAM_LIMIT;
                  const isWarn = co2 > CBAM_LIMIT * 0.85 && !isOver;
                  return (
                    <div key={i} className={`p-4 rounded-2xl border ${isOver ? 'bg-red-50 border-red-200' : isWarn ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isOver ? <Flag size={14} className="text-red-600" /> : isWarn ? <AlertTriangle size={14} className="text-yellow-600" /> : <CheckCircle2 size={14} className="text-green-600" />}
                          <span className="text-sm font-black text-gray-900">{p.product_name}</span>
                          <span className="text-[10px] font-mono text-gray-400">{p.id}</span>
                        </div>
                        <span className={`text-sm font-black ${isOver ? 'text-red-700' : isWarn ? 'text-yellow-700' : 'text-green-700'}`}>
                          {co2} kg CO₂e/kg
                        </span>
                      </div>
                      <div className="w-full bg-white rounded-full h-2 border border-gray-100">
                        <div className={`h-2 rounded-full ${isOver ? 'bg-red-500' : isWarn ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      {isOver && (
                        <p className="text-[10px] text-red-600 font-bold mt-2">
                          ⚠ AB CBAM limitini {(co2 - CBAM_LIMIT).toFixed(2)} kg aşıyor — Aksiyon gerekli
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sertifika Geçerlilik Takibi */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={16} className="text-orange-500" />
                  Sertifika Geçerlilik Takibi
                </h2>
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  {([
                    { key: 'tumu',     label: 'Tümü' },
                    { key: 'firma',    label: 'Firma Geneli' },
                    { key: 'urun-tipi', label: 'Ürün Tipi' },
                    { key: 'batch',    label: 'Batch' },
                  ] as { key: 'tumu' | CertType; label: string }[]).map(f => (
                    <button
                      key={f.key}
                      onClick={() => setCertFilter(f.key)}
                      className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors ${
                        certFilter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {CERT_ALERTS.filter(c => certFilter === 'tumu' || c.type === certFilter).map((c, i) => {
                  const expired  = c.days_left < 0;
                  const critical = !expired && c.days_left <= 10;
                  const warn     = !expired && !critical && c.days_left <= 60;
                  const TYPE_CFG = {
                    'firma':     { label: 'Firma Geneli', cls: 'bg-purple-100 text-purple-700' },
                    'urun-tipi': { label: 'Ürün Tipi',   cls: 'bg-blue-100 text-blue-700'     },
                    'batch':     { label: 'Batch',        cls: 'bg-gray-100 text-gray-600'     },
                  } as const;
                  return (
                    <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${
                      expired  ? 'bg-red-50 border-red-200'      :
                      critical ? 'bg-orange-50 border-orange-200' :
                      warn     ? 'bg-yellow-50 border-yellow-200' :
                                 'bg-white border-gray-100'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${expired || critical ? 'bg-red-100' : warn ? 'bg-yellow-100' : 'bg-green-100'}`}>
                          <CheckCircle2 size={16} className={expired || critical ? 'text-red-600' : warn ? 'text-yellow-600' : 'text-green-600'} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-black text-gray-900">{c.cert}</p>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${TYPE_CFG[c.type].cls}`}>
                              {TYPE_CFG[c.type].label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-medium">
                            {c.product}{c.id ? ` • ${c.id}` : ''} • {c.issuer}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-gray-600 font-bold">{c.expiry}</p>
                        <p className={`text-xs font-black mt-0.5 ${expired ? 'text-red-700' : critical ? 'text-orange-700' : warn ? 'text-yellow-700' : 'text-green-700'}`}>
                          {expired ? `${Math.abs(c.days_left)} gün önce doldu` : `${c.days_left} gün kaldı`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ECHA SVHC / REACH */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert size={16} className="text-blue-600" />
                  ECHA SVHC / REACH Uyumluluk Kontrolü
                </h2>
              </div>
              <p className="text-xs text-gray-400 font-medium mb-5">Son liste güncelleme: 2026-01-15 • {REACH_TOTAL} madde tarandı</p>

              {/* Özet Kart */}
              {(() => {
                const warnings   = REACH_LIST.filter(s => s.concentration >= s.threshold);
                const nearLimit  = REACH_LIST.filter(s => s.concentration < s.threshold && s.concentration >= s.threshold * 0.7);
                const hasIssues  = warnings.length > 0 || nearLimit.length > 0;
                return (
                  <div className="space-y-3">
                    {/* Özet banner */}
                    <div className={`flex items-center justify-between p-4 rounded-2xl border ${
                      warnings.length > 0  ? 'bg-red-50 border-red-200'      :
                      nearLimit.length > 0 ? 'bg-yellow-50 border-yellow-200' :
                                             'bg-green-50 border-green-100'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${warnings.length > 0 ? 'bg-red-100' : nearLimit.length > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                          {warnings.length > 0
                            ? <XCircle size={16} className="text-red-600" />
                            : nearLimit.length > 0
                              ? <AlertTriangle size={16} className="text-yellow-600" />
                              : <CheckCircle2 size={16} className="text-green-600" />}
                        </div>
                        <div>
                          <p className={`text-sm font-black ${warnings.length > 0 ? 'text-red-800' : nearLimit.length > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                            {warnings.length > 0
                              ? `${warnings.length} madde eşiği aşıyor — Beyan zorunlu`
                              : nearLimit.length > 0
                                ? `${nearLimit.length} madde eşiğe yaklaşıyor — Takip gerekli`
                                : `${REACH_TOTAL} madde tarandı — Uyarı yok`}
                          </p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">REACH Madde 33 • Eşik: %0.1 (Cd için %0.01)</p>
                        </div>
                      </div>
                      {!hasIssues && (
                        <span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-1 rounded-lg">SCIP Beyanı Gerekmez</span>
                      )}
                    </div>

                    {/* Tümünü Göster butonu — sadece uyarı yoksa */}
                    {!hasIssues && (
                      <button
                        onClick={() => setShowAllReach(v => !v)}
                        className="w-full text-xs font-black text-gray-400 hover:text-gray-600 py-2 border border-dashed border-gray-200 rounded-xl transition-colors"
                      >
                        {showAllReach ? 'Gizle ↑' : `Tüm ${REACH_TOTAL} maddeyi gör ↓`}
                      </button>
                    )}

                    {/* Tüm liste — genişletilmiş */}
                    {!hasIssues && showAllReach && REACH_LIST.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                        <div>
                          <p className="text-xs font-bold text-gray-800">{s.substance}</p>
                          <p className="text-[10px] text-gray-400 font-medium">CAS {s.cas} • Eşik: %{s.threshold} • Tespit: %{s.concentration.toFixed(3)}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-green-600" />
                          <span className="text-xs font-black text-green-700">Uyumlu</span>
                        </div>
                      </div>
                    ))}

                    {/* Sadece uyarı ve eşiğe yakın maddeler */}
                    {hasIssues && [...warnings, ...nearLimit].map((s, i) => {
                      const isOver = s.concentration >= s.threshold;
                      return (
                        <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${isOver ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                          <div>
                            <p className="text-xs font-black text-gray-900">{s.substance}</p>
                            <p className="text-[10px] text-gray-500 font-medium">CAS {s.cas} • Eşik: %{s.threshold}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-black ${isOver ? 'text-red-700' : 'text-yellow-700'}`}>
                              %{s.concentration.toFixed(3)} tespit edildi
                            </p>
                            <p className={`text-[10px] font-bold mt-0.5 ${isOver ? 'text-red-600' : 'text-yellow-600'}`}>
                              {isOver ? 'Eşik aşıldı' : `Eşiğin %${Math.round((s.concentration / s.threshold) * 100)}'i`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 4 — KULLANICI & ERİŞİM
        ════════════════════════════════════════ */}
        {activeTab === 'access' && (
          <div className="space-y-8">

            {/* Erişim Logları */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} className="text-blue-600" />
                  Erişim Logları (Son 30 Gün)
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-bold">
                    {logPage * LOGS_PER_PAGE + 1}–{Math.min((logPage + 1) * LOGS_PER_PAGE, ACCESS_LOGS.length)} / {ACCESS_LOGS.length} kayıt
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setLogPage(p => p - 1)}
                      disabled={logPage === 0}
                      className={`px-2.5 py-1 text-xs font-black border rounded-lg transition-colors ${logPage === 0 ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      ← Önceki
                    </button>
                    <span className="text-[10px] font-bold text-gray-400 px-1">
                      {logPage + 1} / {Math.ceil(ACCESS_LOGS.length / LOGS_PER_PAGE)}
                    </span>
                    <button
                      onClick={() => setLogPage(p => p + 1)}
                      disabled={(logPage + 1) * LOGS_PER_PAGE >= ACCESS_LOGS.length}
                      className={`px-2.5 py-1 text-xs font-black border rounded-lg transition-colors ${(logPage + 1) * LOGS_PER_PAGE >= ACCESS_LOGS.length ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      Sonraki →
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Kullanıcı', 'Rol', 'Aksiyon', 'Pasaport', 'Zaman', 'IP Adresi'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ACCESS_LOGS.slice(logPage * LOGS_PER_PAGE, (logPage + 1) * LOGS_PER_PAGE).map((log, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                              <User size={12} className="text-gray-500" />
                            </div>
                            <span className="text-xs font-bold text-gray-800">{log.user}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3"><RoleBadge role={log.role} /></td>
                        <td className="px-5 py-3"><span className="text-xs text-gray-700 font-medium">{log.action}</span></td>
                        <td className="px-5 py-3"><span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{log.product}</span></td>
                        <td className="px-5 py-3"><span className="text-xs text-gray-500 font-medium">{log.timestamp}</span></td>
                        <td className="px-5 py-3"><span className="text-[10px] font-mono text-gray-400">{log.ip}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rol & Yetki Matrisi */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Lock size={16} className="text-purple-600" />
                Rol & Yetki Matrisi
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3 pr-6">Özellik</th>
                      {['PUBLIC', 'CUSTOMER', 'SUPPLIER', 'ENGINEER', 'AUTHORITY', 'ADMIN'].map(r => (
                        <th key={r} className="text-center pb-3 px-4">
                          <RoleBadge role={r} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ACCESS_MATRIX.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="py-3 pr-6 text-sm font-medium text-gray-700 whitespace-nowrap">{row.feature}</td>
                        {row.access.map((has, j) => (
                          <td key={j} className="py-3 px-4 text-center">
                            {has
                              ? <CheckCircle2 size={16} className="text-green-500 mx-auto" />
                              : <XCircle size={16} className="text-gray-200 mx-auto" />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 5 — TEDARİK ZİNCİRİ
        ════════════════════════════════════════ */}
        {activeTab === 'supplychain' && (
          <div className="space-y-8">

            {/* Tedarikçi CO₂ Performansı */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" />
                Tedarikçi CO₂ Doğrulama Performansı
              </h2>
              <div className="space-y-4">
                {SUPPLIER_PERF.map((s, i) => (
                  <div key={i} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-black text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500 font-medium">{s.role} • {s.method}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.verified ? (
                          <span className="flex items-center gap-1 text-xs font-black text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                            <CheckCircle2 size={12} /> Doğrulanmış
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-black text-red-700 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                            <AlertTriangle size={12} /> Doğrulanmamış
                          </span>
                        )}
                        <span className={`text-xs font-black px-2 py-1 rounded-lg ${s.risk === 'Düşük' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          Risk: {s.risk}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-500 w-32 shrink-0">Veri Güvenilirliği</span>
                      <div className="flex-1 bg-white rounded-full h-2 border border-gray-100">
                        <div
                          className={`h-2 rounded-full ${s.accuracy >= 90 ? 'bg-green-500' : s.accuracy >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${s.accuracy}%` }}
                        />
                      </div>
                      <span className="text-sm font-black text-gray-900 w-10 text-right">%{s.accuracy}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium mt-2">Son güncelleme: {s.updated}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Lojistik Emisyon Rotası */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Truck size={16} className="text-gray-600" />
                Lojistik Emisyon Rotası
              </h2>
              <div className="space-y-3">
                {LOGISTICS.map((leg, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{leg.from} → {leg.to}</p>
                      <p className="text-xs text-gray-500 font-medium">{leg.method} • {leg.dist}</p>
                    </div>
                    <p className="text-xs font-black text-blue-700">{leg.co2}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-xs font-black text-blue-800">Toplam Lojistik Emisyonu</span>
                  <span className="text-sm font-black text-blue-900">0.085 kg CO₂e/kg</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 6 — RAPORLAMA
        ════════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <div className="space-y-8">

            {/* Bulk Export */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
                <Download size={16} className="text-blue-600" />
                Toplu Veri Dışa Aktarma (Bulk Export)
              </h2>

              {/* Filtreler */}
              <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={exportDateFrom}
                    onChange={e => setExportDateFrom(e.target.value)}
                    className="text-xs font-bold border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={exportDateTo}
                    onChange={e => setExportDateTo(e.target.value)}
                    className="text-xs font-bold border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Ürün / Batch</label>
                  <select
                    value={exportProduct}
                    onChange={e => setExportProduct(e.target.value)}
                    className="text-xs font-bold border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tüm Ürünler</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.id} — {p.product_name}</option>
                    ))}
                  </select>
                </div>
                <div className="ml-auto">
                  <p className="text-[10px] text-gray-400 font-medium">
                    {exportProduct === 'all'
                      ? `${products.length} ürün seçili`
                      : `1 ürün seçili`}
                    {' · '}
                    {exportDateFrom} → {exportDateTo}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'AB CBAM Portalı',  desc: 'Tüm emisyon verileri XML formatında',      icon: Globe,     color: 'blue',   format: 'XML', cbam: true  },
                  { label: 'Excel Raporu',      desc: 'Tüm pasaport verileri .xlsx formatında',   icon: FileText,  color: 'green',  format: 'XLSX', excel: true },
                  { label: 'JSON Export',       desc: 'Makine okunabilir ham veri',               icon: Database,  color: 'purple', format: 'JSON' },
                ].map((exp, i) => {
                  const Icon = exp.icon;
                  const colorMap = {
                    blue:   { bg: 'bg-blue-100',   icon: 'text-blue-600'   },
                    green:  { bg: 'bg-green-100',  icon: 'text-green-600'  },
                    purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
                  }[exp.color as 'blue' | 'green' | 'purple'];
                  return (
                    <button
                      key={i}
                      onClick={() => (exp as any).cbam ? setShowCbamInfo(true) : (exp as any).excel ? setShowExcelInfo(true) : setShowJsonInfo(true)}
                      className="flex flex-col items-start p-5 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-2xl transition-all group text-left"
                    >
                      <div className={`p-3 rounded-xl mb-3 ${colorMap.bg}`}>
                        <Icon size={20} className={colorMap.icon} />
                      </div>
                      <p className="text-sm font-black text-gray-900 group-hover:text-blue-700 transition-colors">{exp.label}</p>
                      <p className="text-xs text-gray-500 font-medium mt-1">{exp.desc}</p>
                      <span className="mt-3 text-[10px] font-black text-gray-400 bg-white px-2 py-1 rounded border border-gray-200">.{exp.format}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Eksik Veri Raporu */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={16} className="text-yellow-500" />
                  Eksik Veri Raporu
                </h2>
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  {([
                    { key: 'taslak',        label: 'Taslak',        count: INCOMPLETE.filter(p => p.status === 'Taslak').length },
                    { key: 'geri-cagrildi', label: 'Geri Çağrıldı', count: INCOMPLETE.filter(p => p.status === 'Geri Çağrıldı').length },
                  ] as { key: 'taslak' | 'geri-cagrildi'; label: string; count: number }[]).map(f => (
                    <button
                      key={f.key}
                      onClick={() => setIncompleteFilter(f.key)}
                      className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors ${
                        incompleteFilter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {f.label}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                        incompleteFilter === f.key ? 'bg-gray-100 text-gray-700' : 'bg-gray-200 text-gray-500'
                      }`}>{f.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {INCOMPLETE.filter(p =>
                  incompleteFilter === 'taslak' ? p.status === 'Taslak' : p.status === 'Geri Çağrıldı'
                ).map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIncomplete(p)}
                    className="w-full text-left p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{p.id}</span>
                        <span className="text-sm font-black text-gray-900">{p.product}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                          {p.missing.length} eksik alan
                        </span>
                        <span className="text-gray-300 group-hover:text-blue-400 transition-colors text-xs">→</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-gray-400 font-medium">v{p.version}</span>
                      <span className="text-[10px] text-gray-400 font-medium">·</span>
                      <span className="text-[10px] text-gray-400 font-medium">{p.data_source}</span>
                      <span className="text-[10px] text-gray-400 font-medium">·</span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {[...new Set(p.missing.map(m => m.section))].join(', ')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>

      {/* Eksik Veri Detay Modal */}
      {selectedIncomplete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedIncomplete(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{selectedIncomplete.id}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      selectedIncomplete.status === 'Taslak' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>{selectedIncomplete.status}</span>
                  </div>
                  <p className="text-sm font-black text-gray-900">{selectedIncomplete.product}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-gray-400 font-medium">v{selectedIncomplete.version}</span>
                    <span className="text-[10px] text-gray-400">·</span>
                    <span className="text-[10px] text-gray-400 font-medium">{selectedIncomplete.data_source}</span>
                    <span className="text-[10px] text-gray-400">·</span>
                    <span className="text-[10px] font-bold text-red-600">{selectedIncomplete.missing.length} eksik alan</span>
                  </div>
                </div>
                <button onClick={() => setSelectedIncomplete(null)} className="text-gray-400 hover:text-gray-600 font-black">✕</button>
              </div>
            </div>

            {/* Eksik alanlar — başlık bazlı gruplandırılmış */}
            <div className="p-5 space-y-1">
              {(() => {
                const sections = [...new Set(selectedIncomplete.missing.map(m => m.section))];
                return sections.map((section, si) => (
                  <div key={si}>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4 mb-1.5 first:mt-0">{section}</p>
                    {selectedIncomplete.missing.filter(m => m.section === section).map((m, mi) => (
                      <div key={mi} className="flex items-center gap-2 py-2 px-3 bg-red-50 rounded-xl border border-red-100 mb-1">
                        <XCircle size={13} className="text-red-400 shrink-0" />
                        <span className="text-xs font-bold text-gray-800">{m.field}</span>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* CBAM XML Bilgilendirme Modal */}
      {showCbamInfo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCbamInfo(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <div>
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Globe size={16} className="text-blue-600" />
                  AB CBAM Portalı — XML İçerik Gereksinimleri
                </h2>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">EU Implementing Regulation 2023/1773 · Annex I–II</p>
              </div>
              <button onClick={() => setShowCbamInfo(false)} className="text-gray-400 hover:text-gray-600 text-lg font-black">✕</button>
            </div>

            <div className="p-6 space-y-5">

              {/* Açıklama */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-xs text-blue-800 font-medium leading-relaxed">
                  CBAM kapsamında her çeyrek dönem sonunda AB Komisyonu'nun CBAM Geçiş Portalı'na XML formatında rapor iletilmesi zorunludur.
                  Aşağıdaki alanlar <span className="font-black">zorunlu (Z)</span> veya <span className="font-black">koşullu (K)</span> olarak işaretlenmiştir.
                </p>
              </div>

              {[
                {
                  title: '1. Beyan Bilgileri (Declarant)',
                  fields: [
                    { name: 'declarantEORI',      label: 'EORI Numarası',          z: true,  note: 'Kocaer YYS belgesiyle eşleşmeli' },
                    { name: 'declarantName',       label: 'Firma Adı',              z: true,  note: '' },
                    { name: 'declarantAddress',    label: 'Firma Adresi',           z: true,  note: '' },
                    { name: 'reportingPeriod',     label: 'Raporlama Dönemi',       z: true,  note: 'Q1/Q2/Q3/Q4 + yıl' },
                  ]
                },
                {
                  title: '2. İthal Mal Bilgileri (ImportedGoods)',
                  fields: [
                    { name: 'cnCode',             label: 'CN / GTİP Kodu',         z: true,  note: 'Örn: 7216.32 (IPE profiller)' },
                    { name: 'goodsDescription',   label: 'Mal Tanımı',             z: true,  note: '' },
                    { name: 'countryOfOrigin',    label: 'Menşe Ülke',             z: true,  note: 'TR (Türkiye)' },
                    { name: 'netMass',            label: 'Net Ağırlık (tonne)',     z: true,  note: '' },
                    { name: 'customsProcedure',   label: 'Gümrük Rejimi',          z: true,  note: '4000 (serbest dolaşıma giriş)' },
                  ]
                },
                {
                  title: '3. Üretim Tesisi (ProductionInstallation)',
                  fields: [
                    { name: 'installationName',   label: 'Tesis Adı',              z: true,  note: 'Kocaer Aliağa Tesisi' },
                    { name: 'installationId',     label: 'CBAM Tesis ID',          z: false, note: 'Tesis CBAM portala kayıtlıysa' },
                    { name: 'unlocode',           label: 'UN/LOCODE',              z: true,  note: 'TR IZM (İzmir/Aliağa)' },
                    { name: 'productionRoute',    label: 'Üretim Rotası',          z: true,  note: 'EAF (Elektrik Ark Fırını)' },
                  ]
                },
                {
                  title: '4. Gömülü Emisyon (EmbeddedEmissions)',
                  fields: [
                    { name: 'specificEmbeddedEmissions', label: 'Özgül Gömülü Emisyon', z: true,  note: 'tCO₂e/tonne — A1-A3 kapsamı' },
                    { name: 'directEmissions',    label: 'Doğrudan Emisyon',       z: true,  note: 'tCO₂e/tonne — üretim süreci' },
                    { name: 'indirectEmissions',  label: 'Dolaylı Emisyon',        z: true,  note: 'tCO₂e/tonne — elektrik kaynaklı' },
                    { name: 'emissionFactor',     label: 'Emisyon Faktörü',        z: false, note: 'Kullanılan elektrik şebekesine göre' },
                  ]
                },
                {
                  title: '5. Karbon Fiyatı (CarbonPrice)',
                  fields: [
                    { name: 'carbonPricePaid',    label: 'Ödenen Karbon Fiyatı',   z: false, note: 'Türkiye ETS henüz CBAM kapsamında değil → 0' },
                    { name: 'carbonPriceCurrency',label: 'Para Birimi',             z: false, note: 'TRY' },
                    { name: 'carbonPriceInstrument', label: 'Fiyatlandırma Aracı', z: false, note: 'ETS / Karbon Vergisi' },
                    { name: 'freeAllocation',     label: 'Ücretsiz Tahsisat',      z: false, note: 'Tonne cinsinden' },
                  ]
                },
                {
                  title: '6. Doğrulama (Verification)',
                  fields: [
                    { name: 'verifierName',       label: 'Doğrulayıcı Kuruluş',   z: false, note: 'Akredite bağımsız kuruluş' },
                    { name: 'verifierAccreditation', label: 'Akreditasyon No',     z: false, note: '' },
                    { name: 'verificationDate',   label: 'Doğrulama Tarihi',       z: false, note: '' },
                  ]
                },
              ].map((section, si) => (
                <div key={si}>
                  <p className="text-[11px] font-black text-gray-700 uppercase tracking-widest mb-2">{section.title}</p>
                  <div className="space-y-1">
                    {section.fields.map((f, fi) => (
                      <div key={fi} className="flex items-start gap-3 py-2 px-3 rounded-xl hover:bg-gray-50">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${f.z ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                          {f.z ? 'Z' : 'K'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-black text-gray-800">{f.label} </span>
                          <span className="text-[10px] font-mono text-gray-400">{f.name}</span>
                          {f.note && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{f.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                  <span className="font-black">Not:</span> Türkiye'nin ETS sistemi henüz AB CBAM kapsamında tanınmıyor. Dolayısıyla <span className="font-mono">carbonPricePaid = 0</span> olarak beyan edilecek. Bu durum ileride değişebilir.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Excel Raporu İçerik Modal */}
      {showExcelInfo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowExcelInfo(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <div>
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={16} className="text-green-600" />
                  Excel Raporu — Sheet Yapısı ve Kolonlar
                </h2>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">Admin panelindeki tüm veri alanları · 8 sheet</p>
              </div>
              <button onClick={() => setShowExcelInfo(false)} className="text-gray-400 hover:text-gray-600 text-lg font-black">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                <p className="text-xs text-green-800 font-medium leading-relaxed">
                  Her sheet ayrı bir veri grubunu temsil eder. Tarih aralığı ve ürün/batch filtresi tüm sheet'lere uygulanır.
                </p>
              </div>

              {[
                {
                  sheet: 'Sheet 1',
                  title: 'Pasaport Özeti',
                  columns: [
                    { name: 'Batch ID',              example: 'KCR-742' },
                    { name: 'Ürün Adı',              example: 'IPE 200 Yapısal Çelik Profil' },
                    { name: 'Kategori',              example: 'Structural Steel' },
                    { name: 'Pasaport Durumu',       example: 'Yayında' },
                    { name: 'Versiyon',              example: 'v1.2' },
                    { name: 'Veri Kaynağı',          example: 'SAP/ERP' },
                    { name: 'CO₂ (kg CO₂e/kg)',      example: '1.15' },
                    { name: 'CBAM Limiti Aşıldı mı', example: 'Hayır' },
                    { name: 'Blokzincir Mühürü',     example: '2026-03-10' },
                  ]
                },
                {
                  sheet: 'Sheet 2',
                  title: 'Onay Bekleyen Batch\'ler',
                  columns: [
                    { name: 'Batch ID',              example: 'PB-001' },
                    { name: 'Parti No',              example: 'KCR-2026-0315-B' },
                    { name: 'Ürün Tipi',             example: 'HEB 300 Geniş Başlıklı Profil' },
                    { name: 'Miktar (ton)',           example: '68.0' },
                    { name: 'Veri Kaynağı',          example: 'Manuel' },
                    { name: 'Oluşturan',             example: 'Furkan Yıldız' },
                    { name: 'Gönderilme Tarihi',     example: '2026-03-15 14:22' },
                    { name: 'CO₂ A1-A3',             example: '1.92' },
                    { name: 'CO₂ Doğrulama',         example: 'Dahili Hesaplama' },
                  ]
                },
                {
                  sheet: 'Sheet 3',
                  title: 'Sertifikalar',
                  columns: [
                    { name: 'Sertifika Adı',         example: 'ISO 9001 KYS' },
                    { name: 'Tipi',                  example: 'Firma Geneli' },
                    { name: 'Ürün / Kapsam',         example: 'Firma Geneli' },
                    { name: 'Veren Kuruluş',         example: 'TÜV NORD' },
                    { name: 'Son Geçerlilik',        example: '2026-04-15' },
                    { name: 'Kalan Gün',             example: '19' },
                    { name: 'Durum',                 example: 'Uyarı' },
                  ]
                },
                {
                  sheet: 'Sheet 4',
                  title: 'REACH / SVHC',
                  columns: [
                    { name: 'Madde Adı',             example: 'Lead (Pb)' },
                    { name: 'CAS No',                example: '7439-92-1' },
                    { name: 'Eşik (%)',              example: '0.1' },
                    { name: 'Tespit Edilen (%)',     example: '0.003' },
                    { name: 'Eşik Aşıldı mı',       example: 'Hayır' },
                    { name: 'SCIP Beyanı Gerekli mi', example: 'Hayır' },
                  ]
                },
                {
                  sheet: 'Sheet 5',
                  title: 'Tedarik Zinciri',
                  columns: [
                    { name: 'Tedarikçi Adı',        example: 'Erdemir A.Ş.' },
                    { name: 'Rolü',                  example: 'Ham Madde Tedarikçisi' },
                    { name: 'Doğrulanmış mı',        example: 'Evet' },
                    { name: 'Veri Güvenilirliği (%)', example: '97' },
                    { name: 'Doğrulama Yöntemi',     example: 'EPD Belgeli' },
                    { name: 'Son Güncelleme',        example: '2026-03-01' },
                    { name: 'Risk Seviyesi',         example: 'Düşük' },
                  ]
                },
                {
                  sheet: 'Sheet 6',
                  title: 'Lojistik Emisyon',
                  columns: [
                    { name: 'Rota No',               example: '1' },
                    { name: 'Kalkış',                example: 'Ereğli, Zonguldak' },
                    { name: 'Varış',                 example: 'Aliağa, İzmir' },
                    { name: 'Taşıma Yöntemi',        example: 'Karayolu' },
                    { name: 'Mesafe',                example: '850 km' },
                    { name: 'CO₂ (kg CO₂e/kg)',      example: '0.045' },
                  ]
                },
                {
                  sheet: 'Sheet 7',
                  title: 'Erişim Logları',
                  columns: [
                    { name: 'Kullanıcı',             example: 'inspector.mehmet@gtb.gov.tr' },
                    { name: 'Rol',                   example: 'AUTHORITY' },
                    { name: 'Aksiyon',               example: 'Pasaport PDF indirildi' },
                    { name: 'Pasaport',              example: 'KCR-742' },
                    { name: 'Zaman',                 example: '2026-03-15 14:32' },
                    { name: 'IP Adresi',             example: '195.142.x.x' },
                  ]
                },
                {
                  sheet: 'Sheet 8',
                  title: 'Versiyon Geçmişi (Audit Trail)',
                  columns: [
                    { name: 'Batch ID',              example: 'KCR-742' },
                    { name: 'Ürün',                  example: 'IPE 200' },
                    { name: 'Versiyon',              example: 'v1.2' },
                    { name: 'İşlemi Yapan',          example: 'mehmet.yilmaz@kocaer.com' },
                    { name: 'Tarih',                 example: '2026-03-10 08:42' },
                    { name: 'Değişiklik',            example: 'CO₂ değeri SAP entegrasyonu ile güncellendi' },
                  ]
                },
              ].map((s, si) => (
                <div key={si} className="border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <span className="text-[10px] font-black text-white bg-green-500 px-2 py-0.5 rounded">{s.sheet}</span>
                    <p className="text-xs font-black text-gray-800">{s.title}</p>
                    <span className="text-[10px] text-gray-400 font-medium ml-auto">{s.columns.length} kolon</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {s.columns.map((col, ci) => (
                      <div key={ci} className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs font-bold text-gray-700">{col.name}</span>
                        <span className="text-[10px] font-mono text-gray-400">{col.example}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* JSON Export İçerik Modal */}
      {showJsonInfo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowJsonInfo(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <div>
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Database size={16} className="text-purple-600" />
                  JSON Export — Şema Yapısı
                </h2>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">Makine okunabilir · CIRPASS / DPP ekosistemi uyumlu</p>
              </div>
              <button onClick={() => setShowJsonInfo(false)} className="text-gray-400 hover:text-gray-600 text-lg font-black">✕</button>
            </div>

            <div className="p-6 space-y-5">

              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                <p className="text-xs text-purple-800 font-medium leading-relaxed">
                  JSON export, Excel'den farklı olarak <span className="font-black">hiyerarşik</span> bir yapı kullanır. Her pasaport kendi sertifika, tedarik zinciri ve emisyon verilerini içinde taşır. Tarih aralığı ve ürün/batch filtresi uygulanır.
                </p>
              </div>

              {/* Şema */}
              <div className="bg-gray-900 rounded-2xl p-5 overflow-x-auto">
                <pre className="text-[11px] text-gray-300 font-mono leading-relaxed whitespace-pre">{`{
  "export_metadata": {
    "generated_at":   "2026-03-27T10:00:00Z",
    "generated_by":   "admin@kocaer.com",
    "date_range":     { "from": "2026-01-01", "to": "2026-03-27" },
    "product_filter": "all" | "KCR-742",
    "schema_version": "1.0"
  },

  "passports": [
    {
      "id":                      "KCR-742",
      "parti_no":                "KCR-2026-0310-A",
      "product_name":            "IPE 200 Yapısal Çelik Profil",
      "product_category":        "Structural Steel",
      "passport_status":         "Yayında",
      "version":                 "1.2",
      "data_source":             "SAP/ERP",
      "blockchain_timestamp":    "2026-03-10T08:42:11Z",

      "emissions": {
        "co2_cradle_to_gate_kg": 1.15,
        "cbam_limit":            2.0,
        "cbam_compliant":        true,
        "logistics_total_co2":   0.085,
        "logistics_routes": [
          {
            "from":    "Ereğli, Zonguldak",
            "to":      "Aliağa, İzmir",
            "method":  "Karayolu",
            "dist_km": 850,
            "co2":     0.045
          }
        ]
      },

      "certificates": [
        {
          "name":      "EN 10204 3.1",
          "type":      "batch",
          "issuer":    "Kocaer QC",
          "expiry":    "2027-03-10",
          "days_left": 348,
          "status":    "Geçerli"
        }
      ],

      "reach_svhc": [
        {
          "substance":     "Lead (Pb)",
          "cas":           "7439-92-1",
          "threshold_pct": 0.1,
          "detected_pct":  0.003,
          "exceeds":       false
        }
      ],

      "supply_chain": {
        "suppliers": [
          {
            "name":       "Erdemir A.Ş.",
            "role":       "Ham Madde Tedarikçisi",
            "verified":   true,
            "accuracy":   97,
            "method":     "EPD Belgeli",
            "risk":       "Düşük"
          }
        ]
      },

      "version_history": [
        {
          "version": "1.2",
          "by":      "mehmet.yilmaz@kocaer.com",
          "at":      "2026-03-10 08:42",
          "changes": "CO₂ değeri SAP entegrasyonu ile güncellendi"
        }
      ],

      "access_logs": [
        {
          "user":      "inspector.mehmet@gtb.gov.tr",
          "role":      "AUTHORITY",
          "action":    "Pasaport PDF indirildi",
          "timestamp": "2026-03-15 14:32",
          "ip":        "195.142.x.x"
        }
      ]
    }
  ]
}`}</pre>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                  <span className="font-black">Not:</span> access_logs alanı hassas veri içerir. Dışa aktarım yalnızca ADMIN yetkisiyle yapılabilmeli, üçüncü taraflarla paylaşılmamalıdır.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── BATCH SEÇİM MODAL'I ── */}
      {showBatchPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowBatchPicker(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-black text-gray-900">Batch Seçin</h2>
                <p className="text-xs text-gray-400 font-medium mt-0.5">Devam etmek istediğiniz DPP&apos;yi seçin</p>
              </div>
              <button
                onClick={() => setShowBatchPicker(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="px-4 py-3 max-h-80 overflow-y-auto space-y-1.5">
              {products.map((p) => {
                const isLoading = loadingBatch === p.id;
                const cfg = STATUS_CFG[p.passport_status];
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectExisting(p.id)}
                    disabled={loadingBatch !== null}
                    className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all disabled:opacity-60 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                          {p.id}
                        </span>
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          {p.passport_status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 truncate">{p.product_name}</p>
                    </div>
                    {isLoading ? (
                      <Loader2 size={16} className="text-blue-500 animate-spin shrink-0" />
                    ) : (
                      <ArrowRight size={15} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-[11px] text-gray-400 font-medium text-center">
                Seçim sonrası mevcut veriler otomatik yüklenir.
              </p>
            </div>
          </div>
        </div>
      )}

    </ProtectedRoute>
  );
}
