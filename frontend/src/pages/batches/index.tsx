import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import {
  Package, Calendar, ArrowRight, Clock, CheckCircle2,
  XCircle, FileText, Plus, Search, ChevronDown, Loader2,
} from 'lucide-react';
import { apiGetDpps } from '../../lib/api';

// ─── TİPLER ──────────────────────────────────────────────────────────────────
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

// ─── DURUM STİLLERİ ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<BatchStatus, { label: string; className: string; icon: React.ReactNode }> = {
  'Taslak':        { label: 'Taslak',         className: 'bg-gray-100 text-gray-600',    icon: <FileText size={11} /> },
  'Onay Bekliyor': { label: 'Onay Bekliyor',  className: 'bg-amber-100 text-amber-700',  icon: <Clock size={11} /> },
  'Yayında':       { label: 'Yayında',         className: 'bg-green-100 text-green-700',  icon: <CheckCircle2 size={11} /> },
  'Reddedildi':    { label: 'Reddedildi',      className: 'bg-red-100 text-red-700',      icon: <XCircle size={11} /> },
  'Arşivlendi':    { label: 'Arşivlendi',      className: 'bg-slate-100 text-slate-500',  icon: <FileText size={11} /> },
};

const STATUS_ICON_STYLE: Record<BatchStatus, string> = {
  'Taslak':        'bg-gray-100 text-gray-500',
  'Onay Bekliyor': 'bg-amber-50 text-amber-500',
  'Yayında':       'bg-green-50 text-green-600',
  'Reddedildi':    'bg-red-50 text-red-500',
  'Arşivlendi':    'bg-slate-100 text-slate-400',
};

function matchesTab(batch: Batch, tab: TabKey): boolean {
  if (tab === 'Tümü')          return true;
  if (tab === 'Taslak')        return batch.dpp_durum === 'Taslak';
  if (tab === 'Onay Bekliyor') return batch.dpp_durum === 'Onay Bekliyor';
  if (tab === 'Reddedildi')    return batch.dpp_durum === 'Reddedildi';
  if (tab === 'Yayında')       return batch.dpp_durum === 'Yayında';
  return false;
}

// ─── SAYFA ───────────────────────────────────────────────────────────────────
export default function BatchList() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch]       = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('Taslak');
  const [menuOpen, setMenuOpen]           = useState(false);
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [loadingBatch, setLoadingBatch]   = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const dpps = await apiGetDpps({ limit: 100 });
      if (dpps && dpps.length > 0) {
        const mapped = dpps.map((d: any) => ({
          id: d.id,
          parti_no: d.gs1_serial_number || d.public_identifier || 'B-000',
          urun_tipi: d.product_type?.product_name || 'IPE 200 Yapısal Çelik Profil',
          ocak_no: d.production_line || 'EAF-01',
          uretim_tarihi: d.production_date || '2026-03-12',
          miktar_ton: 45.0,
          dpp_durum: d.dpp_status === 'published' ? 'Yayında' : d.dpp_status === 'draft' ? 'Taslak' : d.dpp_status === 'pending_approval' ? 'Onay Bekliyor' : d.dpp_status === 'rejected' ? 'Reddedildi' : 'Taslak',
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

  // Dışarı tıklanınca dropdown kapansın
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

  const handleSelectExisting = (batchId: string) => {
    setLoadingBatch(batchId);
    setTimeout(() => {
      router.push(`/batches/new?batchId=${batchId}`);
    }, 1200);
  };

  const counts: Record<TabKey, number> = {
    'Tümü':          batches.length,
    'Taslak':        batches.filter((b) => matchesTab(b, 'Taslak')).length,
    'Onay Bekliyor': batches.filter((b) => matchesTab(b, 'Onay Bekliyor')).length,
    'Reddedildi':    batches.filter((b) => matchesTab(b, 'Reddedildi')).length,
    'Yayında':       batches.filter((b) => matchesTab(b, 'Yayında')).length,
  };

  const filtered = batches.filter((b) => {
    const matchSearch =
      b.parti_no.toLowerCase().includes(search.toLowerCase()) ||
      b.urun_tipi.toLowerCase().includes(search.toLowerCase());
    return matchSearch && matchesTab(b, activeTab);
  });

  const TABS: { key: TabKey; label: string; activeClass: string; badgeClass: string }[] = [
    { key: 'Tümü',          label: 'Tümü',          activeClass: 'border-gray-700 text-gray-800',   badgeClass: 'bg-gray-100 text-gray-700' },
    { key: 'Taslak',        label: 'Taslak',        activeClass: 'border-gray-500 text-gray-600',   badgeClass: 'bg-gray-100 text-gray-600' },
    { key: 'Onay Bekliyor', label: 'Onay Bekliyor', activeClass: 'border-amber-500 text-amber-700', badgeClass: 'bg-amber-100 text-amber-700' },
    { key: 'Reddedildi',    label: 'Reddedildi',    activeClass: 'border-red-500 text-red-600',     badgeClass: 'bg-red-100 text-red-600' },
    { key: 'Yayında',       label: 'Yayında',       activeClass: 'border-green-600 text-green-700', badgeClass: 'bg-green-100 text-green-700' },
  ];

  return (
    <ProtectedRoute allowedRoles={['ENGINEER', 'ADMIN']}>
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* Başlık */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Üretim Batch'leri</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Oluşturduğunuz üretim partileri ve DPP durumları.
            </p>
          </div>
          {/* DPP İşlemleri dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-100 transition-colors"
            >
              <Plus size={16} /> DPP İşlemleri <ChevronDown size={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
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
        </div>

        {/* Tab Navigasyon */}
        <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? tab.activeClass
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                activeTab === tab.key ? tab.badgeClass : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Arama */}
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Parti no veya ürün tipi ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Batch Listesi */}
        <div className="space-y-3">
          {filtered.map((batch) => {
            const status = STATUS_CONFIG[batch.dpp_durum];
            return (
              <div
                key={batch.id}
                className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-4 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group"
                onClick={() => router.push(`/batches/${batch.id}`)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`p-3 rounded-2xl shrink-0 ${STATUS_ICON_STYLE[batch.dpp_durum]}`}>
                    <Package size={20} />
                  </div>
                  <div className="min-w-0">
                    {/* Üst satır: Parti No + Durum + Kaynak */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                        {batch.parti_no}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${status.className}`}>
                        {status.icon} {status.label}
                      </span>
                    </div>
                    {/* Ürün tipi */}
                    <p className="text-sm font-black text-gray-900 truncate">{batch.urun_tipi}</p>
                    {/* Alt detaylar */}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500 font-medium">Ocak: {batch.ocak_no}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <Calendar size={11} /> {batch.uretim_tarihi}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500 font-medium">{batch.miktar_ton} ton</span>
                    </div>
                    {/* Red gerekçesi */}
                    {batch.dpp_durum === 'Reddedildi' && batch.red_gerekce && (
                      <div className="mt-2 flex items-start gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <XCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 font-medium">{batch.red_gerekce}</p>
                      </div>
                    )}
                  </div>
                </div>
                <ArrowRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-gray-500">Bu kategoride batch bulunamadı.</p>
              <p className="text-sm mt-1">Yeni bir batch oluşturmak için sağ üstteki butonu kullanın.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── BATCH SEÇİM MODAL'I ──────────────────────────────────────────── */}
      {showBatchPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowBatchPicker(false)}
          />
          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Başlık */}
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

            {/* Liste */}
            <div className="px-4 py-3 max-h-80 overflow-y-auto space-y-1.5">
              {batches.map((batch) => {
                const isLoading = loadingBatch === batch.id;
                const cfg = STATUS_CONFIG[batch.dpp_durum];
                return (
                  <button
                    key={batch.id}
                    onClick={() => handleSelectExisting(batch.id)}
                    disabled={loadingBatch !== null}
                    className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all disabled:opacity-60 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                          {batch.parti_no}
                        </span>
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${cfg.className}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 truncate">{batch.urun_tipi}</p>
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

            {/* Alt bilgi */}
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
