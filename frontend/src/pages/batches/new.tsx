import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import {
  ChevronRight, ChevronLeft, Database, FileSpreadsheet,
  PenLine, CheckCircle2, AlertCircle, Send, Zap,
  Factory, Package, FlaskConical, Leaf, Award, GitBranch,
  Plus, Trash2, Upload, Download, ArrowRight, X, Search, Loader2, Lock,
  Save, AlertTriangle, Clock,
} from 'lucide-react';

// ─── TİPLER ──────────────────────────────────────────────────────────────────
type IngestionMethod = 'ERP' | 'EXCEL' | 'MANUEL' | null;

interface BatchInfo {
  parti_no: string; tedarikci_parti_kodu: string;
  urun_no: string; urun_tipi: string;
  ocak_no: string; uretim_tarihi: string; miktar_ton: string;
}

interface Certification {
  id: number; cert_type: string; issuer: string;
  cert_no: string; issue_date: string; expiry_date: string; file_name: string;
}

interface SupplyStage {
  id: number; stage_name: string; organization: string; role: string;
  location: string; material_origin: string;
  process: string; material: string; quantity: string; unit: string; date: string;
}

interface HazardousSubstance {
  id: number; name: string; cas_no: string; concentration_pct: string; svhc: boolean;
}

interface DppData {
  // Ürün Kimliği & Teknik
  gtin: string; material_standard: string;
  celik_kalitesi: string; en_mm: string; boy_mm: string; kalinlik_mm: string; agirlik_m: string;
  // Kimyasal Kompozisyon
  mn_pct: string; c_pct: string; si_pct: string;
  p_pct: string; s_pct: string; n_pct: string;
  // Mekanik Özellikler
  yield_mpa: string; tensile_mpa: string; elongation_pct: string;
  impact_energy_j: string; impact_temp_c: string;
  // Sertifikalar
  certifications: Certification[];
  // Tedarik Zinciri
  supply_chain: SupplyStage[];
  // Sürdürülebilirlik & Ömür Sonu — EN 15804+A2 Kapsam Ayrımı
  co2_a1a3: string; co2_a3: string; co2_a4: string; co2_verification: string;
  epd_no: string; epd_valid_until: string; epd_url: string;
  recycled_content_pct: string; recyclability_pct: string;
  svhc_free: boolean; disposal_instructions: string;
  dismantling_difficulty: string; hazardous_materials: boolean; hazardous_substances: HazardousSubstance[];
  // Üretici & Tesis
  uretici_adi: string; uretici_website: string; uretici_email: string;
  uretici_adres: string; uretici_vergi_no: string;
  tesis_adi: string; tesis_ulkesi: string; tesis_gln: string; tesis_adres: string;
}

// ─── SABİTLER ────────────────────────────────────────────────────────────────
interface UrunKatalog {
  urun_no: string; urun_tipi: string; gtin: string;
  hs_code: string;
  malzeme_standard: string; celik_kalitesi: string;
  agirlik_m: string; en_mm: string; kalinlik_mm: string;
}

const URUN_KATALOGU: UrunKatalog[] = [
  { urun_no: 'IPE-100', urun_tipi: 'IPE 100 Yapısal Çelik Profil',              gtin: '8691234567890', hs_code: '7216.32', malzeme_standard: 'EN 10025-2',  celik_kalitesi: 'S355JR', agirlik_m: '8.1',  en_mm: '100', kalinlik_mm: '5.7'  },
  { urun_no: 'IPE-200', urun_tipi: 'IPE 200 Yapısal Çelik Profil',              gtin: '8691234567891', hs_code: '7216.32', malzeme_standard: 'EN 10025-2',  celik_kalitesi: 'S355JR', agirlik_m: '26.2', en_mm: '200', kalinlik_mm: '8.5'  },
  { urun_no: 'IPE-240', urun_tipi: 'IPE 240 Yapısal Çelik Profil',              gtin: '8691234567892', hs_code: '7216.32', malzeme_standard: 'EN 10025-2',  celik_kalitesi: 'S355JR', agirlik_m: '30.7', en_mm: '240', kalinlik_mm: '9.5'  },
  { urun_no: 'HEB-300', urun_tipi: 'HEB 300 Geniş Başlıklı Profil',             gtin: '8691234567893', hs_code: '7216.33', malzeme_standard: 'EN 10025-2',  celik_kalitesi: 'S355JR', agirlik_m: '117',  en_mm: '300', kalinlik_mm: '19.0' },
  { urun_no: 'HEA-200', urun_tipi: 'HEA 200 Hafif Geniş Başlıklı Profil',      gtin: '8691234567894', hs_code: '7216.33', malzeme_standard: 'EN 10025-2',  celik_kalitesi: 'S355JR', agirlik_m: '42.3', en_mm: '200', kalinlik_mm: '15.0' },
  { urun_no: 'UPN-160', urun_tipi: 'UPN 160 Oluk Profil',                       gtin: '8691234567895', hs_code: '7216.31', malzeme_standard: 'EN 10279',    celik_kalitesi: 'S235JR', agirlik_m: '18.8', en_mm: '160', kalinlik_mm: '7.5'  },
  { urun_no: 'ANG-100x100x10', urun_tipi: 'Köşebent 100x100x10 Eşit Köşebent', gtin: '8691234567996', hs_code: '7216.40', malzeme_standard: 'EN 10056-1', celik_kalitesi: 'S355JR', agirlik_m: '14.9', en_mm: '100', kalinlik_mm: '10.0' },
];

const DISMANTLING_OPTIONS = ['Çok Kolay', 'Kolay', 'Orta', 'Zor', 'Çok Zor'];
const CO2_VERIFICATION_OPTIONS = ['Üçüncü Taraf Doğrulamalı', 'EPD Belgeli', 'Dahili Hesaplama', 'Varsayılan Değer'];

const MAIN_STEPS = ['Batch Bilgileri', 'DPP Verileri', 'Önizleme'];

const DPP_SUBSTEPS = [
  { label: 'Teknik', icon: Package },
  { label: 'Kimyasal & Mekanik', icon: FlaskConical },
  { label: 'Sertifikalar', icon: Award },
  { label: 'Tedarik Zinciri', icon: GitBranch },
  { label: 'Sürdürülebilirlik', icon: Leaf },
  { label: 'Üretici & Tesis', icon: Factory },
];

// ─── ORTAK BİLEŞENLER ────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', placeholder = '', required = false, hint = '', suffix = '' }: {
  label: string; name?: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; hint?: string; suffix?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${suffix ? 'pr-14' : ''}`} />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, required = false }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
        <option value="">Seçiniz...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">{label}</h3>;
}

// ─── ANA ADIM GÖSTERGESİ ─────────────────────────────────────────────────────
function MainStepper({ current }: { current: number }) {
  const steps = MAIN_STEPS;
  const visualCurrent = current;

  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all
              ${i < visualCurrent ? 'bg-blue-600 text-white' : i === visualCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'}`}>
              {i < visualCurrent ? <CheckCircle2 size={18} /> : i + 1}
            </div>
            <span className={`text-[11px] font-bold mt-1.5 whitespace-nowrap ${i === visualCurrent ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-16 h-0.5 mb-5 mx-1 ${i < visualCurrent ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── DPP ALT-ADIM GÖSTERGESİ ─────────────────────────────────────────────────
function DppSubStepper({ current, onGoTo }: { current: number; onGoTo: (i: number) => void }) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {DPP_SUBSTEPS.map((s, i) => {
        const Icon = s.icon;
        return (
          <button key={i} type="button" onClick={() => onGoTo(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer
              ${i === current ? 'bg-[#e30613] text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
            <Icon size={12} />
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── ADIM 1 ──────────────────────────────────────────────────────────────────
function Step1BatchInfo({ data, onChange, erpImported, existingLoaded = false, onErpClick }: {
  data: BatchInfo;
  onChange: (d: BatchInfo) => void;
  erpImported: boolean;
  existingLoaded?: boolean;
  onErpClick: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const selectedUrun = URUN_KATALOGU.find((u) => u.urun_no === data.urun_no);

  const handleUrunSec = (urun_no: string) => {
    const urun = URUN_KATALOGU.find((u) => u.urun_no === urun_no);
    onChange({ ...data, urun_no, urun_tipi: urun?.urun_tipi ?? '' });
  };

  // Read-only alan kartı
  const ROField = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
    <div>
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
      <div className={`flex items-center gap-2 px-3.5 py-2.5 border border-gray-100 rounded-xl bg-gray-50 ${mono ? 'font-mono' : ''}`}>
        <Lock size={11} className="text-gray-300 shrink-0" />
        <span className="text-sm font-bold text-gray-700 truncate">{value || '—'}</span>
      </div>
    </div>
  );

  // ── READ-ONLY MOD (mevcut DPP yüklendiğinde) ────────────────────────────────
  if (existingLoaded) {
    return (
      <div className="relative">
        {/* Başlık */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl"><Factory size={20} className="text-blue-600" /></div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Üretim Partisi Bilgileri</h2>
              <p className="text-sm text-gray-500">Mevcut DPP — temel bilgiler salt okunur.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-black rounded-xl transition-colors"
          >
            <Database size={13} /> SAP&apos;tan Veri Çek
          </button>
        </div>

        {/* Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-green-100 rounded-xl text-green-700"><Database size={20} /></div>
                <h3 className="text-lg font-black text-gray-900">SAP Verisi Yenile</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6 font-medium">
                <span className="font-bold text-gray-800">{data.parti_no}</span> batch no&apos;lu partinin SAP verileri tekrar çekilsin mi? Çünkü devam eden bir DPP için farklı bir batch no&apos;lu partinin bilgileri çekilemez.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors">İptal</button>
                <button type="button" onClick={() => { setShowConfirm(false); onErpClick(); }} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm shadow-green-100">Evet, Veri Çek</button>
              </div>
            </div>
          </div>
        )}

        {/* Kilitli uyarı banner */}
        <div className="flex items-start gap-3 mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
          <Lock size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-800">Bu alanlar değiştirilemez</p>
            <p className="text-xs text-amber-700 font-medium mt-0.5">
              Parti numarası, ürün kodu ve üretim bilgileri DPP kimliğini oluşturur.
              Değişiklik için Admin ile iletişime geçin.
            </p>
          </div>
        </div>

        {/* Batch Kimliği */}
        <div className="mb-6">
          <SectionTitle label="Batch Kimliği" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ROField label="Parti Numarası" value={data.parti_no} mono />
            <ROField label="Tedarikçi Parti Kodu" value={data.tedarikci_parti_kodu} mono />
          </div>
        </div>

        {/* Ürün Bilgisi */}
        <div className="mb-6">
          <SectionTitle label="Ürün Bilgisi" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ROField label="Ürün Kodu" value={data.urun_no} mono />
            <ROField label="Ürün Tipi" value={data.urun_tipi} />
            <ROField label="GTIN" value={selectedUrun?.gtin ?? ''} mono />
            <ROField label="HS Code (GTİP)" value={selectedUrun?.hs_code ?? ''} mono />
          </div>
        </div>

        {/* Üretim Bilgisi */}
        <div>
          <SectionTitle label="Üretim Bilgisi" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ROField label="Ocak / Fırın No" value={data.ocak_no} mono />
            <ROField label="Üretim Tarihi" value={data.uretim_tarihi} />
            <ROField label="Miktar" value={data.miktar_ton ? `${data.miktar_ton} ton` : ''} />
          </div>
        </div>
      </div>
    );
  }

  // ── DÜZENLENEBILIR MOD (yeni DPP veya SAP aktarımı) ────────────────────────
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl"><Factory size={20} className="text-blue-600" /></div>
          <div>
            <h2 className="text-lg font-black text-gray-900">Üretim Partisi Bilgileri</h2>
            <p className="text-sm text-gray-500">Bu batch'e ait temel üretim bilgilerini girin.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onErpClick}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-black rounded-xl transition-colors"
        >
          <Database size={13} /> SAP&apos;tan Veri Çek
        </button>
      </div>

      {erpImported && (
        <div className="flex items-center gap-2 mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={14} className="text-green-600 shrink-0" />
          <p className="text-sm font-bold text-green-800">
            SAP&apos;tan aktarıldı — alanlar otomatik dolduruldu. İstediğiniz alanı düzenleyebilirsiniz.
          </p>
        </div>
      )}

      {/* BÖLÜM 1: Batch Kimliği */}
      <div className="mb-6">
        <SectionTitle label="Batch Kimliği" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            label="Parti Numarası (Kocaer)"
            value={data.parti_no}
            onChange={(v) => onChange({ ...data, parti_no: v })}
            placeholder="KCR-2026-XXXX-A"
            hint="Kocaer'in kendi üretim parti numarası"
            required
          />
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Tedarikçi Parti Kodu</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.tedarikci_parti_kodu}
                onChange={(e) => onChange({ ...data, tedarikci_parti_kodu: e.target.value })}
                placeholder="ERD-2026-XXXX"
                className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <button
                type="button"
                disabled={!data.tedarikci_parti_kodu}
                title="Tedarikçinin DPP API'sine bağlanarak kimyasal, CO₂ ve tedarik zinciri verilerini otomatik getirir"
                className="px-3 py-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black rounded-xl hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                onClick={() => alert('Bu özellik tedarikçi DPP API entegrasyonu tamamlandığında aktif olacaktır.\n\nEndpoint: GET /api/supplier-dpp/{tedarikci_parti_kodu}')}
              >
                DPP&apos;den Getir
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Hammadde tedarikçisinin kendi parti referansı</p>
          </div>
        </div>
      </div>

      {/* BÖLÜM 2: Ürün Bilgisi */}
      <div className="mb-6">
        <SectionTitle label="Ürün Bilgisi" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Ürün Kodu <span className="text-red-500">*</span>
            </label>
            <select
              value={data.urun_no}
              onChange={(e) => handleUrunSec(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Seçiniz...</option>
              {URUN_KATALOGU.map((u) => (
                <option key={u.urun_no} value={u.urun_no}>{u.urun_no} — {u.urun_tipi}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Katalog kodu — tüm batch'lerde sabit kalır</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">GTIN</label>
            <div className="w-full px-3.5 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-500 font-mono">
              {selectedUrun ? selectedUrun.gtin : '—'}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Ürün kodu seçilince otomatik gelir</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">HS Code (GTİP)</label>
            <div className="w-full px-3.5 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-500 font-mono">
              {selectedUrun ? selectedUrun.hs_code : '—'}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Gümrük tarife kodu — CBAM beyanında kullanılır</p>
          </div>
        </div>
      </div>

      {/* BÖLÜM 3: Üretim Bilgisi */}
      <div>
        <SectionTitle label="Üretim Bilgisi" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            label="Ocak / Fırın No"
            value={data.ocak_no}
            onChange={(v) => onChange({ ...data, ocak_no: v })}
            placeholder="EAF-03"
            required
          />
          <Field
            label="Üretim Tarihi"
            value={data.uretim_tarihi}
            onChange={(v) => onChange({ ...data, uretim_tarihi: v })}
            type="date"
            required
          />
          <Field
            label="Miktar (ton)"
            value={data.miktar_ton}
            onChange={(v) => onChange({ ...data, miktar_ton: v })}
            type="number"
            placeholder="42.5"
            required
          />
        </div>
      </div>
    </div>
  );
}

const MOCK_EXISTING_BATCHES = [
  { id: '1', parti_no: 'KCR-2026-0310-A', urun_tipi: 'IPE 200 Yapısal Çelik Profil', dpp_durum: 'Taslak' },
  { id: '2', parti_no: 'KCR-2026-0220-B', urun_tipi: 'HEA 200 Hafif Geniş Başlıklı Profil', dpp_durum: 'Yayınlandı' }
];

const MOCK_UPLOADED_FILES: Record<string, any[]> = {
  '1': [
    { id: 'f1', file_type: 'xlsx', file_name: 'kimyasal_kompozisyon_03.xlsx', uploaded_by: 'Ali Yılmaz', fields_imported: 12, file_size: '24 KB', uploaded_at: '2026-03-26 14:30' }
  ]
};

const DURUM_CLASS: Record<string, string> = {
  'Taslak': 'bg-amber-100 text-amber-700',
  'Yayınlandı': 'bg-green-100 text-green-700'
};

const CATEGORIES = ['Kimyasal Kompozisyon', 'Mekanik Özellikler', 'Sürdürülebilirlik'];

const DPP_FIELDS = [
  { category: 'Kimyasal Kompozisyon', key: 'c_pct', label: 'Karbon (C) %', required: true },
  { category: 'Kimyasal Kompozisyon', key: 'mn_pct', label: 'Mangan (Mn) %', required: true },
  { category: 'Mekanik Özellikler', key: 'yield_mpa', label: 'Akma Dayanımı (MPa)', required: true },
  { category: 'Mekanik Özellikler', key: 'tensile_mpa', label: 'Çekme Dayanımı (MPa)', required: true },
  { category: 'Sürdürülebilirlik', key: 'recycled_content_pct', label: 'Geri Dönüştürülmüş İçerik %', required: false }
];

const USER_EXCEL_HEADERS = ['— Eşleştirme Yok —', 'Karbon (C)', 'Mangan (Mn)', 'Akma (Yield)', 'Çekme (Tensile)', 'Geri Dönüşüm Oranı'];

const EXCEL_MOCK_VALUES: Record<string, string> = {
  'Karbon (C)': '0.18',
  'Mangan (Mn)': '1.45',
  'Akma (Yield)': '390',
  'Çekme (Tensile)': '510',
  'Geri Dönüşüm Oranı': '85'
};

const AUTO_MAPPING: Record<string, string> = {
  'c_pct': 'Karbon (C)',
  'mn_pct': 'Mangan (Mn)',
  'yield_mpa': 'Akma (Yield)',
  'tensile_mpa': 'Çekme (Tensile)',
  'recycled_content_pct': 'Geri Dönüşüm Oranı'
};

const FIELD_TO_BATCHINFO: Record<string, string> = {};
const FIELD_TO_DPPDATA: Record<string, string> = {
  'c_pct': 'c_pct', 'mn_pct': 'mn_pct', 'yield_mpa': 'yield_mpa', 'tensile_mpa': 'tensile_mpa', 'recycled_content_pct': 'recycled_content_pct'
};

interface ExcelImportData {
  batchInfo: Partial<BatchInfo>;
  dppData: Partial<DppData>;
}

// ─── ERP SABİTLERİ ───────────────────────────────────────────────────────────
const ERP_CONNECTIONS = [
  { id: 'SAP',    name: 'SAP S/4HANA',     version: 'ECC 6.0', status: 'connected'      as const, abbr: 'SAP', abbr_color: 'text-blue-700',   abbr_bg: 'bg-blue-50 border-blue-200'   },
  { id: 'LOGO',   name: 'Logo Tiger 3',     version: 'v3.82',   status: 'connected'      as const, abbr: 'LGO', abbr_color: 'text-orange-700', abbr_bg: 'bg-orange-50 border-orange-200' },
  { id: 'ORACLE', name: 'Oracle ERP Cloud', version: '—',       status: 'disconnected'   as const, abbr: 'ORC', abbr_color: 'text-gray-400',   abbr_bg: 'bg-gray-50 border-gray-200'   },
  { id: 'CUSTOM', name: 'Özel REST API',    version: '—',       status: 'not_configured' as const, abbr: 'API', abbr_color: 'text-gray-400',   abbr_bg: 'bg-gray-50 border-gray-200'   },
];

const ERP_SYNC_CATEGORIES = [
  { name: 'Batch Kimliği',      total: 5, fetched: 5, Icon: Package,      full: true  },
  { name: 'Kimyasal Bileşim',   total: 6, fetched: 6, Icon: FlaskConical, full: true  },
  { name: 'Mekanik Özellikler', total: 5, fetched: 4, Icon: Zap,          full: false },
  { name: 'Sürdürülebilirlik',  total: 6, fetched: 3, Icon: Leaf,         full: false },
  { name: 'Sertifikalar',       total: 1, fetched: 1, Icon: Award,        full: true  },
  { name: 'Tedarik Zinciri',    total: 3, fetched: 3, Icon: GitBranch,    full: true  },
];

const ERP_MISSING_FIELDS = [
  'Darbe Enerjisi (J)',
  'EPD Belge No',
  'Geri Dönüştürülmüş İçerik %',
  'Geri Dönüştürülebilirlik %',
];

// ERP'den çekilecek mock değerler
const ERP_MOCK_BATCHINFO: Partial<BatchInfo> = {
  parti_no: 'KCR-2026-0318-A', urun_no: 'IPE-200',
  urun_tipi: 'IPE 200 Yapısal Çelik Profil',
  ocak_no: 'EAF-03', uretim_tarihi: '2026-03-18', miktar_ton: '48.5',
};
const ERP_MOCK_DPPDATA: Partial<DppData> = {
  c_pct: '0.17', mn_pct: '1.48', si_pct: '0.32',
  p_pct: '0.018', s_pct: '0.012', n_pct: '0.007',
  yield_mpa: '385', tensile_mpa: '520', elongation_pct: '22',
};

// ─── ERP SYNC FLOW ────────────────────────────────────────────────────────────
function ErpSyncFlow({ onSync, onCancel }: { onSync: (d: ExcelImportData) => void; onCancel?: () => void }) {
  const [subStep, setSubStep] = useState<'select' | 'syncing' | 'done'>('select');
  const [selectedErp, setSelectedErp] = useState<string | null>(null);
  const [batchRef, setBatchRef] = useState('');
  const [syncedCount, setSyncedCount] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const selectedConn = ERP_CONNECTIONS.find(c => c.id === selectedErp);
  const canSync = selectedConn?.status === 'connected';
  const totalFetched = ERP_SYNC_CATEGORIES.reduce((s, c) => s + c.fetched, 0);
  const totalFields  = ERP_SYNC_CATEGORIES.reduce((s, c) => s + c.total, 0);

  // Sıralı animasyon
  useEffect(() => {
    if (subStep !== 'syncing') return;
    if (syncedCount >= ERP_SYNC_CATEGORIES.length) {
      const t = setTimeout(() => setSubStep('done'), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setSyncedCount(n => n + 1), 480);
    return () => clearTimeout(t);
  }, [subStep, syncedCount]);

  // ── SEÇİM EKRANI ──────────────────────────────────────────────────────────
  if (subStep === 'select') return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors shrink-0">
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="p-2.5 bg-green-50 rounded-xl shrink-0"><Database size={20} className="text-green-600" /></div>
        <div>
          <h2 className="text-lg font-black text-gray-900">SAP&apos;tan Veri Çek</h2>
          <p className="text-sm text-gray-500">Bağlı ERP sisteminizi seçin ve veriyi otomatik çekin.</p>
        </div>
      </div>

      <div className="space-y-2.5 mb-6">
        {ERP_CONNECTIONS.map(conn => {
          const active = conn.status === 'connected';
          const sel    = selectedErp === conn.id;
          return (
            <button key={conn.id} type="button" disabled={!active}
              onClick={() => active && setSelectedErp(conn.id)}
              className={`w-full text-left border-2 rounded-xl px-4 py-3.5 transition-all ${
                sel    ? 'border-green-500 bg-green-50 shadow-sm shadow-green-100'
                : active ? 'border-gray-200 bg-white hover:border-green-400'
                : 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
              }`}>
              <div className="flex items-center gap-3">
                {/* Kısaltma rozeti */}
                <div className={`w-10 h-10 rounded-xl border text-[10px] font-black flex items-center justify-center shrink-0 ${conn.abbr_bg} ${conn.abbr_color}`}>
                  {conn.abbr}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-gray-900">{conn.name}</span>
                    <span className="text-[10px] font-mono text-gray-400">{conn.version}</span>
                    <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${
                      conn.status === 'connected'      ? 'bg-green-100 text-green-700'
                      : conn.status === 'disconnected' ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-400'
                    }`}>
                      {conn.status === 'connected' ? '● Bağlı' : conn.status === 'disconnected' ? '✕ Bağlantı Yok' : '○ Yapılandırılmadı'}
                    </span>
                  </div>
                  {conn.status === 'disconnected' && (
                    <p className="text-[11px] text-red-500 font-medium mt-0.5">Bağlantı kurulamıyor. Admin ile iletişime geçin.</p>
                  )}
                  {conn.status === 'not_configured' && (
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">Bu bağlantı henüz yapılandırılmadı.</p>
                  )}
                </div>
                {sel && <CheckCircle2 size={18} className="text-green-600 shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Batch referansı */}
      <div className="mb-4">
        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">
          ERP Batch / Sipariş Referansı <span className="text-gray-300 font-normal normal-case">(opsiyonel)</span>
        </label>
        <input
          type="text"
          placeholder="Örn: SAP-MO-2026-0318 veya boş bırakın"
          value={batchRef}
          onChange={e => setBatchRef(e.target.value)}
          disabled={!canSync}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white disabled:bg-gray-50 disabled:text-gray-400 font-mono"
        />
        <p className="text-[11px] text-gray-400 mt-1.5 font-medium">
          Belirtilmezse ERP&apos;deki en son parti otomatik seçilir.
        </p>
      </div>

      <button type="button" disabled={!canSync} onClick={() => { setShowConfirmModal(true); }}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-green-100">
        <Database size={15} /> Veri Çekmeyi Başlat
      </button>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-green-100 rounded-xl text-green-700"><Database size={20} /></div>
              <h3 className="text-lg font-black text-gray-900">Veri Çekme Onayı</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 font-medium">
              SAP&apos;den <span className="font-bold text-gray-800">{batchRef || 'en son'}</span> batch nolu veriler çekilmeye başlansın mı?
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors">İptal</button>
              <button type="button" onClick={() => { setShowConfirmModal(false); setSyncedCount(0); setSubStep('syncing'); }} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm shadow-green-100">Evet, Başla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── SENKRONİZASYON ANİMASYONU ─────────────────────────────────────────────
  if (subStep === 'syncing') return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-green-50 rounded-xl animate-pulse"><Database size={20} className="text-green-600" /></div>
        <div>
          <h2 className="text-lg font-black text-gray-900">Senkronizasyon Yapılıyor</h2>
          <p className="text-sm text-gray-500">{selectedConn?.name} üzerinden veriler çekiliyor…</p>
        </div>
      </div>

      {/* İlerleme çubuğu */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${(syncedCount / ERP_SYNC_CATEGORIES.length) * 100}%` }}
        />
      </div>

      {/* Kategori listesi */}
      <div className="space-y-2">
        {ERP_SYNC_CATEGORIES.map((cat, i) => {
          const done   = i < syncedCount;
          const active = i === syncedCount;
          const { Icon } = cat;
          return (
            <div key={cat.name} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ${
              done   ? 'bg-green-50 border-green-100'
              : active ? 'bg-blue-50 border-blue-200'
              : 'bg-gray-50 border-gray-100'
            }`}>
              <div className={`p-1.5 rounded-lg transition-colors ${
                done ? 'bg-green-100 text-green-600' : active ? 'bg-blue-100 text-blue-500' : 'bg-gray-100 text-gray-300'
              }`}>
                <Icon size={13} />
              </div>
              <span className={`flex-1 text-sm font-bold ${done ? 'text-gray-800' : active ? 'text-blue-700' : 'text-gray-400'}`}>
                {cat.name}
              </span>
              {done && (
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${cat.full ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {cat.fetched}/{cat.total} alan
                </span>
              )}
              {active && (
                <span className="text-[11px] font-black text-blue-600 animate-pulse">Çekiliyor…</span>
              )}
              {!done && !active && (
                <span className="text-[11px] text-gray-300 font-medium">Bekliyor</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── ÖZET / ONAY EKRANI ────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-green-50 rounded-xl"><CheckCircle2 size={20} className="text-green-600" /></div>
        <div>
          <h2 className="text-lg font-black text-gray-900">Senkronizasyon Tamamlandı</h2>
          <p className="text-sm text-gray-500">{selectedConn?.name} üzerinden veri çekimi başarılı.</p>
        </div>
      </div>

      {/* Özet istatistikler */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-black text-green-700">{totalFetched}</p>
          <p className="text-[11px] font-bold text-green-600 mt-0.5">Alan Aktarıldı</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-black text-amber-700">{ERP_MISSING_FIELDS.length}</p>
          <p className="text-[11px] font-bold text-amber-600 mt-0.5">Alan Eksik</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-black text-blue-700">{Math.round((totalFetched / totalFields) * 100)}%</p>
          <p className="text-[11px] font-bold text-blue-600 mt-0.5">Tamamlanma</p>
        </div>
      </div>

      {/* Kategori dökümü */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden mb-4">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategori</span>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Alan</span>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Durum</span>
        </div>
        {ERP_SYNC_CATEGORIES.map((cat, i) => {
          const { Icon } = cat;
          return (
            <div key={cat.name} className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 ${i < ERP_SYNC_CATEGORIES.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className="flex items-center gap-2">
                <Icon size={13} className="text-gray-400 shrink-0" />
                <span className="text-sm font-bold text-gray-700">{cat.name}</span>
              </div>
              <span className="text-sm font-black text-gray-600 text-center tabular-nums">{cat.fetched}/{cat.total}</span>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full text-center ${cat.full ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {cat.full ? 'Tam' : 'Eksik'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Eksik alanlar */}
      {ERP_MISSING_FIELDS.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5">
          <p className="text-xs font-black text-amber-700 mb-2">Eksik Alanlar — Manuel Tamamlanmalı</p>
          <div className="flex flex-wrap gap-1.5">
            {ERP_MISSING_FIELDS.map(f => (
              <span key={f} className="text-[11px] font-bold bg-white border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full">{f}</span>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={() => onSync({ batchInfo: ERP_MOCK_BATCHINFO, dppData: ERP_MOCK_DPPDATA })}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-green-100">
        <CheckCircle2 size={15} /> Onayla ve Forma Geç
      </button>
    </div>
  );
}

// ─── DOSYA GEÇMİŞİ EKRANI ────────────────────────────────────────────────────
function ExcelFileHistory({
  batchId, onUploadNew, onBack,
}: {
  batchId: string;
  onUploadNew: () => void;
  onBack: () => void;
}) {
  const batch = MOCK_EXISTING_BATCHES.find(b => b.id === batchId);
  const files = MOCK_UPLOADED_FILES[batchId] ?? [];

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-center gap-3 mb-5">
        <button type="button" onClick={onBack}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-black text-gray-900">Yüklenen Dosyalar</h2>
          <p className="text-sm text-gray-500">Bu DPP için daha önce aktarılan Excel / CSV dosyaları.</p>
        </div>
      </div>

      {/* Seçili batch özeti */}
      {batch && (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5">
          <div className="p-2 bg-white border border-gray-200 rounded-lg shrink-0">
            <Package size={16} className="text-gray-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
                {batch.parti_no}
              </span>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${DURUM_CLASS[batch.dpp_durum] ?? 'bg-gray-100 text-gray-600'}`}>
                {batch.dpp_durum}
              </span>
            </div>
            <p className="text-sm font-bold text-gray-800 truncate mt-0.5">{batch.urun_tipi}</p>
          </div>
        </div>
      )}

      {/* Dosya listesi */}
      {files.length > 0 ? (
        <div className="border border-gray-100 rounded-2xl overflow-hidden mb-5">
          {/* Tablo başlığı */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dosya Adı</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Alan</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Boyut</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Tarih</span>
          </div>
          {/* Satırlar */}
          {files.map((f, idx) => (
            <div
              key={f.id}
              className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3.5 ${idx < files.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50 transition-colors`}
            >
              {/* Dosya adı + ikon */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black
                  ${f.file_type === 'xlsx' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {f.file_type === 'xlsx' ? 'XLS' : 'CSV'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate leading-tight">{f.file_name}</p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">{f.uploaded_by}</p>
                </div>
              </div>
              {/* Alan sayısı */}
              <span className="text-xs font-black text-center text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                {f.fields_imported} alan
              </span>
              {/* Boyut */}
              <span className="text-xs text-gray-400 font-medium text-right whitespace-nowrap">{f.file_size}</span>
              {/* Tarih */}
              <span className="text-[11px] text-gray-400 font-medium text-right whitespace-nowrap">{f.uploaded_at}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-gray-200 rounded-2xl px-6 py-10 text-center mb-5">
          <FileSpreadsheet size={28} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-bold text-gray-400">Bu batch için henüz dosya yüklenmemiş.</p>
          <p className="text-xs text-gray-400 mt-1">İlk Excel / CSV aktarımını başlatmak için aşağıdaki butonu kullanın.</p>
        </div>
      )}

      {/* Eylem butonu */}
      <button
        type="button"
        onClick={onUploadNew}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-blue-100"
      >
        <Upload size={15} /> Yeni Dosya Yükle
      </button>
    </div>
  );
}

// ─── EXCEL UPLOAD FLOW ────────────────────────────────────────────────────────
function ExcelUploadFlow({ onImport, selectedBatchId }: { onImport: (d: ExcelImportData) => void; selectedBatchId?: string | null }) {
  const [subStep, setSubStep]   = useState<0 | 1>(0);
  const [fileName, setFileName] = useState('');

  // Hangi Excel sütunu hangi DPP alanına eşleşiyor
  const [mapping, setMapping] = useState<Record<string, string>>(() =>
    Object.fromEntries(DPP_FIELDS.map(f => [f.key, AUTO_MAPPING[f.key] ?? '— Eşleştirme Yok —']))
  );

  // Kaydedilecek değerler — Excel'den otomatik dolur, mühendis düzenleyebilir
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(DPP_FIELDS.map(f => {
      const col = AUTO_MAPPING[f.key];
      return [f.key, col ? (EXCEL_MOCK_VALUES[col] ?? '') : ''];
    }))
  );

  const handleMappingChange = (fieldKey: string, excelCol: string) => {
    setMapping(prev => ({ ...prev, [fieldKey]: excelCol }));
    // Yeni sütun seçilince değeri otomatik doldur
    const excelVal = excelCol === '— Eşleştirme Yok —' ? '' : (EXCEL_MOCK_VALUES[excelCol] ?? '');
    setValues(prev => ({ ...prev, [fieldKey]: excelVal }));
  };

  const autoCount = DPP_FIELDS.filter(f => mapping[f.key] !== '— Eşleştirme Yok —').length;

  const SUBSTEPS = ['Dosya Yükleme', 'Eşleştirme & Değerler'];

  const handleSave = () => {
    const batchInfo: Partial<BatchInfo> = {};
    const dppData: Partial<DppData> = {};
    // urun_tipi özel olarak katalogdan çek
    const urunNo = values['urun_kodu'];
    const katalog = URUN_KATALOGU.find(u => u.urun_no === urunNo);
    if (katalog) {
      (batchInfo as Record<string, string>)['urun_tipi'] = katalog.urun_tipi;
      Object.assign(dppData, {
        gtin: katalog.gtin, material_standard: katalog.malzeme_standard,
        celik_kalitesi: katalog.celik_kalitesi, en_mm: katalog.en_mm,
        agirlik_m: katalog.agirlik_m, kalinlik_mm: katalog.kalinlik_mm,
      });
    }
    DPP_FIELDS.forEach(f => {
      if (values[f.key] && FIELD_TO_BATCHINFO[f.key]) {
        (batchInfo as Record<string, string>)[FIELD_TO_BATCHINFO[f.key]] = values[f.key];
      }
      if (values[f.key] && FIELD_TO_DPPDATA[f.key]) {
        (dppData as Record<string, string>)[FIELD_TO_DPPDATA[f.key]] = values[f.key];
      }
    });
    onImport({ batchInfo, dppData });
  };

  const existingBatch = selectedBatchId
    ? MOCK_EXISTING_BATCHES.find(b => b.id === selectedBatchId)
    : null;

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-blue-50 rounded-xl"><FileSpreadsheet size={20} className="text-blue-600" /></div>
        <div>
          <h2 className="text-lg font-black text-gray-900">Excel / CSV ile Veri Aktarımı</h2>
          <p className="text-sm text-gray-500">Dosyanızı yükleyin, sütunları eşleştirin ve taslak olarak kaydedin.</p>
        </div>
      </div>
      {existingBatch && (
        <div className="flex items-center gap-2 mb-5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Package size={14} className="text-blue-600 shrink-0" />
          <p className="text-sm font-bold text-blue-800">
            Hedef DPP: <span className="font-mono">{existingBatch.parti_no}</span>
            <span className="font-normal text-blue-600 ml-2">— {existingBatch.urun_tipi}</span>
          </p>
        </div>
      )}

      {/* İç adım göstergesi */}
      <div className="flex items-center gap-0 mb-8">
        {SUBSTEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all
                ${i < subStep ? 'bg-blue-600 text-white' : i === subStep ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'}`}>
                {i < subStep ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] font-bold mt-1 whitespace-nowrap ${i === subStep ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < SUBSTEPS.length - 1 && (
              <div className={`w-24 h-0.5 mb-4 mx-1 ${i < subStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── ADIM 0: YÜKLEME ── */}
      {subStep === 0 && (
        <div className="space-y-5">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-gray-800 mb-1">Kocaer DPP Şablonu</p>
                <p className="text-xs text-gray-500 mb-3">İsterseniz şablonu indirip doldurun. Kendi Excel'inizi de yükleyebilirsiniz.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Batch Kimliği', 'Kimyasal Kompozisyon', 'Mekanik Özellikler', 'CO₂ Emisyonu', 'Sertifikalar'].map(col => (
                    <span key={col} className="text-[10px] font-bold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded">{col}</span>
                  ))}
                </div>
              </div>
              <button className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-blue-300 text-sm font-bold text-gray-700 rounded-xl transition-colors">
                <Download size={15} className="text-blue-500" /> .xlsx İndir
              </button>
            </div>
          </div>

          <div
            className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
            onClick={() => { setFileName('kimyasal_kompozisyon_mart2026.xlsx'); setSubStep(1); }}
          >
            <Upload size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-bold text-gray-600">Dosyayı buraya sürükleyin</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">veya tıklayarak seçin</p>
            <span className="text-[11px] font-bold bg-gray-200 text-gray-500 px-3 py-1 rounded-full">.xlsx &nbsp;·&nbsp; .csv</span>
          </div>
          <p className="text-center text-xs text-gray-400">Demo için alana tıklayın — örnek kimyasal kompozisyon verisi yüklenecektir.</p>
        </div>
      )}

      {/* ── ADIM 1: EŞLEŞTİRME & DEĞERLER ── */}
      {subStep === 1 && (
        <div className="space-y-4">

          {/* Dosya + özet */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={16} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-800">{fileName}</span>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-bold">{Object.keys(EXCEL_MOCK_VALUES).length} sütun okundu</span>
              <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-bold">{autoCount} alan otomatik eşleşti</span>
            </div>
            <button onClick={() => { setFileName(''); setSubStep(0); }} className="text-gray-400 hover:text-gray-600">
              <X size={15} />
            </button>
          </div>

          {/* Uyarı notu */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium">
              Eşleştirilemeyen alanlar boş bırakılır — sonradan manuel olarak veya başka bir Excel yükleyerek tamamlanabilir.
            </p>
          </div>

          {/* Tablo başlığı */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-50 px-4 py-2.5 border-b border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-wider gap-2">
              <span className="col-span-3">DPP Alanı</span>
              <span className="col-span-3">Excel Sütunu</span>
              <span className="col-span-2">Excel'deki Değer</span>
              <span className="col-span-4">Kaydedilecek Değer</span>
            </div>

            {CATEGORIES.map(cat => {
              const fields = DPP_FIELDS.filter(f => f.category === cat);
              if (!fields.length) return null;
              return (
                <div key={cat}>
                  <div className="px-4 py-1.5 bg-gray-50 border-y border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{cat}</span>
                  </div>
                  {fields.map(field => {
                    const selectedCol = mapping[field.key];
                    const isMapped = selectedCol !== '— Eşleştirme Yok —';
                    const rawVal = isMapped ? (EXCEL_MOCK_VALUES[selectedCol] ?? '') : '';
                    const isAuto = !!AUTO_MAPPING[field.key];
                    return (
                      <div key={field.key} className={`grid grid-cols-12 items-center px-4 py-2.5 gap-2 border-b border-gray-50 last:border-0 ${!isMapped ? 'bg-gray-50/50' : ''}`}>
                        {/* DPP Alanı */}
                        <div className="col-span-3 flex items-center gap-1">
                          <span className={`text-sm font-bold ${isMapped ? 'text-gray-800' : 'text-gray-400'}`}>{field.label}</span>
                          {field.required && <span className="text-red-400 text-xs">*</span>}
                        </div>

                        {/* Excel Sütunu dropdown */}
                        <div className="col-span-3">
                          <select
                            value={selectedCol}
                            onChange={e => handleMappingChange(field.key, e.target.value)}
                            className={`w-full text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                              !isMapped ? 'border-gray-200 text-gray-400' : isAuto ? 'border-green-200 text-green-700' : 'border-blue-200 text-blue-700'
                            }`}
                          >
                            {USER_EXCEL_HEADERS.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>

                        {/* Excel'deki ham değer — readonly */}
                        <div className="col-span-2">
                          {isMapped && rawVal ? (
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{rawVal}</span>
                          ) : (
                            <span className="text-xs text-gray-300 italic">—</span>
                          )}
                        </div>

                        {/* Kaydedilecek değer — düzenlenebilir */}
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={values[field.key]}
                            onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                            disabled={!isMapped}
                            placeholder={isMapped ? 'Değeri düzenleyin...' : 'Sütun seçilmedi'}
                            className={`w-full text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              !isMapped
                                ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-white border-gray-200 text-gray-800'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Butonlar */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => { setFileName(''); setSubStep(0); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={15} /> Geri
            </button>
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-400 font-medium">
                Eksik alanlar daha sonra tamamlanabilir.
              </p>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                <CheckCircle2 size={15} /> Taslak Olarak Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADIM 3 — DPP VERİLERİ (MANUEL) ─────────────────────────────────────────
function Step3DppData({ data, onChange, batchInfo, erpImported }: {
  data: DppData;
  onChange: (d: DppData) => void;
  batchInfo: BatchInfo;
  erpImported: boolean;
}) {
  const [sub, setSub] = useState(0);
  const katalog = URUN_KATALOGU.find(u => u.urun_no === batchInfo.urun_no);
  const InfoCard = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-black text-gray-700 font-mono">{value || '—'}</p>
    </div>
  );

  const set = (field: keyof DppData) => (v: string) => onChange({ ...data, [field]: v });
  const setB = (field: keyof DppData) => (v: boolean) => onChange({ ...data, [field]: v });

  // Sertifika yönetimi
  const addCert = () => onChange({ ...data, certifications: [...data.certifications, { id: Date.now(), cert_type: '', issuer: '', cert_no: '', issue_date: '', expiry_date: '', file_name: '' }] });
  const removeCert = (id: number) => onChange({ ...data, certifications: data.certifications.filter(c => c.id !== id) });
  const setCert = (id: number, field: keyof Certification, v: string) =>
    onChange({ ...data, certifications: data.certifications.map(c => c.id === id ? { ...c, [field]: v } : c) });

  // Tedarik zinciri yönetimi
  const addStage = () => onChange({ ...data, supply_chain: [...data.supply_chain, { id: Date.now(), stage_name: '', organization: '', role: '', location: '', material_origin: '', process: '', material: '', quantity: '', unit: 'ton', date: '' }] });
  const removeStage = (id: number) => onChange({ ...data, supply_chain: data.supply_chain.filter(s => s.id !== id) });
  const setStage = (id: number, field: keyof SupplyStage, v: string) =>
    onChange({ ...data, supply_chain: data.supply_chain.map(s => s.id === id ? { ...s, [field]: v } : s) });
  // ADIM 1'e ilk yazıldığında supply_chain[0]'ı otomatik oluştur
  const setStage1 = (field: keyof SupplyStage, v: string) => {
    if (data.supply_chain.length === 0) {
      onChange({ ...data, supply_chain: [{ id: Date.now(), stage_name: 'Hammadde Tedariki', organization: '', role: '', location: '', material_origin: '', process: '', material: '', quantity: '', unit: 'ton', date: '', [field]: v }] });
    } else {
      setStage(data.supply_chain[0].id, field, v);
    }
  };

  return (
    <div>
      {erpImported && (
        <div className="flex items-center gap-2 mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={15} className="text-green-600 shrink-0" />
          <p className="text-sm font-bold text-green-800">
            SAP&apos;tan aktarıldı — alanlar otomatik dolduruldu. Eksik veya yanlış bilgileri düzenleyebilirsiniz.
          </p>
        </div>
      )}
      <DppSubStepper current={sub} onGoTo={setSub} />

      {/* SUB 0: TEKNİK BİLGİLER */}
      {sub === 0 && (
        <div className="space-y-6">
          {/* Katalogdan gelen — okunur */}
          <div>
            <SectionTitle label="Ürün Özellikleri (Katalogdan)" />
            {!katalog && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 font-medium">
                Adım 1'de ürün kodu seçilmedi. Geri dönerek ürün seçin.
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <InfoCard label="GTIN" value={katalog?.gtin ?? ''} />
              <InfoCard label="Malzeme Standardı" value={katalog?.malzeme_standard ?? ''} />
              <InfoCard label="Çelik Kalitesi" value={katalog?.celik_kalitesi ?? ''} />
              <InfoCard label="En (mm)" value={katalog?.en_mm ?? ''} />
              <InfoCard label="Ağırlık (kg/m)" value={katalog?.agirlik_m ?? ''} />
              <InfoCard label="Et Kalınlığı (mm)" value={katalog?.kalinlik_mm ?? ''} />
            </div>
          </div>

          {/* Batch'e özel — düzenlenebilir */}
          <div>
            <SectionTitle label="Bu Batch'e Özel" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Boy / Uzunluk"
                value={data.boy_mm}
                onChange={set('boy_mm')}
                type="number"
                placeholder="6000"
                hint="Standart: 6000, 9000, 12000 mm"
                suffix="mm"
                required
              />
            </div>
          </div>

          </div>
      )}

      {/* SUB 1: KİMYASAL & MEKANİK */}
      {sub === 1 && (
        <div className="space-y-5">
          <SectionTitle label="Kimyasal Kompozisyon (Alaşım Oranları %)" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'C (Karbon)',    name: 'c_pct',  placeholder: '0.19', hint: 'Maks. %0.24' },
              { label: 'Mn (Manganez)', name: 'mn_pct', placeholder: '1.45', hint: 'Maks. %1.60' },
              { label: 'Si (Silisyum)', name: 'si_pct', placeholder: '0.30', hint: 'Maks. %0.55' },
              { label: 'P (Fosfor)',    name: 'p_pct',  placeholder: '0.022', hint: 'Maks. %0.030' },
              { label: 'S (Kükürt)',    name: 's_pct',  placeholder: '0.018', hint: 'Maks. %0.030' },
              { label: 'N (Azot)',      name: 'n_pct',  placeholder: '0.009', hint: 'Maks. %0.012' },
            ].map(f => (
              <Field key={f.name} label={f.label} name={f.name}
                value={(data as any)[f.name]} onChange={set(f.name as keyof DppData)}
                type="number" placeholder={f.placeholder} hint={f.hint} suffix="%" />
            ))}
          </div>
          {/* Fe hesaplanmış göster */}
          {(data.c_pct || data.mn_pct || data.si_pct) && (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Fe (Demir) %</span>
              <span className="text-sm font-black text-gray-700 font-mono ml-auto">
                {(100 - [data.c_pct, data.mn_pct, data.si_pct, data.p_pct, data.s_pct, data.n_pct]
                  .reduce((acc, v) => acc + (parseFloat(v) || 0), 0)).toFixed(3)}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">hesaplanmış</span>
            </div>
          )}
          <SectionTitle label="Mekanik Özellikler (Dayanım Testleri)" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Akma Dayanımı" value={data.yield_mpa}
              onChange={set('yield_mpa')} type="number" placeholder="370"
              suffix="MPa" hint="Min. standart: 355 MPa (S355JR)" />
            <Field label="Çekme Dayanımı" value={data.tensile_mpa}
              onChange={set('tensile_mpa')} type="number" placeholder="530"
              suffix="MPa" hint="470–630 MPa (S355JR)" />
            <Field label="Uzama Oranı" value={data.elongation_pct}
              onChange={set('elongation_pct')} type="number" placeholder="24"
              suffix="%" hint="Min. standart: %22" />
            <Field label="Darbe Enerjisi" value={data.impact_energy_j}
              onChange={set('impact_energy_j')} type="number" placeholder="27"
              suffix="J" hint="Charpy — Min. 27J (S355JR)" />
            <Field label="Test Sıcaklığı" value={data.impact_temp_c}
              onChange={set('impact_temp_c')} type="number" placeholder="20"
              suffix="°C" hint="JR: +20°C / J0: 0°C / J2: -20°C" />
          </div>
          </div>
      )}

      {/* SUB 2: SERTİFİKALAR */}
      {sub === 2 && (
        <div className="space-y-6">

          {/* GENEL SERTİFİKALAR — fabrika geneli, salt okunur */}
          <div>
            <SectionTitle label="Genel Sertifikalar (Fabrika Geneli)" />
            <div className="space-y-2">
              {[
                { name: 'ISO 9001:2015',  issuer: 'TÜV NORD',  expiry: '2026-06-15', scope: 'Kalite Yönetim Sistemi' },
                { name: 'ISO 14001:2015', issuer: 'TÜV SÜD',   expiry: '2026-06-15', scope: 'Çevre Yönetim Sistemi' },
                { name: 'EN 1090-1+A1',   issuer: 'TSE',        expiry: '2027-01-10', scope: 'Yapısal Çelik Üretim Yetkinliği' },
              ].map((c) => (
                <div key={c.name} className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-gray-800">{c.name}</p>
                      <p className="text-[11px] text-gray-400 font-medium">{c.scope} — {c.issuer}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-gray-400 shrink-0">Geçerlilik: {c.expiry}</span>
                </div>
              ))}
            </div>
          </div>

          {/* BATCH'E ÖZEL SERTİFİKALAR — her batch için ayrı */}
          <div>
            <SectionTitle label="Bu Batch'e Özel Sertifikalar" />
            <div className="space-y-4">
              {data.certifications.map((cert) => (
                <div key={cert.id} className="border border-blue-100 bg-blue-50/30 rounded-2xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Award size={16} className="text-blue-600" />
                      <SelectField label="" value={cert.cert_type}
                        onChange={(v) => setCert(cert.id, 'cert_type', v)}
                        options={['EN 10204 Tip 3.1', 'EN 10204 Tip 3.2', 'CE Marking', 'EPD Belgesi']}
                        required />
                    </div>
                    <button type="button" onClick={() => removeCert(cert.id)}
                      className="text-red-400 hover:text-red-600 transition-colors ml-2 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Sertifika Numarası" value={cert.cert_no}
                      onChange={(v) => setCert(cert.id, 'cert_no', v)}
                      placeholder="3.1-20260312-003" required />
                    <Field label="Veren Kuruluş" value={cert.issuer}
                      onChange={(v) => setCert(cert.id, 'issuer', v)}
                      placeholder="Kocaer Kalite Dep., TÜV..." />
                    <Field label="Düzenlenme Tarihi" value={cert.issue_date}
                      onChange={(v) => setCert(cert.id, 'issue_date', v)}
                      type="date" required />
                    <Field label="Geçerlilik Tarihi" value={cert.expiry_date}
                      onChange={(v) => setCert(cert.id, 'expiry_date', v)}
                      type="date" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      Sertifika PDF <span className="text-red-500">*</span>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-blue-200 rounded-xl bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                      <Upload size={16} className={cert.file_name ? 'text-green-500' : 'text-gray-400'} />
                      <span className={`text-sm font-medium ${cert.file_name ? 'text-green-700' : 'text-gray-500'}`}>
                        {cert.file_name || 'Bu batch\'e ait sertifika PDF\'ini yükleyin'}
                      </span>
                      <input type="file" accept=".pdf" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) setCert(cert.id, 'file_name', f.name); }} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addCert}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-bold text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <Plus size={16} /> Sertifika Ekle
            </button>
          </div>

          </div>
      )}

      {/* SUB 3: TEDARİK ZİNCİRİ */}
      {sub === 3 && (
        <div className="space-y-4">
          <SectionTitle label="Tedarik Zinciri ve İzlenebilirlik" />

          {/* ADIM 1 — HAMMADDEDEDİKİ (tedarikçi) — yarı dolu, düzenlenebilir */}
          <div className="border border-orange-200 bg-orange-50/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-orange-600 bg-orange-100 px-2.5 py-1 rounded-lg">ADIM 1</span>
                <span className="text-sm font-black text-gray-700">Hammadde Tedariki</span>
              </div>
              <span className="text-[10px] font-bold text-orange-500 bg-orange-100 px-2 py-0.5 rounded">Tedarikçiden</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Tedarikçi Adı" value={data.supply_chain[0]?.organization ?? ''}
                onChange={(v) => setStage1('organization', v)}
                placeholder="Erdemir A.Ş." required />
              <Field label="Rol" value={data.supply_chain[0]?.role ?? ''}
                onChange={(v) => setStage1('role', v)}
                placeholder="Hammadde Tedarikçisi" />
              <Field label="Lokasyon" value={data.supply_chain[0]?.location ?? ''}
                onChange={(v) => setStage1('location', v)}
                placeholder="Ereğli, Zonguldak" />
              <Field label="Tedarik Tarihi" value={data.supply_chain[0]?.date ?? ''}
                onChange={(v) => setStage1('date', v)}
                type="date" />
              <Field label="Malzeme" value={data.supply_chain[0]?.material ?? ''}
                onChange={(v) => setStage1('material', v)}
                placeholder="Çelik Billet" />
              <Field label="Menşei Ülke" value={data.supply_chain[0]?.material_origin ?? ''}
                onChange={(v) => setStage1('material_origin', v)}
                placeholder="Türkiye" />
              <Field label="Miktar" value={data.supply_chain[0]?.quantity ?? ''}
                onChange={(v) => setStage1('quantity', v)}
                type="number" placeholder="50"
                hint="Bu batch için kullanılan hammadde miktarı" />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Birim</label>
                <select value={data.supply_chain[0]?.unit ?? 'ton'}
                  onChange={(e) => setStage1('unit', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="ton">ton</option>
                  <option value="kg">kg</option>
                  <option value="adet">adet</option>
                </select>
              </div>
            </div>
            {batchInfo.tedarikci_parti_kodu && (
              <div className="flex items-center gap-2 bg-orange-100/60 border border-orange-200 rounded-lg px-3 py-2">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Tedarikçi Parti Kodu:</span>
                <span className="text-sm font-mono font-black text-orange-800">{batchInfo.tedarikci_parti_kodu}</span>
                <span className="text-[10px] text-orange-400 ml-1">Batch Bilgilerinden</span>
              </div>
            )}
          </div>

          {/* ADIM 2 — ÜRETİM (Kocaer) — batch bilgilerinden otomatik, salt okunur */}
          <div className="border border-blue-200 bg-blue-50/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-blue-600 bg-blue-100 px-2.5 py-1 rounded-lg">ADIM 2</span>
                <span className="text-sm font-black text-gray-700">Üretim</span>
              </div>
              <span className="text-[10px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded">Batch Bilgilerinden</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Üretici',    value: 'Kocaer Çelik A.Ş.' },
                { label: 'Rol',        value: 'Üretici' },
                { label: 'Tesis',      value: 'Aliağa Üretim Tesisi' },
                { label: 'Lokasyon',   value: 'Aliağa, İzmir, Türkiye' },
                { label: 'Üretim Tarihi', value: batchInfo.uretim_tarihi || '—' },
                { label: 'Ocak No',    value: batchInfo.ocak_no || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-blue-100 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                  <p className="text-sm font-black text-gray-700">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* EK AŞAMALAR — opsiyonel */}
          {data.supply_chain.slice(1).map((stage, idx) => (
            <div key={stage.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">ADIM {idx + 3}</span>
                <button type="button" onClick={() => removeStage(stage.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Aşama Adı" value={stage.stage_name}
                  onChange={(v) => setStage(stage.id, 'stage_name', v)} placeholder="Nakliye, Müşteri Teslimatı..." />
                <Field label="Organizasyon" value={stage.organization}
                  onChange={(v) => setStage(stage.id, 'organization', v)} placeholder="Nakliye firması..." />
                <Field label="Rol" value={stage.role}
                  onChange={(v) => setStage(stage.id, 'role', v)} placeholder="Taşıyıcı, Müşteri..." />
                <Field label="Lokasyon" value={stage.location}
                  onChange={(v) => setStage(stage.id, 'location', v)} placeholder="İstanbul, Türkiye" />
                <Field label="Tarih" value={stage.date}
                  onChange={(v) => setStage(stage.id, 'date', v)} type="date" />
                <Field label="Menşei Ülke" value={stage.material_origin}
                  onChange={(v) => setStage(stage.id, 'material_origin', v)} placeholder="Türkiye" />
                <Field label="Miktar" value={stage.quantity}
                  onChange={(v) => setStage(stage.id, 'quantity', v)}
                  type="number" placeholder="50" />
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Birim</label>
                  <select value={stage.unit}
                    onChange={(e) => setStage(stage.id, 'unit', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="ton">ton</option>
                    <option value="kg">kg</option>
                    <option value="adet">adet</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={() => {
            if (data.supply_chain.length === 0) {
              onChange({ ...data, supply_chain: [{ id: Date.now(), stage_name: 'Hammadde Tedariki', organization: '', role: '', location: '', material_origin: '', process: '', material: '', quantity: '', unit: 'ton', date: '' }] });
            } else {
              addStage();
            }
          }}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-bold text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <Plus size={16} /> Ek Aşama Ekle (Opsiyonel)
          </button>

          </div>
      )}

      {/* SUB 4: SÜRDÜRÜLEBİLİRLİK & ÖMÜR SONU */}
      {sub === 4 && (
        <div className="space-y-5">
          {/* ── KARBON AYAK İZİ (EN 15804+A2) ── */}
          <SectionTitle label="Karbon Ayak İzi (EN 15804+A2)" />

          {/* Yaşam Döngüsü Kapsam Görseli */}
          <div className="rounded-xl overflow-hidden border border-gray-200 text-xs font-bold">
            <div className="flex">
              <div className="flex-1 bg-blue-600 text-white px-3 py-2 text-center border-r border-blue-500">
                <div>A1</div>
                <div className="font-normal opacity-80 mt-0.5">Hammadde</div>
              </div>
              <div className="flex-1 bg-blue-600 text-white px-3 py-2 text-center border-r border-blue-500">
                <div>A2</div>
                <div className="font-normal opacity-80 mt-0.5">Nakliye</div>
              </div>
              <div className="flex-1 bg-blue-600 text-white px-3 py-2 text-center border-r border-white/30">
                <div>A3</div>
                <div className="font-normal opacity-80 mt-0.5">Üretim</div>
              </div>
              <div className="flex-1 bg-gray-100 text-gray-400 px-3 py-2 text-center">
                <div>A4</div>
                <div className="font-normal mt-0.5">Sevkiyat</div>
              </div>
            </div>
            <div className="flex text-center">
              <div className="flex-[3] bg-blue-50 text-blue-700 px-3 py-1 border-r border-blue-200 text-xs font-black tracking-wide">
                ← A1–A3 ZORUNLU (ESPR / CBAM) →
              </div>
              <div className="flex-1 bg-gray-50 text-gray-400 px-3 py-1 text-xs">
                İsteğe Bağlı
              </div>
            </div>
          </div>

          {/* Alan Girişleri */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Field label="A1–A3 Toplam *" name="co2_a1a3" value={data.co2_a1a3}
                onChange={set('co2_a1a3')} type="number" placeholder="1.85" required
                suffix="kg CO₂e/kg" hint="Hammadde + Nakliye + Üretim — ESPR zorunlu" />
            </div>
            <Field label="A3 Sadece Üretim" name="co2_a3" value={data.co2_a3}
              onChange={set('co2_a3')} type="number" placeholder="0.45"
              suffix="kg CO₂e/kg" hint="Yalnızca üretim aşaması" />
            <Field label="A4 Sevkiyat" name="co2_a4" value={data.co2_a4}
              onChange={set('co2_a4')} type="number" placeholder="0.08"
              suffix="kg CO₂e/kg" hint="Tesise nakliye emisyonu" />
          </div>
          <SelectField label="Doğrulama Durumu" value={data.co2_verification}
            onChange={(v) => onChange({ ...data, co2_verification: v })}
            options={CO2_VERIFICATION_OPTIONS} />

          {/* EPD Bilgileri */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black text-blue-700 uppercase tracking-widest">EPD — Çevre Ürün Beyanı</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">ESPR Zorunlu</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="EPD Belge Numarası" value={data.epd_no}
                onChange={set('epd_no')} placeholder="EPD-TR-2024-017-EN"
                required hint="EN 15804+A2 uyumlu EPD'nin resmi numarası" />
              <Field label="Geçerlilik Tarihi" value={data.epd_valid_until}
                onChange={set('epd_valid_until')} type="date" required />
              <div className="md:col-span-2">
                <Field label="EPD Belge URL (Opsiyonel)" value={data.epd_url}
                  onChange={set('epd_url')} placeholder="https://dpp.kocaersteel.com/docs/epd/..."
                  hint="Denetleyicilerin doğrudan erişebileceği belge bağlantısı" />
              </div>
            </div>
          </div>

          {/* Geri Dönüşüm Göstergeleri */}
          <SectionTitle label="Döngüsel Ekonomi Göstergeleri (EN 15804+A2)" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Geri Dönüştürülmüş İçerik" value={data.recycled_content_pct}
              onChange={set('recycled_content_pct')} type="number" placeholder="38"
              suffix="%" hint="Üretimde kullanılan geri dönüştürülmüş hammadde oranı — ESPR zorunlu" required />
            <Field label="Geri Dönüştürülebilirlik" value={data.recyclability_pct}
              onChange={set('recyclability_pct')} type="number" placeholder="100"
              suffix="%" hint="Ürünün ömür sonu geri dönüştürülebilirlik oranı — EN 15804+A2" required />
          </div>

          {/* CBAM Uyarısı */}
          {data.co2_a1a3 && parseFloat(data.co2_a1a3) > 2.0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">
                <span className="font-black">CBAM Uyarısı:</span> A1–A3 CO₂ değeri ({data.co2_a1a3} kg CO₂e/kg) değerlendirme eşiğini aşıyor.
              </p>
            </div>
          )}

          {/* Malzeme Uyum Beyanları */}
          <SectionTitle label="Malzeme Uyum Beyanları (REACH / RoHS)" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
              <input type="checkbox" id="svhc" checked={data.svhc_free}
                onChange={(e) => setB('svhc_free')(e.target.checked)} className="w-4 h-4 accent-green-600" />
              <div>
                <label htmlFor="svhc" className="text-sm font-bold text-gray-700 cursor-pointer">SVHC İçermez</label>
                <p className="text-[11px] text-gray-400 mt-0.5">REACH Tüzüğü — Çok Yüksek Endişe Veren Madde yok</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <input type="checkbox" id="hazmat" checked={data.hazardous_materials}
                onChange={(e) => setB('hazardous_materials')(e.target.checked)} className="w-4 h-4 accent-red-600" />
              <div>
                <label htmlFor="hazmat" className="text-sm font-bold text-gray-700 cursor-pointer">Tehlikeli Madde İçeriyor</label>
                <p className="text-[11px] text-gray-400 mt-0.5">Çelik ürünler için genellikle işaretlenmez</p>
              </div>
            </div>
          </div>

          {data.hazardous_materials && (
            <div className="border border-red-200 bg-red-50/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <p className="text-xs font-black text-red-700">ESPR Zorunlu Beyan — REACH Madde 33</p>
              </div>

              {/* Başlık satırı */}
              <div className="grid grid-cols-12 gap-2 px-1">
                <p className="col-span-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Madde Adı</p>
                <p className="col-span-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">CAS No</p>
                <p className="col-span-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Konsantrasyon</p>
                <p className="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">SVHC</p>
              </div>

              {/* Madde satırları */}
              {data.hazardous_substances.map((s) => (
                <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                  <input value={s.name} onChange={(e) => onChange({ ...data, hazardous_substances: data.hazardous_substances.map(x => x.id === s.id ? { ...x, name: e.target.value } : x) })}
                    placeholder="Kurşun (Pb)" className="col-span-4 px-3 py-2 border border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-300" />
                  <input value={s.cas_no} onChange={(e) => onChange({ ...data, hazardous_substances: data.hazardous_substances.map(x => x.id === s.id ? { ...x, cas_no: e.target.value } : x) })}
                    placeholder="7439-92-1" className="col-span-3 px-3 py-2 border border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-300 font-mono" />
                  <div className="col-span-3 relative">
                    <input value={s.concentration_pct} type="number" onChange={(e) => onChange({ ...data, hazardous_substances: data.hazardous_substances.map(x => x.id === s.id ? { ...x, concentration_pct: e.target.value } : x) })}
                      placeholder="0.005" className="w-full px-3 py-2 pr-7 border border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-300" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">%</span>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <input type="checkbox" checked={s.svhc} onChange={(e) => onChange({ ...data, hazardous_substances: data.hazardous_substances.map(x => x.id === s.id ? { ...x, svhc: e.target.checked } : x) })}
                      className="w-4 h-4 accent-red-600" />
                  </div>
                  <button type="button" onClick={() => onChange({ ...data, hazardous_substances: data.hazardous_substances.filter(x => x.id !== s.id) })}
                    className="col-span-1 flex justify-center text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button type="button"
                onClick={() => onChange({ ...data, hazardous_substances: [...data.hazardous_substances, { id: Date.now(), name: '', cas_no: '', concentration_pct: '', svhc: true }] })}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-red-200 rounded-xl text-sm font-bold text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors">
                <Plus size={14} /> Madde Ekle
              </button>
              <p className="text-[11px] text-gray-400">Konsantrasyon eşiği: ağırlıkça %0.1 — REACH Tüzüğü Madde 59</p>
            </div>
          )}

          {/* Ömür Sonu ve İmha */}
          <SectionTitle label="Ömür Sonu ve İmha" />
          <SelectField label="Söküm Zorluğu" value={data.dismantling_difficulty}
            onChange={(v) => onChange({ ...data, dismantling_difficulty: v })} options={DISMANTLING_OPTIONS} />
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              İmha / Geri Dönüşüm Talimatı <span className="text-red-500">*</span>
            </label>
            <textarea value={data.disposal_instructions}
              onChange={(e) => onChange({ ...data, disposal_instructions: e.target.value })}
              placeholder="Genel çöpe ATMAYIN. Ürün ömrünü tamamladığında yetkili çelik geri dönüşüm tesislerine teslim ediniz."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none" />
          </div>
          </div>
      )}

      {/* SUB 5: ÜRETİCİ & TESİS */}
      {sub === 5 && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 font-medium">
              Bu bilgiler sistem tarafından otomatik doldurulmaktadır. Değişiklik için sistem yöneticisiyle iletişime geçin.
            </p>
          </div>

          <SectionTitle label="Üretici Firma Bilgileri" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Üretici Adı',      value: 'Kocaer Çelik A.Ş.' },
              { label: 'Vergi Numarası',   value: 'TR1234567890' },
              { label: 'Website',          value: 'www.kocaersteel.com' },
              { label: 'DPP E-postası',    value: 'dpp@kocaersteel.com' },
              { label: 'EORI Numarası',    value: 'TR12345678900000' },
              { label: 'Adres',            value: 'Aliağa OSB, 35800 İzmir, Türkiye' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-700">{value}</p>
              </div>
            ))}
          </div>

          <SectionTitle label="Üretim Tesisi Bilgileri" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Tesis Adı',    value: 'Aliağa Üretim Tesisi' },
              { label: 'Tesis Kodu',   value: 'KCR-ALA-01' },
              { label: 'Ülke',         value: 'Türkiye' },
              { label: 'GLN Kodu',     value: '8690000000001' },
              { label: 'Koordinat',    value: '38.8008° K, 26.9719° D' },
              { label: 'Adres',        value: 'Aliağa OSB No:12, 35800 İzmir' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-700">{value}</p>
              </div>
            ))}
          </div>

          </div>
      )}
    </div>
  );
}

// ─── VALIDASYON YARDIMCISI ───────────────────────────────────────────────────
const getMissingFields = (batchInfo: BatchInfo, dppData: DppData): string[] => {
  const missing: string[] = [];
  if (!batchInfo.parti_no) missing.push('Parti Numarası');
  if (!batchInfo.urun_no) missing.push('Ürün Kodu');
  if (!batchInfo.uretim_tarihi) missing.push('Üretim Tarihi');
  if (!dppData.celik_kalitesi && !dppData.yield_mpa) missing.push('Çelik Kalitesi veya Dayanım Değeri');
  if (!dppData.co2_a1a3) missing.push('CO2 Emisyon Sınırı (Kapsam 1-3)');
  return missing;
};

// ─── ADIM 4 — ÖNİZLEME ───────────────────────────────────────────────────────
function Step4Preview({ batchInfo, dppData, erpImported }: { batchInfo: BatchInfo; dppData: DppData; erpImported: boolean }) {
  const methodLabel = erpImported ? 'ERP / SAP' : 'Manuel';
  const missingFields = getMissingFields(batchInfo, dppData);
  const isValid = missingFields.length === 0;

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div><p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
    <p className="text-sm font-bold text-gray-800 mt-0.5">{value || '—'}</p></div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-amber-50 rounded-xl"><CheckCircle2 size={20} className="text-amber-600" /></div>
        <div>
          <h2 className="text-lg font-black text-gray-900">Önizleme & Onaya Gönder</h2>
          <p className="text-sm text-gray-500">Verileri gözden geçirin. Onay sonrası DPP yayınlanacaktır.</p>
        </div>
      </div>

      {!isValid && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 text-red-700 font-black mb-2">
            <AlertTriangle size={18} />
            Onaya Göndermek İçin Eksik Alanlar Var
          </div>
          <p className="text-xs text-red-600 mb-3 font-medium">Bu taslağı kaydedebilirsiniz ancak onaya gönderebilmek için aşağıdaki tüm kritik alanları doldurmalısınız:</p>
          <div className="flex flex-wrap gap-2">
            {missingFields.map(f => (
              <span key={f} className="text-[11px] font-bold bg-white border border-red-200 text-red-700 px-2.5 py-1 rounded-lg shadow-sm">
                • {f}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Batch Bilgileri</h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Row label="Parti No" value={batchInfo.parti_no} />
          <Row label="Ürün Tipi" value={batchInfo.urun_tipi} />
          <Row label="Ocak No" value={batchInfo.ocak_no} />
          <Row label="Üretim Tarihi" value={batchInfo.uretim_tarihi} />
          <Row label="Miktar" value={batchInfo.miktar_ton ? `${batchInfo.miktar_ton} ton` : ''} />
          <Row label="Veri Kaynağı" value={methodLabel} />
        </div>
      </div>
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 font-medium">
          "Onaya Gönder" butonuna bastıktan sonra DPP Admin onayına iletilecektir.
          Onay alındıktan sonra blockchain'e kaydedilir ve yayına girer.
        </p>
      </div>
    </div>
  );
}

// ─── MEVCUT BATCH MOCK VERİLERİ ──────────────────────────────────────────────
interface ExistingBatchData { batchInfo: Partial<BatchInfo>; dppData: Partial<DppData> }

const MOCK_BATCH_DPP: Record<string, ExistingBatchData> = {
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

// ─── ANA SAYFA ────────────────────────────────────────────────────────────────
const EMPTY_DPP: DppData = {
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

export default function NewBatch() {
  const router = useRouter();
  const [step, setStep]           = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [erpOverlay, setErpOverlay]   = useState(false);
  const [erpImported, setErpImported] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [batchInfo, setBatchInfo] = useState<BatchInfo>({
    parti_no: '', tedarikci_parti_kodu: '', urun_no: '', urun_tipi: '',
    ocak_no: '', uretim_tarihi: '', miktar_ton: '',
  });
  const [dppData, setDppData] = useState<DppData>(EMPTY_DPP);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const missingFields = getMissingFields(batchInfo, dppData);
  const isValidToSubmit = missingFields.length === 0;

  const handleSaveDraft = () => {
    setIsSaving(true);
    // Simulate API delay
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 1000);
  };

  // Mevcut batch yükleme — ?batchId query param
  useEffect(() => {
    if (!router.isReady) return;
    const batchId = router.query.batchId as string | undefined;
    if (!batchId) return;
    const existing = MOCK_BATCH_DPP[batchId];
    if (!existing) return;
    setBatchLoading(true);
    const t = setTimeout(() => {
      setBatchInfo(prev => ({ ...prev, ...existing.batchInfo }));
      setDppData(prev => ({ ...prev, ...existing.dppData }));
      setExistingLoaded(true);
      setBatchLoading(false);
    }, 1300);
    return () => clearTimeout(t);
  }, [router.isReady, router.query.batchId]);

  const handleErpSync = (d: ExcelImportData) => {
    if (!existingLoaded) {
      setBatchInfo(prev => ({ ...prev, ...d.batchInfo }));
    }
    setDppData(prev => ({ ...prev, ...d.dppData }));
    setErpImported(true);
    setErpOverlay(false); // ERP overlay kapanır, form pre-dolu açılır
  };

  const canProceedStep0 = existingLoaded || !!(batchInfo.parti_no && batchInfo.urun_tipi && batchInfo.ocak_no && batchInfo.uretim_tarihi);
  const handleNext = () => { if (step === 0 && !canProceedStep0) return; setStep(s => Math.min(s + 1, 2)); };
  const handleBack = () => setStep(s => Math.max(s - 1, 0));
  const handleReset = () => {
    setSubmitted(false); setStep(0); setErpOverlay(false); setErpImported(false);
    setBatchInfo({ parti_no: '', tedarikci_parti_kodu: '', urun_no: '', urun_tipi: '', ocak_no: '', uretim_tarihi: '', miktar_ton: '' });
    setDppData(EMPTY_DPP);
  };

  if (submitted) {
    return (
      <ProtectedRoute allowedRoles={['ENGINEER', 'ADMIN']}>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"><Send size={32} className="text-green-600" /></div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900">Onaya Gönderildi!</h2>
            <p className="text-gray-500 font-medium mt-2 max-w-sm">
              <span className="font-bold text-gray-700">{batchInfo.parti_no}</span> numaralı batch DPP'si Admin onayına iletildi.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => router.push('/batches')}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
              Batch Listesine Dön
            </button>
            <button onClick={handleReset}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors">
              Yeni Batch Oluştur
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ENGINEER', 'ADMIN']}>
      <div className="max-w-3xl mx-auto py-10 px-4">
        <button type="button" onClick={() => router.push('/batches')}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors mb-8">
          <ChevronLeft size={16} /> Batch Listesine Dön
        </button>
        <div className="mb-2">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Yeni Batch & DPP Oluştur</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Üretim partisi bilgilerini girerek DPP oluşturun ve onaya gönderin.</p>
        </div>
        <div className="mt-10"><MainStepper current={step} /></div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-xl shadow-gray-100 min-h-[400px]">
          {/* Mevcut batch yüklenirken loading ekranı */}
          {batchLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
                <Loader2 size={28} className="text-blue-500 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-base font-black text-gray-800">Veriler Yükleniyor</p>
                <p className="text-sm text-gray-400 font-medium mt-1">Mevcut DPP bilgileri getiriliyor…</p>
              </div>
            </div>
          )}

          {!batchLoading && step === 0 && erpOverlay && (
            <ErpSyncFlow onSync={handleErpSync} onCancel={() => setErpOverlay(false)} />
          )}
          {!batchLoading && step === 0 && !erpOverlay && (
            <Step1BatchInfo
              data={batchInfo}
              onChange={setBatchInfo}
              erpImported={erpImported}
              existingLoaded={existingLoaded}
              onErpClick={() => setErpOverlay(true)}
            />
          )}
          {!batchLoading && step === 1 && <Step3DppData data={dppData} onChange={setDppData} batchInfo={batchInfo} erpImported={erpImported} />}
          {!batchLoading && step === 2 && <Step4Preview batchInfo={batchInfo} dppData={dppData} erpImported={erpImported} />}
        </div>

        {/* Loading veya ERP overlay açıkken dış nav butonları gizlenir */}
        {!erpOverlay && !batchLoading && (
          <div className="flex items-center justify-between mt-6">
            <button type="button" onClick={handleBack}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors ${step === 0 ? 'invisible' : ''}`}>
              <ChevronLeft size={16} /> Geri
            </button>
            
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <button type="button" onClick={handleSaveDraft} disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="text-gray-500" />}
                  {isSaving ? 'Kaydediliyor...' : 'Taslağı Kaydet'}
                </button>
                {lastSaved && !isSaving && (
                  <span className="text-[10px] font-bold text-gray-400 mt-1 flex items-center gap-1 mr-1">
                    <Clock size={10} /> Son kayıt: {lastSaved.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {step < 2 ? (
                <button type="button" onClick={handleNext}
                  disabled={step === 0 && !canProceedStep0}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-start">
                  Devam Et <ChevronRight size={16} />
                </button>
              ) : (
                <button type="button" onClick={() => isValidToSubmit && setSubmitted(true)}
                  disabled={!isValidToSubmit}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-100 disabled:opacity-40 disabled:cursor-not-allowed self-start">
                  <Send size={16} /> Onaya Gönder
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
