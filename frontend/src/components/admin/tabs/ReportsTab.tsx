import { useState, useEffect, useRef } from 'react';
import {
  Download, Globe, FileText, Database,
  AlertTriangle, XCircle, Loader2,
  ChevronDown, ChevronRight, X, ArrowRight,
} from 'lucide-react';
import type { AdminProduct, IncompleteProduct } from '../../../types/admin';
import { apiGetIncompleteReport } from '../../../lib/api';

type ReportKey = 'cbam' | 'excel' | 'json';

interface Props {
  products: AdminProduct[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

// ─── Color tokens (static strings so Tailwind doesn't purge them) ────────────

const COLORS = {
  blue: {
    icon: 'text-blue-600',
    light: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    btnOutline: 'border-2 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600',
    btnSolid: 'bg-blue-600 hover:bg-blue-700',
    radioActive: 'border-blue-400 bg-blue-50',
    dot: 'bg-blue-600',
    drawerHeader: 'bg-blue-50 border-blue-100',
  },
  green: {
    icon: 'text-green-600',
    light: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
    btnOutline: 'border-2 border-green-200 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600',
    btnSolid: 'bg-green-600 hover:bg-green-700',
    radioActive: 'border-green-400 bg-green-50',
    dot: 'bg-green-600',
    drawerHeader: 'bg-green-50 border-green-100',
  },
  purple: {
    icon: 'text-purple-600',
    light: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
    btnOutline: 'border-2 border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600',
    btnSolid: 'bg-purple-600 hover:bg-purple-700',
    radioActive: 'border-purple-400 bg-purple-50',
    dot: 'bg-purple-600',
    drawerHeader: 'bg-purple-50 border-purple-100',
  },
} as const;

type ColorKey = keyof typeof COLORS;

// ─── Report definitions ──────────────────────────────────────────────────────

interface ReportConfig {
  label: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  color: ColorKey;
  format: string;
  tags: string[];
  contentLabel: string;
  contentSections: { title: string; fields: string[] }[];
  note?: string;
  endpoint: string;
}

const REPORTS: Record<ReportKey, ReportConfig> = {
  cbam: {
    label: 'AB CBAM Portalı',
    subtitle: 'EU Implementing Regulation 2023/1773',
    description:
      'Her çeyrek dönem AB Komisyonu\'nun CBAM Geçiş Portalı\'na iletilmesi zorunlu XML raporu. Beyan, emisyon ve doğrulama bilgilerini kapsar.',
    icon: Globe,
    color: 'blue',
    format: 'XML',
    tags: ['Declarant Bilgileri', 'Gömülü Emisyon', 'Karbon Fiyatı', 'Üretim Tesisi', 'Doğrulama'],
    contentLabel: 'CBAM Alan Listesi',
    contentSections: [
      {
        title: '1. Beyan Bilgileri (Declarant)',
        fields: ['EORI Numarası (Z)', 'Firma Adı (Z)', 'Firma Adresi (Z)', 'Raporlama Dönemi (Z)'],
      },
      {
        title: '2. İthal Mal (ImportedGoods)',
        fields: ['CN/GTİP Kodu (Z)', 'Mal Tanımı (Z)', 'Menşe Ülke (Z)', 'Net Ağırlık (Z)', 'Gümrük Rejimi (Z)'],
      },
      {
        title: '3. Üretim Tesisi (Installation)',
        fields: ['Tesis Adı (Z)', 'UN/LOCODE (Z)', 'Üretim Rotası (Z)', 'CBAM Tesis ID (K)'],
      },
      {
        title: '4. Gömülü Emisyon (Emissions)',
        fields: ['Özgül Emisyon (Z)', 'Doğrudan Emisyon (Z)', 'Dolaylı Emisyon (Z)', 'Emisyon Faktörü (K)'],
      },
      {
        title: '5. Karbon Fiyatı & Doğrulama',
        fields: ['Ödenen Karbon Fiyatı (K)', 'Para Birimi (K)', 'Doğrulayıcı Kuruluş (K)', 'Akreditasyon No (K)'],
      },
    ],
    note: 'Türkiye ETS henüz CBAM kapsamında tanınmıyor — carbonPricePaid = 0 olarak beyan edilecek.',
    endpoint: 'cbam-xml',
  },
  excel: {
    label: 'Excel Raporu',
    subtitle: '8 Sheet · Kapsamlı Analiz',
    description:
      'Tüm pasaport verileri organizasyonlu Excel çalışma kitabı formatında. Her veri grubu ayrı bir sheet\'te yer alır; filtreleme ve analiz için idealdir.',
    icon: FileText,
    color: 'green',
    format: 'XLSX',
    tags: ['Pasaport Özeti', 'Sertifikalar', 'REACH/SVHC', 'Tedarik Zinciri', 'Lojistik', 'Erişim Logları', 'Audit Trail'],
    contentLabel: 'Sheet Yapısı',
    contentSections: [
      {
        title: 'Sheet 1 — Pasaport Özeti',
        fields: ['Batch ID', 'Ürün Adı', 'Kategori', 'Durum', 'CO₂ (kg/kg)', 'CBAM', 'Tarih'],
      },
      {
        title: 'Sheet 2 — Sertifikalar',
        fields: ['Sertifika Adı', 'Tipi', 'Veren Kuruluş', 'Son Geçerlilik', 'Kalan Gün', 'Durum'],
      },
      {
        title: 'Sheet 3 — REACH/SVHC',
        fields: ['Madde', 'CAS No', 'Eşik (%)', 'Tespit (%)', 'Eşik Aşıldı mı', 'SCIP Gerekli mi'],
      },
      {
        title: 'Sheet 4 — Tedarik Zinciri',
        fields: ['Tedarikçi Adı', 'Rol', 'Doğrulanmış', 'Güvenilirlik (%)', 'Risk Seviyesi'],
      },
      {
        title: 'Sheet 5 — Lojistik Emisyon',
        fields: ['Kalkış', 'Varış', 'Yöntem', 'Mesafe (km)', 'CO₂ (kg/kg)'],
      },
      {
        title: 'Sheet 6 — Erişim Logları',
        fields: ['Kullanıcı', 'Rol', 'Aksiyon', 'Zaman', 'IP Adresi'],
      },
      {
        title: 'Sheet 7 — Versiyon Geçmişi (Audit Trail)',
        fields: ['Batch ID', 'Versiyon', 'İşlemi Yapan', 'Tarih', 'Değişiklik'],
      },
    ],
    note: 'Tarih aralığı ve ürün/batch filtresi tüm sheet\'lere uygulanır.',
    endpoint: 'excel',
  },
  json: {
    label: 'JSON Export',
    subtitle: 'CIRPASS / DPP Ekosistemi Uyumlu',
    description:
      'Her pasaport sertifika, emisyon ve tedarik zinciri verilerini kendi içinde taşıyan hiyerarşik yapı. Sistem entegrasyonları için uygundur.',
    icon: Database,
    color: 'purple',
    format: 'JSON',
    tags: ['Hiyerarşik Yapı', 'CIRPASS Uyumlu', 'Makine Okunabilir', 'API Entegrasyonu'],
    contentLabel: 'Şema Yapısı',
    contentSections: [
      {
        title: 'export_metadata',
        fields: ['generated_at', 'generated_by', 'date_range', 'schema_version'],
      },
      {
        title: 'passports[ ] → Temel Bilgiler',
        fields: ['id', 'parti_no', 'product_name', 'product_category', 'passport_status', 'version', 'blockchain_timestamp'],
      },
      {
        title: 'passports[ ] → Emisyon',
        fields: ['co2_cradle_to_gate_kg', 'cbam_limit', 'cbam_compliant', 'logistics_total_co2', 'logistics_routes[ ]'],
      },
      {
        title: 'passports[ ] → Alt Veriler',
        fields: ['certificates[ ]', 'reach_svhc[ ]', 'supply_chain.suppliers[ ]', 'version_history[ ]', 'access_logs[ ]'],
      },
    ],
    note: 'access_logs hassas veri içerir. Yalnızca ADMIN yetkisiyle dışa aktarılabilir.',
    endpoint: 'json',
  },
};

// ─── Report Drawer ────────────────────────────────────────────────────────────

function ReportDrawer({
  reportKey,
  products,
  onClose,
}: {
  reportKey: ReportKey;
  products: AdminProduct[];
  onClose: () => void;
}) {
  const config = REPORTS[reportKey];
  const c = COLORS[config.color];
  const Icon = config.icon;

  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [showContent, setShowContent] = useState(false);
  const [visible, setVisible] = useState(false);

  // Slide-in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const downloadUrl =
    `${API_BASE}/export/${config.endpoint}` +
    `?date_from=${dateFrom}&date_to=${dateTo}` +
    (selectedProduct !== 'all' ? `&product_id=${selectedProduct}` : '');

  const selectedCount = selectedProduct === 'all' ? products.length : 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-250 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-[420px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-250 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b ${c.drawerHeader} flex items-start justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white shadow-sm">
              <Icon size={20} className={c.icon} />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900">{config.label}</h2>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">{config.subtitle}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1 mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Tarih aralığı */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Tarih Aralığı</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1.5">Başlangıç</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full text-xs font-bold border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1.5">Bitiş</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full text-xs font-bold border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          </section>

          {/* Ürün / Batch seçimi */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Ürün / Batch</p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">

              {/* Tüm ürünler seçeneği */}
              <button
                onClick={() => setSelectedProduct('all')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-left ${
                  selectedProduct === 'all'
                    ? `${c.radioActive} ${c.border}`
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedProduct === 'all' ? c.border : 'border-gray-300'}`}>
                  {selectedProduct === 'all' && <span className={`w-2 h-2 rounded-full ${c.dot}`} />}
                </span>
                <span className="text-xs font-bold text-gray-900">Tüm Ürünler</span>
                <span className="text-[10px] text-gray-400 font-medium ml-auto">{products.length} DPP</span>
              </button>

              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-left ${
                    selectedProduct === p.id
                      ? `${c.radioActive} ${c.border}`
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedProduct === p.id ? c.border : 'border-gray-300'}`}>
                    {selectedProduct === p.id && <span className={`w-2 h-2 rounded-full ${c.dot}`} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-gray-900 block truncate">{p.product_name}</span>
                    <span className="text-[10px] font-mono text-gray-400">{p.display_id || p.id?.slice(0, 8)}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* İçerik accordion */}
          <section>
            <button
              onClick={() => setShowContent(v => !v)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <span className="text-xs font-bold text-gray-700">{config.contentLabel}</span>
              <span className="flex items-center gap-1.5 text-gray-400 text-[10px] font-medium">
                {config.contentSections.length} bölüm
                {showContent ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </span>
            </button>

            {showContent && (
              <div className="mt-2 space-y-2">
                {config.contentSections.map((section, si) => (
                  <div key={si} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-wide">{section.title}</span>
                    </div>
                    <div className="px-3 py-2.5 flex flex-wrap gap-1.5">
                      {section.fields.map((f, fi) => (
                        <span key={fi} className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">{f}</span>
                      ))}
                    </div>
                  </div>
                ))}

                {config.note && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      <span className="font-black">Not: </span>{config.note}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-gray-400 font-medium">
              {selectedCount} ürün seçili · {dateFrom} → {dateTo}
            </p>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${c.badge}`}>.{config.format}</span>
          </div>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 ${c.btnSolid} text-white text-sm font-black rounded-xl shadow-sm transition-all active:scale-[0.98]`}
          >
            <Download size={15} />
            {config.label} İndir
          </a>
        </div>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportsTab({ products }: Props) {
  const [activeDrawer, setActiveDrawer] = useState<ReportKey | null>(null);
  const [incompleteFilter, setIncompleteFilter] = useState<'taslak' | 'geri-cagrildi'>('taslak');
  const [selectedIncomplete, setSelectedIncomplete] = useState<IncompleteProduct | null>(null);
  const [incompleteList, setIncompleteList] = useState<IncompleteProduct[]>([]);
  const [loadingIncomplete, setLoadingIncomplete] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingIncomplete(true);
      try {
        const data = await apiGetIncompleteReport();
        if (data?.length) {
          setIncompleteList(data.map((item: any) => ({
            id: item.dpp_id ? (item.dpp_id.length > 8 ? item.dpp_id.slice(0, 8) + '…' : item.dpp_id) : '—',
            product: item.name || item.product_name || 'Bilinmeyen Ürün',
            version: '1.0',
            status: 'Taslak',
            missing: item.missing || [],
          })));
        }
      } catch (err) {
        console.error('Eksik veri raporu alınamadı:', err);
      } finally {
        setLoadingIncomplete(false);
      }
    })();
  }, []);

  return (
    <>
      <div className="space-y-8">

        {/* ── Rapor Kartları ── */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Download size={16} className="text-blue-600" />
            Toplu Veri Dışa Aktarma
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(Object.keys(REPORTS) as ReportKey[]).map(key => {
              const cfg = REPORTS[key];
              const c = COLORS[cfg.color];
              const Icon = cfg.icon;
              return (
                <div
                  key={key}
                  className="flex flex-col gap-4 p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all bg-white"
                >
                  {/* Icon + format badge */}
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-2xl ${c.light}`}>
                      <Icon size={22} className={c.icon} />
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl ${c.badge}`}>.{cfg.format}</span>
                  </div>

                  {/* Başlık & açıklama */}
                  <div>
                    <h3 className="text-sm font-black text-gray-900">{cfg.label}</h3>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">{cfg.subtitle}</p>
                    <p className="text-xs text-gray-500 font-medium mt-2 leading-relaxed">{cfg.description}</p>
                  </div>

                  {/* İçerik etiketleri */}
                  <div className="flex flex-wrap gap-1.5">
                    {cfg.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Buton */}
                  <button
                    onClick={() => setActiveDrawer(key)}
                    className={`mt-auto w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black transition-all group ${c.btnOutline}`}
                  >
                    Raporu Hazırla
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Eksik Veri Raporu ── */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-500" />
              Eksik Veri Raporu
              {loadingIncomplete && <Loader2 size={14} className="text-blue-600 animate-spin" />}
            </h2>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {([
                { key: 'taslak' as const, label: 'Taslak', count: incompleteList.filter(p => p.status === 'Taslak').length },
                { key: 'geri-cagrildi' as const, label: 'Geri Çağrıldı', count: incompleteList.filter(p => p.status === 'Geri Çağrıldı').length },
              ]).map(f => (
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
            {incompleteList
              .filter(p => incompleteFilter === 'taslak' ? p.status === 'Taslak' : p.status === 'Geri Çağrıldı')
              .map((p, i) => (
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
                    <span className="text-[10px] text-gray-400">·</span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {[...new Set(p.missing.map(m => m.section))].join(', ')}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* ── Rapor Drawer ── */}
      {activeDrawer && (
        <ReportDrawer
          reportKey={activeDrawer}
          products={products}
          onClose={() => setActiveDrawer(null)}
        />
      )}

      {/* ── Eksik Veri Detay Modal ── */}
      {selectedIncomplete && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedIncomplete(null)}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {selectedIncomplete.id}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      selectedIncomplete.status === 'Taslak' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>{selectedIncomplete.status}</span>
                  </div>
                  <p className="text-sm font-black text-gray-900">{selectedIncomplete.product}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-gray-400 font-medium">v{selectedIncomplete.version}</span>
                    <span className="text-[10px] text-gray-400">·</span>
                    <span className="text-[10px] font-bold text-red-600">{selectedIncomplete.missing.length} eksik alan</span>
                  </div>
                </div>
                <button onClick={() => setSelectedIncomplete(null)} className="text-gray-400 hover:text-gray-600 font-black">✕</button>
              </div>
            </div>

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
    </>
  );
}
