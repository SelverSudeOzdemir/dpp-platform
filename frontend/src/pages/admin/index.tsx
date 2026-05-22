import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import {
  Bell, Plus, ChevronDown, Loader2, FileText, XCircle, ArrowRight,
} from 'lucide-react';
import {
  CERT_ALERTS, CBAM_LIMIT, TABS, STATUS_CFG,
} from '../../constants/adminConstants';
import OverviewTab from '../../components/admin/tabs/OverviewTab';
import ComplianceTab from '../../components/admin/tabs/ComplianceTab';
import AccessTab from '../../components/admin/tabs/AccessTab';
import SupplyChainTab from '../../components/admin/tabs/SupplyChainTab';
import ReportsTab from '../../components/admin/tabs/ReportsTab';
import PassportsTab from '../../components/admin/tabs/PassportsTab';
import type { AdminProduct, PendingBatch, PassportStatus } from '../../types/admin';
import {
  apiGetKpiSummary,
  apiGetPendingDpps,
  apiGetUrgentAlerts,
  apiApproveDpp,
  apiRejectDpp,
  apiGetDpps,
} from '../../lib/api';

export default function AdminPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [pendingBatches, setPendingBatches] = useState<PendingBatch[]>([]);
  const [menuOpen, setMenuOpen]               = useState(false);
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [loadingBatch, setLoadingBatch]       = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    loadDashboardData();
  }, [authLoading, isAuthenticated]);

  const loadDashboardData = async () => {
    try {
      const dpps = await apiGetDpps({ limit: 100 });
      if (dpps && dpps.length > 0) {
        const mappedProducts = dpps.map((d: any) => ({
          id: d.id,
          product_name: d.product_type?.product_name || 'Bilinmeyen Ürün',
          product_category: d.product_type?.product_category || 'Structural Steel',
          co2_cradle_to_gate_kg: d.carbon_footprint_total || 1.15,
          passport_status: d.dpp_status === 'published' ? 'Yayında' : d.dpp_status === 'draft' ? 'Taslak' : d.dpp_status === 'archived' ? 'Arşivlendi' : d.dpp_status === 'recalled' ? 'Geri Çağrıldı' : 'Taslak',
          version: d.current_version || '1.0',
          blockchain_timestamp: d.created_at || '',
        }));
        setProducts(mappedProducts);
      }

      const pending = await apiGetPendingDpps();
      if (pending && pending.length > 0) {
        const mappedPending = pending.map((d: any) => ({
          id: d.id,
          parti_no: d.gs1_serial_number || d.public_identifier || 'Parti No Yok',
          urun_tipi: d.product_name || 'Bilinmeyen Ürün',
          miktar_ton: 45.0,
          olusturan: 'Furkan Yıldız',
          gonderilme_tarihi: d.created_at ? new Date(d.created_at).toLocaleDateString() : '2026-03-15',
          co2_a1a3: 1.92,
          co2_verification: 'Dahili Hesaplama',
        }));
        setPendingBatches(mappedPending);
      }
    } catch (err) {
      console.error('Dashboard verileri alınamadı:', err);
    }
  };

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

  const handleApproveBatch = async (id: string) => {
    try {
      await apiApproveDpp(id);
      setPendingBatches(prev => prev.filter(b => b.id !== id));
      await loadDashboardData();
    } catch (err: any) {
      alert("Onaylanırken hata oluştu: " + (err.message || err));
    }
  };

  const handleRejectBatch = async (id: string, reason: string, fields: string[]) => {
    try {
      await apiRejectDpp(id, reason, fields);
      setPendingBatches(prev => prev.filter(b => b.id !== id));
      await loadDashboardData();
    } catch (err: any) {
      alert("Reddedilirken hata oluştu: " + (err.message || err));
    }
  };

  const handleStatusChange = (id: string, status: PassportStatus) =>
    setProducts(prev => prev.map(p => p.id === id ? { ...p, passport_status: status } : p));

  const criticalCerts  = CERT_ALERTS.filter(c => c.days_left <= 30);
  const cbamWarnings   = products.filter(p => p.co2_cradle_to_gate_kg > CBAM_LIMIT);
  const totalAlerts    = criticalCerts.length + cbamWarnings.length;

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
        {activeTab === 'overview'    && (
          <OverviewTab
            products={products}
            pendingBatches={pendingBatches}
            cbamWarnings={cbamWarnings}
            onApprove={handleApproveBatch}
            onRejectConfirm={handleRejectBatch}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'passports'   && (
          <PassportsTab
            products={products}
            pendingBatches={pendingBatches}
            onStatusChange={handleStatusChange}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'compliance'  && <ComplianceTab products={products} />}
        {activeTab === 'access'      && <AccessTab />}
        {activeTab === 'supplychain' && <SupplyChainTab />}
        {activeTab === 'reports'     && <ReportsTab products={products} />}
      </div>
    </div>

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
