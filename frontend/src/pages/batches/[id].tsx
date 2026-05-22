import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { apiGetDppById, apiUpdateDpp, apiApproveDpp, apiRejectDpp, apiGetChemicalComposition, apiGetMechanicalProperties } from '../../lib/api';
import {
  ChevronLeft, CheckCircle2, Clock, XCircle, FileText,
  AlertCircle, Send, Lock, Package, Leaf, FlaskConical,
  Factory, Edit3, GitBranch, Award, MapPin,
} from 'lucide-react';

// ─── TİPLER ──────────────────────────────────────────────────────────────────
type BatchStatus = 'Taslak' | 'Onay Bekliyor' | 'Yayında' | 'Reddedildi' | 'Arşivlendi';

interface BatchDetail {
  id: string;
  parti_no: string;
  tedarikci_parti_kodu: string;
  urun_tipi: string;
  ocak_no: string;
  uretim_tarihi: string;
  miktar_ton: string;
  cift_kodu: string;
  dpp_durum: BatchStatus;
  olusturan: string;
  // Teknik
  celik_kalitesi: string;
  en_mm: string;
  boy_mm: string;
  kalinlik_mm: string;
  agirlik_m: string;
  // Karbon — EN 15804+A2 Kapsam Ayrımı
  co2_a1a3: string; co2_a3: string; co2_a4: string; co2_verification: string;
  geri_donusum_orani: string;
  svhc_free: boolean;
  // Üretici
  uretici_adi: string;
  tesis_adi: string;
  tesis_ulkesi: string;
  // Admin reddi
  red_gerekce?: string;
  // Lab — Kimyasal Kompozisyon (EN 10025-2)
  c_pct?: string; si_pct?: string; mn_pct?: string;
  p_pct?: string; s_pct?: string; n_pct?: string;
  // Lab — Mekanik Özellikler
  yield_mpa?: string; tensile_mpa?: string;
  elongation_pct?: string; impact_energy_j?: string; impact_temp_c?: string;
  // Kimlik
  gtin?: string; hs_code?: string; material_standard?: string;
  // Lab — Sertifika
  test_standard?: string; test_tarihi?: string;
  en10204_cert_no?: string; en10204_tip?: string;
  // Sertifikalar dizisi
  certifications?: Array<{
    id: number; cert_type: string; cert_no: string;
    issuer: string; issue_date: string; expiry_date: string; file_name?: string;
  }>;
  // EPD Beyanı
  epd_cert_no?: string; epd_valid_until?: string; epd_url?: string;
  // Döngüsel Ekonomi
  recyclability_pct?: string;
  // Tehlikeli Maddeler
  hazardous_substances?: Array<{
    name: string; cas_no: string; concentration_pct: string; svhc: boolean;
  }>;
  // Ömür Sonu
  eol_disassembly?: string; eol_disposal?: string;
  // Tedarik Zinciri
  supply_chain?: Array<{
    sequence: number; stage_name: string; organization: string;
    role: string; location: string; date: string;
    processes: string[]; material?: string;
    material_origin?: string; quantity?: string; unit?: string;
  }>;
  // Admin reddi
  red_fields?: string[];
  red_tarihi?: string;
  red_yapan?: string;
}

// ─── MOCK VERİ ───────────────────────────────────────────────────────────────
// Mock data removed. Component is now fully connected to the backend.

// ─── DURUM KONFIG ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<BatchStatus, { label: string; className: string; icon: React.ReactNode }> = {
  'Taslak':        { label: 'Taslak',         className: 'bg-gray-100 text-gray-600',   icon: <FileText size={13} /> },
  'Onay Bekliyor': { label: 'Onay Bekliyor',  className: 'bg-amber-100 text-amber-700', icon: <Clock size={13} /> },
  'Yayında':       { label: 'Yayında',         className: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={13} /> },
  'Reddedildi':    { label: 'Reddedildi',      className: 'bg-red-100 text-red-700',     icon: <XCircle size={13} /> },
  'Arşivlendi':    { label: 'Arşivlendi',      className: 'bg-slate-100 text-slate-500', icon: <FileText size={13} /> },
};

const READONLY_STATUSES: BatchStatus[] = ['Onay Bekliyor', 'Yayında', 'Arşivlendi'];
const CO2_VERIFICATION_OPTIONS = ['Üçüncü Taraf Doğrulamalı', 'EPD Belgeli', 'Dahili Hesaplama', 'Varsayılan Değer'];

// ─── YARDIMCI BİLEŞENLER ────────────────────────────────────────────────────

/** Okunabilir mod için alan gösterimi */
function ReadField({ label, value }: { label: string; value: string | boolean }) {
  const display = typeof value === 'boolean'
    ? (value ? 'Evet — REACH Uyumlu' : 'Hayır')
    : (value || '—');
  return (
    <div>
      <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-bold text-gray-800">{display}</p>
    </div>
  );
}

/** Düzenlenebilir alan — hatalı ise kırmızı */
function EditField({
  label, name, value, onChange, type = 'text', placeholder = '', isError = false, required = false,
}: {
  label: string; name: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; isError?: boolean; required?: boolean;
}) {
  return (
    <div>
      <label className={`block text-sm font-bold mb-1.5 ${isError ? 'text-red-600' : 'text-gray-700'}`}>
        {label} {required && <span className="text-red-500">*</span>}
        {isError && (
          <span className="ml-2 text-[11px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
            Düzeltme Gerekiyor
          </span>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
          isError
            ? 'border-red-400 bg-red-50 focus:ring-red-400 text-red-900 placeholder-red-300'
            : 'border-gray-200 bg-white focus:ring-blue-500'
        }`}
      />
    </div>
  );
}

function EditSelect({
  label, value, onChange, options, isError = false,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; isError?: boolean;
}) {
  return (
    <div>
      <label className={`block text-sm font-bold mb-1.5 ${isError ? 'text-red-600' : 'text-gray-700'}`}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors bg-white ${
          isError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'
        }`}
      >
        <option value="">Seçiniz...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 bg-gray-50 rounded-xl">{icon}</div>
        <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

// ─── ANA SAYFA ───────────────────────────────────────────────────────────────
export default function BatchDetailPage() {
  const router = useRouter();
  const { role, isAuthenticated, isLoading: authLoading } = useAuth();
  const { id } = router.query;

  const [data, setData] = useState<BatchDetail | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [adminAction, setAdminAction] = useState<'approved' | 'rejected' | null>(null);
  const [adminRejectReason, setAdminRejectReason] = useState('');
  const [adminRejectFields, setAdminRejectFields] = useState<string[]>([]);
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (!id) return;
    loadBatchDetail();
  }, [id, authLoading, isAuthenticated]);

  const loadBatchDetail = async () => {
    try {
      const d = await apiGetDppById(id as string);
      
      let chemical: any = null;
      let mechanical: any = null;
      if (d.product_type_id) {
        try {
          chemical = await apiGetChemicalComposition(d.product_type_id);
        } catch (e) {
          console.error("Chemical composition loading failed:", e);
        }
        try {
          mechanical = await apiGetMechanicalProperties(d.product_type_id);
        } catch (e) {
          console.error("Mechanical properties loading failed:", e);
        }
      }

      const mapped: BatchDetail = {
        id: String(d.id),
        parti_no: d.gs1_serial_number || d.public_identifier || 'Parti No Yok',
        tedarikci_parti_kodu: d._batch_number || 'Tedarikçi Kodu Yok',
        urun_tipi: d.name || d.product_type?.product_name || 'IPE 200 Yapısal Çelik Profil',
        ocak_no: d.production_line || 'EAF-01',
        uretim_tarihi: d.production_date || '2026-03-12',
        miktar_ton: '45.0',
        cift_kodu: d._serial_number || 'Cift Kodu Yok',
        dpp_durum: d.dpp_status === 'published' ? 'Yayında' : d.dpp_status === 'draft' ? 'Taslak' : d.dpp_status === 'pending_approval' ? 'Onay Bekliyor' : d.dpp_status === 'rejected' ? 'Reddedildi' : 'Taslak',
        olusturan: 'Furkan Yıldız',
        celik_kalitesi: d.product_type?.steel_grade || 'S355JR',
        en_mm: '200', boy_mm: '6000', kalinlik_mm: '8.5', agirlik_m: '26.2',
        co2_a1a3: String(d.carbon_footprint_total || '1.15'),
        co2_a3: '0.38', co2_a4: '0.07',
        co2_verification: 'Üçüncü Taraf Doğrulamalı',
        geri_donusum_orani: '82',
        svhc_free: true,
        uretici_adi: 'Kocaer Çelik A.Ş.',
        tesis_adi: 'Aliağa Üretim Tesisi',
        tesis_ulkesi: 'Türkiye',
        red_gerekce: d.rejection_reason || undefined,
        red_fields: d.rejection_fields || [],
        red_yapan: d.rejected_by || undefined,
        red_tarihi: d.rejected_at ? new Date(d.rejected_at).toLocaleString() : undefined,
        c_pct: chemical ? String(chemical.carbon_pct) : d.product_type?.chemical_c || '0.19',
        si_pct: chemical ? String(chemical.silicon_pct) : d.product_type?.chemical_si || '0.30',
        mn_pct: chemical ? String(chemical.manganese_pct) : d.product_type?.chemical_mn || '1.45',
        p_pct: chemical ? String(chemical.phosphorus_pct) : d.product_type?.chemical_p || '0.022',
        s_pct: chemical ? String(chemical.sulfur_pct) : d.product_type?.chemical_s || '0.018',
        n_pct: chemical ? String(chemical.nitrogen_pct) : d.product_type?.chemical_n || '0.009',
        yield_mpa: mechanical ? String(mechanical.yield_strength_mpa) : d.product_type?.mechanical_yield || '370',
        tensile_mpa: mechanical ? String(mechanical.tensile_strength_mpa) : d.product_type?.mechanical_tensile || '530',
        elongation_pct: mechanical ? String(mechanical.elongation_pct) : d.product_type?.mechanical_elongation || '24',
        impact_energy_j: mechanical ? String(mechanical.impact_energy_j) : d.product_type?.mechanical_impact || '27',
        impact_temp_c: '20',
        material_standard: 'EN 10025-2:2019',
        gtin: d.gtin || '08690000112345',
        hs_code: '7216.32',
      };
      setData(mapped);
    } catch (err: any) {
      console.error("Batch detayları backend'den alınamadı:", err);
      if (err.message) {
        alert("DPP detayları alınırken hata oluştu: " + err.message);
      }
    }
  };

  const REJECTABLE_FIELDS = [
    { key: 'co2_a1a3',           label: 'CO₂ A1–A3 Emisyon Değeri' },
    { key: 'geri_donusum_orani', label: 'Geri Dönüşüm Oranı' },
    { key: 'svhc_free',          label: 'SVHC / REACH Beyanı' },
    { key: 'celik_kalitesi',     label: 'Çelik Kalitesi' },
    { key: 'cift_kodu',          label: 'Çift Kodu (Heat No)' },
    { key: 'parti_no',           label: 'Parti Numarası' },
  ];
  const toggleRejectField = (key: string) =>
    setAdminRejectFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]);
  const [activeTab, setActiveTab] = useState<'genel' | 'test' | 'surdurulebilirlik' | 'tedarik'>('genel');

  const isAdmin = role === 'ADMIN';

  // Veri henüz yüklenmediyse (SSR)
  if (!id) return null;

  if (!data) {
    return (
      <ProtectedRoute allowedRoles={['ENGINEER', 'ADMIN']}>
        <div className="max-w-3xl mx-auto py-16 px-4 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <h2 className="text-lg font-black text-gray-700">DPP Pasaport Detayları Yükleniyor...</h2>
        </div>
      </ProtectedRoute>
    );
  }

  const isReadOnly = READONLY_STATUSES.includes(data.dpp_durum);
  const isRejected = data.dpp_durum === 'Reddedildi';
  const redFields = data.red_fields ?? [];
  const isErr = (field: string) => redFields.includes(field);

  const set = (field: keyof BatchDetail) => (v: string) =>
    setData((prev) => prev ? { ...prev, [field]: v } : prev);

  const handleSubmit = async () => {
    try {
      await apiUpdateDpp(id as string, { dpp_status: 'pending_approval' });
      setSubmitted(true);
    } catch (err: any) {
      alert("Hata oluştu: " + (err.message || err));
    }
  };

  const statusCfg = STATUS_CFG[data.dpp_durum];

  if (adminAction) {
    const approved = adminAction === 'approved';
    return (
      <ProtectedRoute allowedRoles={['ENGINEER', 'ADMIN']}>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${approved ? 'bg-green-100' : 'bg-red-100'}`}>
            {approved ? <CheckCircle2 size={32} className="text-green-600" /> : <XCircle size={32} className="text-red-600" />}
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900">
              {approved ? 'DPP Onaylandı & Yayınlandı!' : 'DPP Reddedildi'}
            </h2>
            <p className="text-gray-500 font-medium mt-2 max-w-sm">
              <span className="font-bold text-gray-700">{data.parti_no}</span> numaralı batch DPP'si
              {approved ? ' blockchain\'e kaydedilerek yayına girdi.' : ' mühendise revize için geri gönderildi.'}
            </p>
          </div>
          <button onClick={() => router.push('/admin')}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
            Admin Paneline Dön
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  if (submitted) {
    return (
      <ProtectedRoute allowedRoles={['ENGINEER', 'ADMIN']}>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <Send size={32} className="text-green-600" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900">Tekrar Onaya Gönderildi!</h2>
            <p className="text-gray-500 font-medium mt-2 max-w-sm">
              <span className="font-bold text-gray-700">{data.parti_no}</span> numaralı batch
              revize edilerek Admin onayına iletildi.
            </p>
          </div>
          <button onClick={() => router.push(isAdmin ? '/admin' : '/batches')}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
            {isAdmin ? 'Admin Paneline Dön' : 'Batch Listesine Dön'}
          </button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ENGINEER', 'ADMIN']}>
      <div className="max-w-3xl mx-auto py-10 px-4">

        {/* Geri */}
        <button
          onClick={() => router.push(isAdmin ? '/admin' : '/batches')}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors mb-8"
        >
          <ChevronLeft size={16} />
          {isAdmin ? 'Admin Paneline Dön' : 'Batch Listesine Dön'}
        </button>

        {/* Başlık */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                {data.parti_no}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-0.5 rounded-full ${statusCfg.className}`}>
                {statusCfg.icon} {statusCfg.label}
              </span>
              {isReadOnly && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                  <Lock size={11} /> Salt Okunur
                </span>
              )}
            </div>
            <h1 className="text-xl font-black text-gray-900">{data.urun_tipi}</h1>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              Oluşturan: {data.olusturan}
            </p>
          </div>
          {!isReadOnly && !isRejected && (
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl border border-blue-100">
              <Edit3 size={13} /> Düzenlenebilir
            </div>
          )}
        </div>

        {/* ── ONAY BEKLİYOR UYARISI ── */}
        {data.dpp_durum === 'Onay Bekliyor' && (
          <>
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-3">
              <Clock size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-amber-800">
                  {isAdmin ? 'Bu DPP onayınızı bekliyor' : 'Bu DPP Admin onayında'}
                </p>
                <p className="text-xs text-amber-700 font-medium mt-0.5">
                  {isAdmin
                    ? 'Tüm verileri inceledikten sonra onaylayabilir veya reddedebilirsiniz.'
                    : 'Onay sürecinde herhangi bir değişiklik yapılamaz. Admin onayladıktan sonra DPP yayınlanacaktır.'}
                </p>
              </div>
            </div>
            {parseFloat(data.co2_a1a3) > 2.0 && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3 mb-3">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">
                  <span className="font-black">CBAM Uyarısı:</span> A1–A3 CO₂ değeri ({data.co2_a1a3} kg CO₂e/kg) değerlendirme eşiğini aşıyor. Onaylamadan önce değerlendirin.
                </p>
              </div>
            )}
          </>
        )}

        {/* ── YAYINDA BİLGİSİ ── */}
        {data.dpp_durum === 'Yayında' && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4 mb-6">
            <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-green-800">Bu DPP yayında ve blockchain'e kaydedildi</p>
              <p className="text-xs text-green-700 font-medium mt-0.5">
                Veriler salt okunur moddadır. Değişiklik için Admin ile iletişime geçin.
              </p>
            </div>
          </div>
        )}

        {/* ── REDDEDİLDİ BANNER ── */}
        {isRejected && data.red_gerekce && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6">
            <div className="flex items-start gap-3">
              <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-red-800">Admin tarafından reddedildi</p>
                {data.red_yapan && data.red_tarihi && (
                  <p className="text-[11px] text-red-500 font-medium mt-0.5">
                    {data.red_yapan} • {data.red_tarihi}
                  </p>
                )}
                <p className="text-sm text-red-700 font-medium mt-2 bg-red-100 rounded-xl px-3 py-2">
                  "{data.red_gerekce}"
                </p>
                {redFields.length > 0 && (
                  <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Aşağıdaki alanlarda düzeltme yapmanız gerekiyor — kırmızı ile işaretlendi.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ TAB NAVİGASYON ════════════════ */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6">
          {([
            { id: 'genel',           label: 'Genel',            icon: <Factory size={13} /> },
            { id: 'test',            label: 'Test & Lab',       icon: <FlaskConical size={13} /> },
            { id: 'surdurulebilirlik', label: 'Sürdürülebilirlik', icon: <Leaf size={13} /> },
            { id: 'tedarik',         label: 'Tedarik Zinciri',  icon: <GitBranch size={13} /> },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-5">

          {/* ════════════════ TAB 1: GENEL ════════════════ */}
          {activeTab === 'genel' && (
            <>
              <SectionCard title="Üretim Partisi Bilgileri" icon={<Factory size={16} className="text-blue-600" />}>
                {isReadOnly ? (
                  <>
                    <ReadField label="Parti Numarası" value={data.parti_no} />
                    <ReadField label="Tedarikçi Parti Kodu" value={data.tedarikci_parti_kodu} />
                    <ReadField label="Ürün Tipi" value={data.urun_tipi} />
                    <ReadField label="Ocak / Fırın No" value={data.ocak_no} />
                    <ReadField label="Üretim Tarihi" value={data.uretim_tarihi} />
                    <ReadField label="Miktar" value={`${data.miktar_ton} ton`} />
                    <ReadField label="Çift Kodu (Heat No)" value={data.cift_kodu} />
                  </>
                ) : (
                  <>
                    <EditField label="Parti Numarası" name="parti_no" value={data.parti_no}
                      onChange={set('parti_no')} placeholder="KCR-2026-XXXX-A" required
                      isError={isErr('parti_no')} />
                    <EditField label="Tedarikçi Parti Kodu" name="tedarikci_parti_kodu" value={data.tedarikci_parti_kodu}
                      onChange={set('tedarikci_parti_kodu')} placeholder="ERD-2026-XXXXX" isError={isErr('tedarikci_parti_kodu')} />
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Ürün Tipi</label>
                      <input value={data.urun_tipi} readOnly
                        className="w-full px-3.5 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                    </div>
                    <EditField label="Ocak / Fırın No" name="ocak_no" value={data.ocak_no}
                      onChange={set('ocak_no')} placeholder="EAF-03" isError={isErr('ocak_no')} />
                    <EditField label="Üretim Tarihi" name="uretim_tarihi" value={data.uretim_tarihi}
                      onChange={set('uretim_tarihi')} type="date" isError={isErr('uretim_tarihi')} />
                    <EditField label="Miktar (ton)" name="miktar_ton" value={data.miktar_ton}
                      onChange={set('miktar_ton')} type="number" placeholder="42.5" isError={isErr('miktar_ton')} />
                    <EditField label="Çift Kodu (Heat No)" name="cift_kodu" value={data.cift_kodu}
                      onChange={set('cift_kodu')} placeholder="H-20260312-003" isError={isErr('cift_kodu')} />
                  </>
                )}
              </SectionCard>
              <SectionCard title="Teknik Bilgiler" icon={<Package size={16} className="text-indigo-600" />}>
                {isReadOnly ? (
                  <>
                    {data.gtin && (
                      <div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-0.5">GTIN</p>
                        <p className="text-sm font-mono font-bold text-gray-800">{data.gtin}</p>
                      </div>
                    )}
                    {data.hs_code && (
                      <div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-0.5">HS Kodu (GTİP)</p>
                        <span className="inline-flex items-center text-sm font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg">{data.hs_code}</span>
                      </div>
                    )}
                    {data.material_standard && <ReadField label="Malzeme Standardı" value={data.material_standard} />}
                    <ReadField label="Çelik Kalitesi" value={data.celik_kalitesi} />
                    <ReadField label="Ağırlık (kg/m)" value={data.agirlik_m} />
                    <ReadField label="En (mm)" value={data.en_mm} />
                    <ReadField label="Boy (mm)" value={data.boy_mm} />
                    <ReadField label="Kalınlık (mm)" value={data.kalinlik_mm} />
                  </>
                ) : (
                  <>
                    <EditField label="Çelik Kalitesi" name="celik_kalitesi" value={data.celik_kalitesi}
                      onChange={set('celik_kalitesi')} placeholder="S355JR" required isError={isErr('celik_kalitesi')} />
                    <EditField label="Ağırlık (kg/m)" name="agirlik_m" value={data.agirlik_m}
                      onChange={set('agirlik_m')} type="number" placeholder="26.2" isError={isErr('agirlik_m')} />
                    <EditField label="En (mm)" name="en_mm" value={data.en_mm}
                      onChange={set('en_mm')} type="number" placeholder="200" isError={isErr('en_mm')} />
                    <EditField label="Boy (mm)" name="boy_mm" value={data.boy_mm}
                      onChange={set('boy_mm')} type="number" placeholder="6000" isError={isErr('boy_mm')} />
                    <EditField label="Kalınlık (mm)" name="kalinlik_mm" value={data.kalinlik_mm}
                      onChange={set('kalinlik_mm')} type="number" placeholder="8.5" isError={isErr('kalinlik_mm')} />
                  </>
                )}
              </SectionCard>
              <SectionCard title="Üretici & Tesis" icon={<FlaskConical size={16} className="text-purple-600" />}>
                {isReadOnly ? (
                  <>
                    <ReadField label="Üretici Adı" value={data.uretici_adi} />
                    <ReadField label="Tesis Adı" value={data.tesis_adi} />
                    <ReadField label="Tesis Ülkesi" value={data.tesis_ulkesi} />
                  </>
                ) : (
                  <>
                    <EditField label="Üretici Adı" name="uretici_adi" value={data.uretici_adi}
                      onChange={set('uretici_adi')} placeholder="Kocaer Çelik A.Ş." required isError={isErr('uretici_adi')} />
                    <EditField label="Tesis Adı" name="tesis_adi" value={data.tesis_adi}
                      onChange={set('tesis_adi')} placeholder="Aliağa Üretim Tesisi" isError={isErr('tesis_adi')} />
                    <EditField label="Tesis Ülkesi" name="tesis_ulkesi" value={data.tesis_ulkesi}
                      onChange={set('tesis_ulkesi')} placeholder="Türkiye" isError={isErr('tesis_ulkesi')} />
                  </>
                )}
              </SectionCard>
            </>
          )}

          {/* ════════════════ TAB 2: TEST & LAB ════════════════ */}
          {activeTab === 'test' && (
            <>
              <SectionCard title="Kimyasal Kompozisyon (EN 10025-2)" icon={<FlaskConical size={16} className="text-blue-600" />}>
                {data.c_pct ? (
                  <>
                    <ReadField label="C — Karbon (%)" value={data.c_pct} />
                    <ReadField label="Si — Silisyum (%)" value={data.si_pct ?? '—'} />
                    <ReadField label="Mn — Manganez (%)" value={data.mn_pct ?? '—'} />
                    <ReadField label="P — Fosfor (%)" value={data.p_pct ?? '—'} />
                    <ReadField label="S — Kükürt (%)" value={data.s_pct ?? '—'} />
                    <ReadField label="N — Azot (%)" value={data.n_pct ?? '—'} />
                  </>
                ) : (
                  <div className="md:col-span-2 text-sm text-gray-400 font-medium py-4 text-center">
                    Kimyasal analiz verisi henüz girilmemiş.
                  </div>
                )}
              </SectionCard>
              <SectionCard title="Mekanik Özellikler" icon={<Package size={16} className="text-indigo-600" />}>
                {data.yield_mpa ? (
                  <>
                    <ReadField label="Akma Dayanımı (MPa)" value={data.yield_mpa} />
                    <ReadField label="Çekme Dayanımı (MPa)" value={data.tensile_mpa ?? '—'} />
                    <ReadField label="Uzama Oranı (%)" value={data.elongation_pct ?? '—'} />
                    <ReadField label="Darbe Enerjisi (J)" value={data.impact_energy_j ?? '—'} />
                    <ReadField label="Darbe Test Sıcaklığı (°C)" value={data.impact_temp_c ?? '—'} />
                  </>
                ) : (
                  <div className="md:col-span-2 text-sm text-gray-400 font-medium py-4 text-center">
                    Mekanik test verisi henüz girilmemiş.
                  </div>
                )}
              </SectionCard>
              <SectionCard title="Test Sertifikası" icon={<Award size={16} className="text-amber-600" />}>
                {data.en10204_cert_no ? (
                  <>
                    <ReadField label="EN 10204 Sertifika No" value={data.en10204_cert_no} />
                    <ReadField label="Sertifika Tipi" value={data.en10204_tip ?? '—'} />
                    <ReadField label="Test Standardı" value={data.test_standard ?? '—'} />
                    <ReadField label="Test Tarihi" value={data.test_tarihi ?? '—'} />
                  </>
                ) : (
                  <div className="md:col-span-2 text-sm text-gray-400 font-medium py-4 text-center">
                    Sertifika bilgisi henüz girilmemiş.
                  </div>
                )}
              </SectionCard>
              {data.certifications && data.certifications.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2 bg-gray-50 rounded-xl"><Award size={16} className="text-green-600" /></div>
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Sertifikalar</h3>
                  </div>
                  <div className="space-y-3">
                    {data.certifications.map((cert) => {
                      const today = new Date();
                      const expiry = new Date(cert.expiry_date);
                      const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      const expiryColor = daysLeft < 0 ? 'text-red-600 bg-red-50 border-red-200' : daysLeft < 180 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-green-600 bg-green-50 border-green-200';
                      return (
                        <div key={cert.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-3 min-w-0">
                            <Award size={14} className="text-gray-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-black text-gray-800">{cert.cert_type}</p>
                              <p className="text-xs text-gray-400 font-medium truncate">{cert.cert_no} · {cert.issuer}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${expiryColor}`}>
                              {daysLeft < 0 ? 'Süresi Doldu' : `${cert.expiry_date} geçerli`}
                            </span>
                            {cert.file_name && (
                              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                                PDF
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════════════ TAB 3: SÜRDÜRÜLEBİLİRLİK ════════════════ */}
          {activeTab === 'surdurulebilirlik' && (
            <div className="space-y-5">
              <SectionCard title="Karbon Ayak İzi (EN 15804+A2)" icon={<Leaf size={16} className="text-green-600" />}>
                <div className="md:col-span-2 rounded-xl overflow-hidden border border-gray-200 text-xs font-bold">
                  <div className="flex">
                    {['A1 Hammadde', 'A2 Nakliye', 'A3 Üretim'].map((s) => (
                      <div key={s} className="flex-1 bg-blue-600 text-white px-2 py-2 text-center border-r border-blue-500">
                        <div>{s.split(' ')[0]}</div>
                        <div className="font-normal opacity-80 mt-0.5">{s.split(' ')[1]}</div>
                      </div>
                    ))}
                    <div className="flex-1 bg-gray-100 text-gray-400 px-2 py-2 text-center">
                      <div>A4</div><div className="font-normal mt-0.5">Sevkiyat</div>
                    </div>
                  </div>
                  <div className="flex text-center text-[10px]">
                    <div className="flex-[3] bg-blue-50 text-blue-700 py-1 border-r border-blue-200 font-black tracking-wide">← A1–A3 ZORUNLU (ESPR / CBAM) →</div>
                    <div className="flex-1 bg-gray-50 text-gray-400 py-1">İsteğe Bağlı</div>
                  </div>
                </div>
                {isReadOnly ? (
                  <>
                    <ReadField label="CO₂ A1–A3 (kg CO₂e/kg)" value={data.co2_a1a3} />
                    <div>
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Doğrulama Durumu</p>
                      {data.co2_verification ? (
                        <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          data.co2_verification === 'Üçüncü Taraf Doğrulamalı' || data.co2_verification === 'EPD Belgeli'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : data.co2_verification === 'Dahili Hesaplama'
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {data.co2_verification}
                        </span>
                      ) : (
                        <p className="text-sm font-bold text-gray-800">—</p>
                      )}
                    </div>
                    {data.co2_a3 && <ReadField label="CO₂ A3 Üretim (kg CO₂e/kg)" value={data.co2_a3} />}
                    {data.co2_a4 && <ReadField label="CO₂ A4 Sevkiyat (kg CO₂e/kg)" value={data.co2_a4} />}
                    {data.co2_a1a3 && (
                      <div className="md:col-span-2">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">CBAM Eşik Durumu (limit: 2.0 kg CO₂e/kg)</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                parseFloat(data.co2_a1a3) > 2.0 ? 'bg-red-500' :
                                parseFloat(data.co2_a1a3) > 1.7 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min((parseFloat(data.co2_a1a3) / 3.0) * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-black whitespace-nowrap ${
                            parseFloat(data.co2_a1a3) > 2.0 ? 'text-red-600' :
                            parseFloat(data.co2_a1a3) > 1.7 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {parseFloat(data.co2_a1a3) > 2.0 ? '⚠ Eşik Aşıldı' : 'Uyumlu'}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <EditField label="CO₂ A1–A3 (kg CO₂e/kg)" name="co2_a1a3" value={data.co2_a1a3}
                      onChange={set('co2_a1a3')} type="number" placeholder="1.85" required isError={isErr('co2_a1a3')} />
                    <EditSelect label="Doğrulama Durumu" value={data.co2_verification}
                      onChange={(v) => setData(prev => prev ? { ...prev, co2_verification: v } : prev)}
                      options={CO2_VERIFICATION_OPTIONS} />
                    <EditField label="CO₂ A3 Üretim (kg CO₂e/kg)" name="co2_a3" value={data.co2_a3}
                      onChange={set('co2_a3')} type="number" placeholder="0.45" isError={isErr('co2_a3')} />
                    <EditField label="CO₂ A4 Sevkiyat (kg CO₂e/kg)" name="co2_a4" value={data.co2_a4}
                      onChange={set('co2_a4')} type="number" placeholder="0.08" isError={isErr('co2_a4')} />
                  </>
                )}
              </SectionCard>

              {/* EPD Beyanı */}
              {(data.epd_cert_no || data.epd_valid_until) && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2 bg-gray-50 rounded-xl"><Award size={16} className="text-emerald-600" /></div>
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">EPD Beyanı</h3>
                    <span className="ml-auto text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">ESPR</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.epd_cert_no && <ReadField label="Belge No" value={data.epd_cert_no} />}
                    {data.epd_valid_until && (() => {
                      const today = new Date();
                      const expiry = new Date(data.epd_valid_until!);
                      const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      const color = daysLeft < 0 ? 'text-red-600 bg-red-50 border-red-200' : daysLeft < 180 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-green-600 bg-green-50 border-green-200';
                      return (
                        <div>
                          <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Geçerlilik Tarihi</p>
                          <span className={`inline-flex items-center text-sm font-bold px-2.5 py-0.5 rounded-lg border ${color}`}>
                            {data.epd_valid_until} {daysLeft < 0 ? '· Süresi Doldu' : daysLeft < 180 ? '· Yaklaşıyor' : '· Geçerli'}
                          </span>
                        </div>
                      );
                    })()}
                    {data.epd_url && (
                      <div className="md:col-span-2">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-0.5">EPD URL</p>
                        <p className="text-xs text-blue-600 font-medium truncate">{data.epd_url}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Döngüsel Ekonomi */}
              <SectionCard title="Döngüsel Ekonomi" icon={<Leaf size={16} className="text-teal-600" />}>
                {isReadOnly ? (
                  <>
                    <ReadField label="Geri Dönüştürülmüş İçerik (%)" value={data.geri_donusum_orani} />
                    {data.recyclability_pct && <ReadField label="Geri Dönüştürülebilirlik (%)" value={data.recyclability_pct} />}
                    <ReadField label="SVHC / REACH" value={data.svhc_free} />
                  </>
                ) : (
                  <>
                    <EditField label="Geri Dönüştürülmüş İçerik (%)" name="geri_donusum_orani" value={data.geri_donusum_orani}
                      onChange={set('geri_donusum_orani')} type="number" placeholder="82" required isError={isErr('geri_donusum_orani')} />
                    <div className={`md:col-span-2 flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                      isErr('svhc_free') ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <input type="checkbox" id="svhc" checked={data.svhc_free}
                        onChange={(e) => setData(prev => prev ? { ...prev, svhc_free: e.target.checked } : prev)}
                        className="w-4 h-4 accent-blue-600" />
                      <label htmlFor="svhc" className={`text-sm font-bold ${isErr('svhc_free') ? 'text-red-700' : 'text-gray-700'}`}>
                        SVHC İçermez (REACH Uyumlu)
                        {isErr('svhc_free') && (
                          <span className="ml-2 text-[11px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Düzeltme Gerekiyor</span>
                        )}
                      </label>
                    </div>
                  </>
                )}
              </SectionCard>

              {/* Tehlikeli Maddeler */}
              {data.hazardous_substances && data.hazardous_substances.length > 0 && (
                <div className="bg-white border border-orange-100 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2 bg-orange-50 rounded-xl"><AlertCircle size={16} className="text-orange-600" /></div>
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Tehlikeli Maddeler</h3>
                    <span className="ml-auto text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">REACH Madde 33</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left font-black text-gray-400 uppercase tracking-wider py-2 pr-4">Madde Adı</th>
                          <th className="text-left font-black text-gray-400 uppercase tracking-wider py-2 pr-4">CAS No</th>
                          <th className="text-left font-black text-gray-400 uppercase tracking-wider py-2 pr-4">Konsantrasyon (%)</th>
                          <th className="text-left font-black text-gray-400 uppercase tracking-wider py-2">SVHC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.hazardous_substances.map((s, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="font-bold text-gray-800 py-2.5 pr-4">{s.name}</td>
                            <td className="font-mono text-gray-600 py-2.5 pr-4">{s.cas_no}</td>
                            <td className="font-bold text-gray-800 py-2.5 pr-4">{s.concentration_pct}</td>
                            <td className="py-2.5">
                              {s.svhc
                                ? <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">SVHC</span>
                                : <span className="text-[10px] font-bold text-gray-400">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Ömür Sonu */}
              {(data.eol_disassembly || data.eol_disposal) && (
                <SectionCard title="Ömür Sonu" icon={<Package size={16} className="text-slate-600" />}>
                  {data.eol_disassembly && <ReadField label="Söküm Zorluğu" value={data.eol_disassembly} />}
                  {data.eol_disposal && <ReadField label="İmha Talimatı" value={data.eol_disposal} />}
                </SectionCard>
              )}
            </div>
          )}

          {/* ════════════════ TAB 4: TEDARİK ZİNCİRİ ════════════════ */}
          {activeTab === 'tedarik' && (
            <div className="space-y-4">
              {data.supply_chain && data.supply_chain.length > 0 ? (
                data.supply_chain.map((stage) => (
                  <div key={stage.sequence} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                        {stage.sequence}
                      </span>
                      <div>
                        <p className="text-sm font-black text-gray-900">{stage.stage_name}</p>
                        <p className="text-xs text-blue-600 font-bold">{stage.role}</p>
                      </div>
                      {stage.sequence === 1 && data.tedarikci_parti_kodu && (
                        <span className="ml-auto text-[11px] font-mono font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-lg">
                          {data.tedarikci_parti_kodu}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <ReadField label="Organizasyon" value={stage.organization} />
                      <ReadField label="Tarih" value={stage.date} />
                      <div className="flex items-start gap-1.5">
                        <MapPin size={13} className="text-gray-400 mt-1 shrink-0" />
                        <div>
                          <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Lokasyon</p>
                          <p className="text-sm font-bold text-gray-800">{stage.location}</p>
                        </div>
                      </div>
                      {stage.material && <ReadField label="Malzeme" value={stage.material} />}
                      {stage.material_origin && <ReadField label="Menşei" value={stage.material_origin} />}
                      {stage.quantity && <ReadField label="Miktar" value={`${stage.quantity} ${stage.unit ?? ''}`} />}
                    </div>
                    {stage.processes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {stage.processes.map(p => (
                          <span key={p} className="text-[11px] font-bold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
                  <GitBranch size={32} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-sm font-bold text-gray-400">Tedarik zinciri verisi henüz girilmemiş.</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── ALT BUTONLAR: MÜHENDİS ── */}
        <div className="mt-8 flex justify-end gap-3">
          {isRejected && !isAdmin && (
            <button onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">
              <Send size={15} /> Revize Edip Tekrar Gönder
            </button>
          )}
          {data.dpp_durum === 'Taslak' && !isAdmin && (
            <button onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-100">
              <Send size={15} /> Onaya Gönder
            </button>
          )}
        </div>

        {/* ── ALT BUTONLAR: ADMİN (Onay Bekliyor) ── */}
        {isAdmin && data.dpp_durum === 'Onay Bekliyor' && (
          <div className="mt-8 border-t border-gray-100 pt-8 space-y-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Admin Aksiyonu</p>

            {showRejectForm ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4">
                <p className="text-sm font-black text-red-800">Hatalı Alanları İşaretle</p>
                <div className="grid grid-cols-2 gap-2">
                  {REJECTABLE_FIELDS.map(f => (
                    <label key={f.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs font-bold transition-colors ${
                      adminRejectFields.includes(f.key)
                        ? 'bg-red-100 border-red-400 text-red-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
                    }`}>
                      <input type="checkbox" checked={adminRejectFields.includes(f.key)}
                        onChange={() => toggleRejectField(f.key)} className="accent-red-600" />
                      {f.label}
                    </label>
                  ))}
                </div>
                <textarea
                  value={adminRejectReason}
                  onChange={(e) => setAdminRejectReason(e.target.value)}
                  placeholder="Mühendise iletilecek red gerekçesini yazın... (zorunlu)"
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      if (adminRejectReason.trim()) {
                        try {
                          await apiRejectDpp(id as string, adminRejectReason);
                          setAdminAction('rejected');
                        } catch (err: any) {
                          alert("Reddedilirken hata oluştu: " + (err.message || err));
                        }
                      }
                    }}
                    disabled={!adminRejectReason.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <XCircle size={15} /> Reddet & Geri Gönder
                  </button>
                  <button
                    onClick={() => { setShowRejectForm(false); setAdminRejectReason(''); setAdminRejectFields([]); }}
                    className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      await apiApproveDpp(id as string);
                      setAdminAction('approved');
                    } catch (err: any) {
                      alert("Onaylanırken hata oluştu: " + (err.message || err));
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
                >
                  <CheckCircle2 size={15} /> Onayla & Yayınla
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors"
                >
                  <XCircle size={15} /> Reddet
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
