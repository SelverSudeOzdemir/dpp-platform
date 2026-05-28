import { useEffect, useState, useRef, Fragment, useMemo } from 'react';
import { useRouter } from 'next/router';
import { productService, Product } from '../Services/productService';
import { apiGetDppSummaryStats } from '../lib/api';
import Spinner from '../components/ui/spinner';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { Plus, ChevronDown, FileText, XCircle, ArrowRight, Loader2, Search, CheckCircle2, Clock, AlertCircle, Zap, Leaf, Calendar } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SummaryStats {
  total: number; published: number; draft: number;
  pending_approval: number; rejected: number; archived: number;
}

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Product['status'] | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleSelectExisting = (productId: string) => {
    setLoadingBatch(productId);
    setTimeout(() => router.push(`/batches/new?batchId=${productId}`), 1200);
  };

  // DPP listesi + summary-stats paralel çekilir
  const loadData = async () => {
    setLoading(true);
    try {
      const [list, summary] = await Promise.all([
        productService.getProducts(),
        apiGetDppSummaryStats(),
      ]);
      setProducts(list);
      setStats(summary);
    } catch (err) {
      console.error('Veriler yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    loadData();
  }, [authLoading, isAuthenticated]);

  const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const CATEGORY_SHORT: Record<string, string> = {
    'Structural Steel': 'Yapısal Çelik',
    'Flat Products': 'Düz Ürünler',
    'Long Products': 'Uzun Ürünler',
    'Tubes and Pipes': 'Boru & Tüp',
  };

  const monthlyData = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const raw = p.issued_at || '';
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([key, count]) => {
        const [year, month] = key.split('-');
        return { month: `${MONTH_NAMES[parseInt(month) - 1]} '${year.slice(2)}`, count };
      });
  }, [products]);

  const categoryData = useMemo(() => {
    const cats: Record<string, { published: number; draft: number; pending: number; rejected: number }> = {};
    products.forEach(p => {
      const cat = p.product_category || 'Diğer';
      if (!cats[cat]) cats[cat] = { published: 0, draft: 0, pending: 0, rejected: 0 };
      if (p.status === 'Aktif') cats[cat].published++;
      else if (p.status === 'Taslak') cats[cat].draft++;
      else if (p.status === 'Onay Bekliyor') cats[cat].pending++;
      else if (p.status === 'Reddedilmiş') cats[cat].rejected++;
    });
    return Object.entries(cats).map(([cat, vals]) => ({
      category: CATEGORY_SHORT[cat] || cat,
      ...vals,
    }));
  }, [products]);

  const recentProducts = useMemo(() => products.slice(0, 5), [products]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Spinner size="lg" className="text-blue-600" />
        <p className="text-gray-500 font-medium animate-pulse">Veriler güvenli şekilde getiriliyor...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* Başlık + Eylem */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b-2 border-gray-100">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-10 bg-gradient-to-b from-blue-600 to-blue-700 rounded-full"></div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Dijital Ürün Pasaportları</h1>
            </div>
            <p className="text-base text-gray-600 font-medium ml-6">Kocaer Çelik ürün portföyü ve izlenebilirlik dataları.</p>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-black rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all duration-200"
            >
              <Plus size={18} /> DPP İşlemleri <ChevronDown size={16} className={`transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-100 z-50 overflow-hidden">
                <button onClick={() => { setMenuOpen(false); router.push('/batches/new'); }}
                  className="w-full text-left px-5 py-4 hover:bg-blue-50 transition-colors group border-b border-gray-50">
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
                <button onClick={() => { setMenuOpen(false); setShowBatchPicker(true); }}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors group">
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

        {/* Durum Filtre Kartları */}
        {(() => {
          const STATUS_CARDS = [
            {
              key: 'Aktif',
              label: 'Yayında',
              count: stats?.published ?? products.filter(p => p.status === 'Aktif').length,
              bgGradient: 'from-green-50 to-emerald-50',
              borderColor: 'border-green-300',
              text: 'text-green-700',
              activeBg: 'from-green-100 to-emerald-100 ring-2 ring-green-400',
              icon: <CheckCircle2 size={20} className="text-green-600" />,
            },
            {
              key: 'Taslak',
              label: 'Taslak',
              count: stats?.draft ?? products.filter(p => p.status === 'Taslak').length,
              bgGradient: 'from-yellow-50 to-amber-50',
              borderColor: 'border-yellow-300',
              text: 'text-yellow-700',
              activeBg: 'from-yellow-100 to-amber-100 ring-2 ring-yellow-400',
              icon: <Clock size={20} className="text-yellow-600" />,
            },
            {
              key: 'Reddedilmiş',
              label: 'Reddedilmiş',
              count: stats?.rejected ?? products.filter(p => p.status === 'Reddedilmiş').length,
              bgGradient: 'from-red-50 to-rose-50',
              borderColor: 'border-red-300',
              text: 'text-red-700',
              activeBg: 'from-red-100 to-rose-100 ring-2 ring-red-400',
              icon: <AlertCircle size={20} className="text-red-600" />,
            },
            {
              key: 'Onay Bekliyor',
              label: 'Onay Bekleyen',
              count: stats?.pending_approval ?? products.filter(p => p.status === 'Onay Bekliyor').length,
              bgGradient: 'from-amber-50 to-orange-50',
              borderColor: 'border-amber-300',
              text: 'text-amber-700',
              activeBg: 'from-amber-100 to-orange-100 ring-2 ring-amber-400',
              icon: <Zap size={20} className="text-amber-600" />,
            },
          ];
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {STATUS_CARDS.map(card => {
                const isActive = statusFilter === card.key;
                return (
                  <button
                    key={card.key}
                    onClick={() => setStatusFilter(isActive ? null : card.key as Product['status'])}
                    className={`group relative p-6 rounded-2xl border-2 ${card.borderColor} text-left transition-all duration-300 overflow-hidden ${isActive ? `bg-gradient-to-br ${card.activeBg} shadow-lg hover:shadow-xl` : `bg-gradient-to-br ${card.bgGradient} shadow-md hover:shadow-lg`}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-black text-gray-600 uppercase tracking-widest">{card.label}</p>
                      <div className={`p-2.5 rounded-lg transition-all ${isActive ? 'bg-white bg-opacity-30' : 'bg-white bg-opacity-50 group-hover:bg-opacity-70'}`}>
                        {card.icon}
                      </div>
                    </div>
                    <p className={`text-4xl font-black ${card.text} transition-all`}>{card.count}</p>
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* Filtre Barı */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Ürün adı veya parti no ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XCircle size={14} />
              </button>
            )}
          </div>
          {(statusFilter || search) && (
            <button
              onClick={() => { setStatusFilter(null); setSearch(''); }}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap"
            >
              Filtreleri Temizle ×
            </button>
          )}
          <span className="text-xs text-gray-400 font-medium ml-auto whitespace-nowrap">
            {(() => {
              const q = search.trim().toLowerCase();
              const count = products.filter(p => {
                const matchStatus = !statusFilter || p.status === statusFilter;
                const matchSearch = !q || p.product_name.toLowerCase().includes(q) || (p.batch_number || '').toLowerCase().includes(q);
                return matchStatus && matchSearch;
              }).length;
              return `${count} / ${products.length} kayıt`;
            })()}
          </span>
        </div>

        {/* DPP Tablosu */}
        {(() => {
          const q = search.trim().toLowerCase();
          const filtered = products.filter(p => {
            const matchStatus = !statusFilter || p.status === statusFilter;
            const matchSearch = !q || p.product_name.toLowerCase().includes(q) || (p.batch_number || '').toLowerCase().includes(q);
            return matchStatus && matchSearch;
          });

          const totalPages = Math.ceil(filtered.length / itemsPerPage);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

          return (
            <div className="bg-white shadow-2xl shadow-blue-100 border border-gray-100 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-5 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Parti No</th>
                      <th className="px-6 py-5 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Ürün Bilgisi</th>
                      <th className="px-6 py-5 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Kategori</th>
                      <th className="px-6 py-5 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Durum</th>
                      <th className="px-6 py-5 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Oluşturma</th>
                      <th className="px-6 py-5 text-right text-xs font-black text-gray-700 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {currentItems.map((product) => {
                      const isExpanded = expandedRow === product.id;
                      const s = product.dpp_status?.toLowerCase() ?? '';
                      const isRejected = s === 'rejected' || product.status === 'Reddedilmiş';
                      const timelineSteps = [
                        { label: 'Taslak', done: true },
                        { label: 'Onay Bekliyor', done: ['pending_approval', 'submitted', 'pending', 'published', 'active'].includes(s) },
                        { label: 'Yayında', done: ['published', 'active'].includes(s) },
                      ];
                      return (
                        <Fragment key={product.id}>
                          <tr
                            onClick={() => setExpandedRow(isExpanded ? null : product.id)}
                            className={`cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent transition-colors duration-200 group border-b border-gray-100 ${isExpanded ? 'bg-blue-50/40' : ''}`}
                          >
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} />
                                <span className="text-xs font-mono font-black text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200">
                                  {product.batch_number || '—'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">{product.product_name}</div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm text-gray-600 font-medium">{product.product_category}</div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold gap-2 shadow-sm ${product.status === 'Aktif' ? 'bg-green-100 text-green-800' :
                                  product.status === 'Taslak' ? 'bg-yellow-100 text-yellow-800' :
                                    product.status === 'Reddedilmiş' ? 'bg-red-100 text-red-800' :
                                      product.status === 'Onay Bekliyor' ? 'bg-amber-100 text-amber-800' :
                                        'bg-gray-100 text-gray-700'
                                }`}>
                                <span className={`w-2 h-2 rounded-full animate-pulse ${product.status === 'Aktif' ? 'bg-green-600' :
                                    product.status === 'Taslak' ? 'bg-yellow-600' :
                                      product.status === 'Reddedilmiş' ? 'bg-red-600' :
                                        product.status === 'Onay Bekliyor' ? 'bg-amber-600' :
                                          'bg-gray-500'
                                  }`} />
                                {product.status === 'Aktif' ? 'Yayında' : product.status}
                              </span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 font-medium">
                              {product.createdAt}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); router.push(`/dpp/${product.id}`); }}
                                  className="px-3 py-1.5 text-white bg-blue-600 hover:bg-blue-700 font-bold text-xs rounded-lg transition-colors shadow-sm"
                                >
                                  Görüntüle
                                </button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="border-b border-blue-100">
                              <td colSpan={6} className="px-6 py-5 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                  {/* Pasaport Bilgileri */}
                                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileText size={13} className="text-blue-600" />
                                      </div>
                                      <span className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Pasaport Bilgileri</span>
                                    </div>
                                    <div className="space-y-2.5">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={11} />Oluşturulma</span>
                                        <span className="text-xs font-bold text-gray-800">{product.createdAt || '—'}</span>
                                      </div>
                                      {product.valid_until && (
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={11} />Geçerlilik</span>
                                          <span className="text-xs font-bold text-gray-800">{new Date(product.valid_until).toLocaleDateString('tr-TR')}</span>
                                        </div>
                                      )}
                                      {product.created_by_email && (
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-gray-500">Oluşturan</span>
                                          <span className="text-xs font-bold text-gray-800 truncate max-w-[140px]" title={product.created_by_email}>{product.created_by_email}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500">Versiyon</span>
                                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{product.version || 'v1'}</span>
                                      </div>
                                      {product.steel_grade && (
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-gray-500">Çelik Kalitesi</span>
                                          <span className="text-xs font-bold text-gray-800">{product.steel_grade}</span>
                                        </div>
                                      )}
                                      {product.production_date && (
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-gray-500">Üretim Tarihi</span>
                                          <span className="text-xs font-bold text-gray-800">{product.production_date}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Sürdürülebilirlik */}
                                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Leaf size={13} className="text-green-600" />
                                      </div>
                                      <span className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Sürdürülebilirlik</span>
                                    </div>
                                    <div className="space-y-3">
                                      {product.co2_cradle_to_gate_kg != null && (
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-gray-500">CO₂ Ayak İzi</span>
                                          <span className="text-xs font-bold text-gray-800">{product.co2_cradle_to_gate_kg} kg CO₂e</span>
                                        </div>
                                      )}
                                      {product.recycled_content_pct != null && (
                                        <div>
                                          <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs text-gray-500">Geri Dön. İçerik</span>
                                            <span className="text-xs font-bold text-green-700">%{product.recycled_content_pct}</span>
                                          </div>
                                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(product.recycled_content_pct, 100)}%` }} />
                                          </div>
                                        </div>
                                      )}
                                      {product.certifications && product.certifications.length > 0 && (
                                        <div>
                                          <span className="text-xs text-gray-500 block mb-1.5">Sertifikalar</span>
                                          <div className="flex flex-wrap gap-1">
                                            {product.certifications.slice(0, 4).map((c, i) => (
                                              <span key={i} className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">{c.cert_type}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {product.co2_cradle_to_gate_kg == null && product.recycled_content_pct == null && (!product.certifications || product.certifications.length === 0) && (
                                        <p className="text-xs text-gray-400 italic">Sürdürülebilirlik verisi henüz girilmemiş.</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* DPP Yolculuğu */}
                                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <ArrowRight size={13} className="text-purple-600" />
                                      </div>
                                      <span className="text-[11px] font-black text-gray-600 uppercase tracking-wider">DPP Yolculuğu</span>
                                    </div>
                                    {isRejected ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 size={11} className="text-white" />
                                          </div>
                                          <span className="text-xs font-bold text-gray-700">Taslak</span>
                                        </div>
                                        <div className="ml-[9px] w-px h-3 bg-gray-200" />
                                        <div className="flex items-start gap-2.5">
                                          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <XCircle size={11} className="text-white" />
                                          </div>
                                          <div>
                                            <span className="text-xs font-bold text-red-700">Reddedildi</span>
                                            {product.rejected_by && <p className="text-[10px] text-gray-400 mt-0.5">Reddeden: {product.rejected_by}</p>}
                                            {product.rejection_reason && <p className="text-[10px] text-gray-500 mt-1 italic bg-red-50 px-2 py-1 rounded-md border border-red-100">"{product.rejection_reason}"</p>}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        {timelineSteps.map((step, idx) => (
                                          <div key={step.label}>
                                            <div className="flex items-center gap-2.5">
                                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${step.done ? 'bg-blue-600 shadow-sm shadow-blue-200' : 'bg-gray-100 border border-gray-200'}`}>
                                                {step.done
                                                  ? <CheckCircle2 size={11} className="text-white" />
                                                  : <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                }
                                              </div>
                                              <span className={`text-xs font-bold ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</span>
                                            </div>
                                            {idx < timelineSteps.length - 1 && (
                                              <div className={`ml-[9px] w-px h-3 ${step.done ? 'bg-blue-200' : 'bg-gray-100'}`} />
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                              <FileText size={24} className="text-gray-400" />
                            </div>
                            <div>
                              <p className="text-gray-700 font-bold text-sm mb-1">
                                {products.length === 0
                                  ? 'Henüz bir ürün pasaportu yok'
                                  : 'Sonuç bulunamadı'}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {products.length === 0
                                  ? 'Yeni bir DPP oluşturarak başlayabilirsiniz.'
                                  : 'Başka filtreler deneyin veya aramasını değiştirin.'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-6 py-5 border-t border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50">
                  <div className="text-sm text-gray-700 font-bold">
                    Toplam <span className="font-black text-gray-900">{filtered.length}</span> kayıttan <span className="font-black text-gray-900">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filtered.length)}</span> arası gösteriliyor
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Önceki
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-9 h-9 text-sm font-bold rounded-lg border transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-blue-300'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Sonraki →
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── Analitik Bölümü ─────────────────────────────────── */}
        {products.length > 0 && (
          <div className="mt-8 space-y-6">

            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-blue-400 rounded-full" />
              <h2 className="text-lg font-black text-gray-900">Analitik & Özet</h2>
            </div>

            {/* Üst satır: Trend + Son Aktivite */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* Aylık Trend */}
              <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <p className="text-sm font-black text-gray-800">Aylık DPP Oluşturma Trendi</p>
                <p className="text-xs text-gray-400 mt-0.5 mb-5">Son dönemde sisteme eklenen pasaport sayısı</p>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={190}>
                    <AreaChart data={monthlyData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 700 }} />
                      <Area type="monotone" dataKey="count" name="DPP Sayısı" stroke="#3b82f6" strokeWidth={2.5} fill="url(#trendGrad)" dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[190px] flex items-center justify-center">
                    <p className="text-sm text-gray-400">Tarih verisi bulunamadı.</p>
                  </div>
                )}
              </div>

              {/* Son 5 DPP */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <p className="text-sm font-black text-gray-800">Son Eklenen DPP&apos;ler</p>
                <p className="text-xs text-gray-400 mt-0.5 mb-4">En son sisteme giren pasaportlar</p>
                <div className="space-y-3">
                  {recentProducts.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/dpp/${p.id}`)}
                      className="w-full flex items-center gap-3 group text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-black text-blue-500">{i + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors">{p.product_name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{p.batch_number || '—'} · {p.createdAt}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        p.status === 'Aktif'         ? 'bg-green-100 text-green-700' :
                        p.status === 'Taslak'        ? 'bg-yellow-100 text-yellow-700' :
                        p.status === 'Onay Bekliyor' ? 'bg-amber-100 text-amber-700' :
                        p.status === 'Reddedilmiş'   ? 'bg-red-100 text-red-700' :
                                                       'bg-gray-100 text-gray-600'
                      }`}>
                        {p.status === 'Aktif' ? 'Yayında' : p.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Alt satır: Kategori × Durum */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-sm font-black text-gray-800">Kategori Bazlı Durum Dağılımı</p>
              <p className="text-xs text-gray-400 mt-0.5 mb-5">Her ürün kategorisinde pasaport durumlarının dağılımı</p>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categoryData} margin={{ top: 4, right: 16, left: -24, bottom: 4 }} barSize={16} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 700 }} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 10 }} />
                    <Bar dataKey="published" name="Yayında"        fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="pending"   name="Onay Bekliyor"  fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="draft"     name="Taslak"         fill="#94a3b8" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="rejected"  name="Reddedilmiş"    fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-sm text-gray-400">Gösterilecek veri yok.</p>
                </div>
              )}
            </div>

          </div>
        )}

        </div>
      </div>

      {/* Batch Seçim Modalı */}
      {showBatchPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowBatchPicker(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-black text-gray-900">Batch Seçin</h2>
                <p className="text-xs text-gray-400 font-medium mt-0.5">Devam etmek istediğiniz DPP&apos;yi seçin</p>
              </div>
              <button onClick={() => setShowBatchPicker(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <XCircle size={18} />
              </button>
            </div>
            <div className="px-4 py-3 max-h-80 overflow-y-auto space-y-1.5">
              {products.map((p) => {
                const isLoading = loadingBatch === p.id;
                return (
                  <button key={p.id} onClick={() => handleSelectExisting(p.id)}
                    disabled={loadingBatch !== null}
                    className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all disabled:opacity-60 group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                          {p.id.length > 12 ? `${p.id.slice(0, 8)}…` : p.id}
                        </span>
                        {p.status && (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {p.status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-800 truncate">{p.product_name}</p>
                    </div>
                    {isLoading
                      ? <Loader2 size={16} className="text-blue-500 animate-spin shrink-0" />
                      : <ArrowRight size={15} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                    }
                  </button>
                );
              })}
              {products.length === 0 && (
                <p className="text-center py-8 text-sm text-gray-400 font-medium">Henüz batch bulunamadı.</p>
              )}
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