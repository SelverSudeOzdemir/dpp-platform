import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import {
  Package, Calendar, ArrowRight, Clock, CheckCircle2,
  XCircle, FileText, Plus, Search, ChevronDown, Loader2,
  ChevronLeft, ChevronRight, Flame, Weight,
} from 'lucide-react';
import { apiGetDpps } from '../../lib/api';

// ─── TYPES ───────────────────────────────────────────────────────────────────
type BatchStatus = 'Taslak' | 'Onay Bekliyor' | 'Yayında' | 'Reddedildi' | 'Arşivlendi';
type TabKey = 'Tümü' | 'Taslak' | 'Onay Bekliyor' | 'Reddedildi' | 'Yayında';

interface Batch {
  id: string;
  parti_no: string;
  urun_tipi: string;
  ocak_no: string;
  uretim_tarihi: string;
  miktar_ton: number;
  dpp_durum: BatchStatus;
  olusturan: string;
  red_gerekce?: string;
}

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  BatchStatus,
  { label: string; badgeCls: string; iconCls: string; accentCls: string; cardBgHover: string; icon: React.ReactNode }
> = {
  Taslak: {
    label: 'Taslak',
    badgeCls: 'bg-slate-100 text-slate-600 border-slate-200',
    iconCls: 'bg-white text-slate-500 shadow-sm border border-slate-100',
    accentCls: 'bg-slate-400',
    cardBgHover: 'hover:bg-gradient-to-r hover:from-slate-50/60 hover:to-white',
    icon: <FileText size={12} />,
  },
  'Onay Bekliyor': {
    label: 'Onay Bekliyor',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
    iconCls: 'bg-white text-amber-500 shadow-sm border border-amber-100',
    accentCls: 'bg-amber-400',
    cardBgHover: 'hover:bg-gradient-to-r hover:from-amber-50/60 hover:to-white',
    icon: <Clock size={12} />,
  },
  Yayında: {
    label: 'Yayında',
    badgeCls: 'bg-green-50 text-green-700 border-green-200',
    iconCls: 'bg-white text-green-600 shadow-sm border border-green-100',
    accentCls: 'bg-green-400',
    cardBgHover: 'hover:bg-gradient-to-r hover:from-green-50/60 hover:to-white',
    icon: <CheckCircle2 size={12} />,
  },
  Reddedildi: {
    label: 'Reddedildi',
    badgeCls: 'bg-red-50 text-red-700 border-red-200',
    iconCls: 'bg-white text-red-500 shadow-sm border border-red-100',
    accentCls: 'bg-red-400',
    cardBgHover: 'hover:bg-gradient-to-r hover:from-red-50/60 hover:to-white',
    icon: <XCircle size={12} />,
  },
  Arşivlendi: {
    label: 'Arşivlendi',
    badgeCls: 'bg-slate-100 text-slate-500 border-slate-200',
    iconCls: 'bg-white text-slate-400 shadow-sm border border-slate-100',
    accentCls: 'bg-slate-300',
    cardBgHover: 'hover:bg-gradient-to-r hover:from-slate-50/60 hover:to-white',
    icon: <FileText size={12} />,
  },
};

// ─── TAB CONFIG ───────────────────────────────────────────────────────────────
const TABS: {
  key: TabKey;
  label: string;
  activeCls: string;
  activeBadgeCls: string;
}[] = [
    {
      key: 'Tümü',
      label: 'Tümü',
      activeCls: 'bg-indigo-600 text-white shadow-md shadow-indigo-200',
      activeBadgeCls: 'bg-white text-indigo-700',
    },
    {
      key: 'Taslak',
      label: 'Taslak',
      activeCls: 'bg-slate-600 text-white shadow-md shadow-slate-200',
      activeBadgeCls: 'bg-white text-slate-700',
    },
    {
      key: 'Onay Bekliyor',
      label: 'Onay Bekliyor',
      activeCls: 'bg-amber-500 text-white shadow-md shadow-amber-200',
      activeBadgeCls: 'bg-white text-amber-700',
    },
    {
      key: 'Reddedildi',
      label: 'Reddedildi',
      activeCls: 'bg-red-500 text-white shadow-md shadow-red-200',
      activeBadgeCls: 'bg-white text-red-700',
    },
    {
      key: 'Yayında',
      label: 'Yayında',
      activeCls: 'bg-green-500 text-white shadow-md shadow-green-200',
      activeBadgeCls: 'bg-white text-green-700',
    },
  ];

function matchesTab(batch: Batch, tab: TabKey): boolean {
  if (tab === 'Tümü') return true;
  return batch.dpp_durum === tab;
}

const ITEMS_PER_PAGE = 9;

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function BatchList() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('Taslak');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const menuRef = useRef<HTMLDivElement>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadBatches();
  }, [authLoading, isAuthenticated]);

  const loadBatches = async () => {
    try {
      const dpps = await apiGetDpps({ limit: 100 });
      if (dpps?.length) {
        const mapped: Batch[] = dpps.map((d: any) => ({
          id: d.id,
          parti_no: d.gs1_serial_number || d.public_identifier || 'B-000',
          urun_tipi: d.name || d.product_type?.product_name || 'IPE 200 Yapısal Çelik Profil',
          ocak_no: d.production_line || 'EAF-01',
          uretim_tarihi: d.production_date || '2026-03-12',
          miktar_ton: 45.0,
          dpp_durum:
            d.dpp_status === 'published'
              ? 'Yayında'
              : d.dpp_status === 'draft'
                ? 'Taslak'
                : d.dpp_status === 'pending_approval'
                  ? 'Onay Bekliyor'
                  : d.dpp_status === 'rejected'
                    ? 'Reddedildi'
                    : 'Taslak',
          olusturan: 'Furkan Yıldız',
          red_gerekce: d.rejection_reason || undefined,
        }));
        setBatches(mapped);
      } else {
        setBatches([]);
      }
    } catch (err) {
      console.error('Batch listesi alınamadı:', err);
      setBatches([]);
    }
  };

  // ── Outside click closes dropdown ─────────────────────────────────────────
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

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSelectExisting = (batchId: string) => {
    setLoadingBatch(batchId);
    setTimeout(() => router.push(`/batches/new?batchId=${batchId}`), 1200);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const counts: Record<TabKey, number> = {
    Tümü: batches.length,
    Taslak: batches.filter((b) => matchesTab(b, 'Taslak')).length,
    'Onay Bekliyor': batches.filter((b) => matchesTab(b, 'Onay Bekliyor')).length,
    Reddedildi: batches.filter((b) => matchesTab(b, 'Reddedildi')).length,
    Yayında: batches.filter((b) => matchesTab(b, 'Yayında')).length,
  };

  const filtered = batches.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      b.parti_no.toLowerCase().includes(q) || b.urun_tipi.toLowerCase().includes(q);
    return matchSearch && matchesTab(b, activeTab);
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ProtectedRoute allowedRoles={['ENGINEER', 'ADMIN']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/50 to-gray-100">
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 bg-gradient-to-b from-blue-600 to-blue-700 rounded-full"></div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                  Üretim Batch'leri
                </h1>
                <p className="text-sm text-gray-600 mt-1 font-medium">
                  Oluşturduğunuz üretim partileri ve DPP durumları.
                </p>
              </div>
            </div>

            {/* DPP dropdown */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:bg-blue-900 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-blue-200 hover:shadow-xl duration-200"
              >
                <Plus size={16} />
                DPP İşlemleri
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); router.push('/batches/new'); }}
                  className="w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 transition-colors border-b border-gray-50 group"
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors shrink-0">
                    <Plus size={16} className="text-blue-600" />
                  </span>
                  <span>
                    <p className="text-sm font-semibold text-gray-900">Yeni DPP Oluştur</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Sıfırdan yeni bir parti</p>
                  </span>
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setShowBatchPicker(true); }}
                  className="w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group"
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-gray-200 transition-colors shrink-0">
                    <FileText size={16} className="text-gray-600" />
                  </span>
                  <span>
                    <p className="text-sm font-semibold text-gray-900">Mevcut DPP'ye Devam Et</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Taslak partiye veri ekle</p>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

          {/* ── Tab Bar (boxed) ───────────────────────────────────────────── */}
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-[1.25rem] p-2 mb-6 flex-wrap shadow-sm">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap
                  ${isActive
                    ? `${tab.activeCls}`
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {tab.label}
                <span
                  className={`inline-flex items-center justify-center min-w-[24px] h-[20px] px-1.5 rounded-full text-[11px] font-black transition-all
                    ${isActive ? tab.activeBadgeCls : 'bg-gray-100 text-gray-400'}`}
                >
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

          {/* ── Search ────────────────────────────────────────────────────── */}
          <div className="relative mb-6">
            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Parti no veya ürün tipi ara..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-shadow"
            />
          </div>

          {/* ── Batch Cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginated.map((batch) => {
            const cfg = STATUS_CONFIG[batch.dpp_durum];
            return (
              <div
                key={batch.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/dpp/${batch.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && router.push(`/dpp/${batch.id}`)}
                className={`group relative flex flex-col bg-white border border-gray-100 rounded-[24px] overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-200 ${cfg.cardBgHover}`}
              >
                {/* Top accent stripe */}
                <div className={`absolute left-0 right-0 top-0 h-1.5 ${cfg.accentCls} transition-all duration-300 group-hover:h-2`} />

                <div className="p-6 w-full flex-1 flex flex-col mt-1">
                  {/* Top row: Icon + Arrow */}
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-2xl shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${cfg.iconCls}`}
                    >
                      <Package size={20} />
                    </div>
                    <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center bg-gray-50 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-indigo-600 group-hover:border-transparent group-hover:shadow-md group-hover:shadow-blue-500/30">
                      <ArrowRight size={14} className="text-gray-400 transition-colors duration-300 group-hover:text-white" />
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span className="inline-flex items-center font-mono text-[10px] font-black tracking-wider text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded shadow-sm">
                      {batch.parti_no}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shadow-sm ${cfg.badgeCls}`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>

                  {/* Product name */}
                  <p className="text-lg font-black text-gray-900 tracking-tight leading-tight mb-5 transition-colors duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-indigo-600 line-clamp-2">
                    {batch.urun_tipi}
                  </p>

                  {/* Meta */}
                  <div className="mt-auto space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                      <Flame size={14} className="text-orange-400" />
                      Ocak <span className="font-bold text-gray-700">{batch.ocak_no}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                        <Calendar size={14} className="text-blue-400" />
                        {batch.uretim_tarihi}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 shadow-sm">
                        <Weight size={12} className="text-gray-400" />
                        <span className="font-black text-gray-700">{batch.miktar_ton}</span> ton
                      </div>
                    </div>
                  </div>

                  {/* Rejection note */}
                  {batch.dpp_durum === 'Reddedildi' && batch.red_gerekce && (
                    <div className="flex items-start gap-2 mt-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                      <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <p className="text-[12px] text-red-700 font-medium leading-relaxed">
                        {batch.red_gerekce}
                      </p>
                    </div>
                  )}
                </div>

                {/* Arrow button */}
                <div className="shrink-0 mr-6">
                  <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-indigo-600 group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-blue-500/30">
                    <ArrowRight
                      size={18}
                      className="text-gray-400 transition-colors duration-300 group-hover:text-white"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl shadow-sm">
              <Package size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="font-black text-gray-600 text-base">Bu kategoride batch bulunamadı.</p>
              <p className="text-sm mt-1.5 text-gray-400 font-medium">
                Yeni bir batch oluşturmak için sağ üstteki butonu kullanın.
              </p>
            </div>
          )}
        </div>

        {/* ── Pagination ────────────────────────────────────────────────── */}
        {filtered.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200/60">
            <p className="text-xs text-gray-500">
              Toplam <span className="font-semibold text-gray-800">{filtered.length}</span>{' '}
              kayıttan{' '}
              <span className="font-semibold text-gray-800">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
              </span>{' '}
              arası gösteriliyor
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-semibold transition-colors ${currentPage === i + 1
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                      : 'text-gray-500 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ── Batch Picker Modal ────────────────────────────────────────────── */}
      {showBatchPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/25 backdrop-blur-sm"
            onClick={() => setShowBatchPicker(false)}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Batch Seçin</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Devam etmek istediğiniz DPP'yi seçin
                </p>
              </div>
              <button
                onClick={() => setShowBatchPicker(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <XCircle size={17} />
              </button>
            </div>

            {/* List */}
            <div className="px-3 py-3 max-h-80 overflow-y-auto space-y-1.5">
              {batches.map((batch) => {
                const isLoading = loadingBatch === batch.id;
                const cfg = STATUS_CONFIG[batch.dpp_durum];
                return (
                  <button
                    key={batch.id}
                    onClick={() => handleSelectExisting(batch.id)}
                    disabled={loadingBatch !== null}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all disabled:opacity-60 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                          {batch.parti_no}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${cfg.badgeCls}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {batch.urun_tipi}
                      </p>
                    </div>
                    {isLoading ? (
                      <Loader2 size={15} className="text-blue-500 animate-spin shrink-0" />
                    ) : (
                      <ArrowRight
                        size={14}
                        className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-[11px] text-gray-400 text-center">
                Seçim sonrası mevcut veriler otomatik yüklenir.
              </p>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}