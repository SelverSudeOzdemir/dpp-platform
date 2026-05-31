import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { Package, Calendar, ArrowRight, ShieldCheck, Truck, ClipboardList, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiGetDpps } from '../lib/api';

// Rol bazlı başlık ve görsel konfigürasyonu (mock veri yok)
const ROLE_CONFIG: Record<string, { title: string; description: string; icon: any; color: string }> = {
  SUPPLIER: {
    title: 'Tedarik Ettiğiniz Partiler',
    description: 'Hammadde veya yarı mamul tedarik ettiğiniz batch\'lere ait DPP\'ler.',
    icon: Truck,
    color: 'orange',
  },
  CUSTOMER: {
    title: 'Satın Aldığınız Partiler',
    description: 'Sipariş verdiğiniz veya teslim aldığınız ürünlere ait DPP\'ler.',
    icon: Package,
    color: 'blue',
  },
  AUTHORITY: {
    title: 'Denetlemeniz Gereken Partiler',
    description: 'Yasal denetim kapsamındaki ürünlere ait DPP\'ler.',
    icon: ShieldCheck,
    color: 'purple',
  },
};

const STATUS_STYLE: Record<string, string> = {
  'Yayında':       'bg-green-100 text-green-700',
  'Taslak':        'bg-yellow-100 text-yellow-700',
  'Geri Çağrıldı': 'bg-red-100 text-red-700',
  'Arşivlendi':    'bg-gray-100 text-gray-600',
};

const COLOR: Record<string, { header: string; icon: string; badge: string }> = {
  orange: { header: 'from-orange-50 to-white border-orange-200', icon: 'text-orange-600 bg-orange-100', badge: 'bg-orange-100 text-orange-700' },
  blue:   { header: 'from-blue-50 to-white border-blue-200',     icon: 'text-blue-600 bg-blue-100',     badge: 'bg-blue-100 text-blue-700'     },
  purple: { header: 'from-purple-50 to-white border-purple-200', icon: 'text-purple-600 bg-purple-100', badge: 'bg-purple-100 text-purple-700' },
};

function mapStatus(raw?: string): string {
  switch (raw?.toUpperCase()) {
    case "PUBLISHED":
    case "ACTIVE":
      return "Yayında";
    case "DRAFT":
      return "Taslak";
    case "RECALLED":
      return "Geri Çağrıldı";
    case "ARCHIVED":
      return "Arşivlendi";
    default:
      return "Taslak";
  }
}

export default function MyDpps() {
  const router = useRouter();
  const { role, user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (!config) return;
    loadDpps();
  }, [role, isAuthenticated, authLoading]);

  const loadDpps = async () => {
    setLoading(true);
    try {
      const dpps = await apiGetDpps();
      if (dpps && dpps.length > 0) {
        let mapped = dpps.map((d: any) => ({
          id: d.id,
          name: d.name || d.product_type?.product_name || 'Bilinmeyen Ürün',
          role_detail: role === 'SUPPLIER' ? 'Ham Madde Tedarikçisi' : role === 'CUSTOMER' ? 'Alıcı' : 'Denetleyici',
          date: d.production_date || '',
          status: mapStatus(d.dpp_status),
          category: d.category || d.product_type?.product_category || 'Structural Steel',
        }));

        // Rol bazlı gerçekçi filtreleme simülasyonu
        if (role === 'CUSTOMER') {
          // Müşteri sadece yayında olanları görebilir
          mapped = mapped.filter((d: any) => d.status === 'Yayında');
        } else if (role === 'SUPPLIER') {
          // Tedarikçi kendi ham madde sağladığı aktif/taslak süreçleri görebilir
          mapped = mapped.filter((d: any) => d.status === 'Taslak' || d.status === 'Yayında');
        } else if (role === 'AUTHORITY') {
          // Denetçi her şeyi görebilir
          mapped = mapped;
        }

        setItems(mapped);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("DPP listesi alınamadı:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Rol değişimi sırasında (ör. logout) config henüz undefined olabilir — render'ı beklet
  if (!config) return null;

  const colorKey = COLOR[config.color || 'blue'];
  const Icon = config.icon;

  const content = (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

      {/* Başlık */}
      <div className="mb-8">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
          Hoş geldiniz, {user?.full_name}
        </p>
        <h1 className="text-2xl font-black text-gray-900">{config.title}</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">{config.description}</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={32} className="text-blue-500 animate-spin" />
          <p className="text-sm font-bold text-gray-400">DPP verileri yükleniyor...</p>
        </div>
      )}

      {/* Liste */}
      {!loading && (
        <div className="space-y-4">
          {items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => (
            <div
              key={item.id}
              className={`bg-gradient-to-r ${colorKey.header} border rounded-2xl p-5 flex items-center justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer group`}
              onClick={() => router.push(`/dpp/${item.id}`)}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${colorKey.icon}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">{typeof item.id === 'string' && item.id.length > 8 ? item.id.slice(0, 8) + '…' : item.id}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_STYLE[item.status] || 'bg-gray-100 text-gray-600'}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm font-black text-gray-900">{item.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500 font-medium">{item.category}</span>
                    <span className="text-gray-300">•</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${colorKey.badge}`}>{item.role_detail}</span>
                    {item.date && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                          <Calendar size={11} /> {item.date}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <ArrowRight size={18} className="text-gray-300 group-hover:text-gray-600 transition-colors shrink-0" />
            </div>
          ))}

          {/* Sayfalama (Pagination) */}
          {items.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between pt-4 mt-6 border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium">
                Toplam <span className="font-bold text-gray-900">{items.length}</span> kayıttan{' '}
                <span className="font-bold text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, items.length)}</span> arası gösteriliyor
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.ceil(items.length / ITEMS_PER_PAGE) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                        currentPage === i + 1
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(items.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={currentPage === Math.ceil(items.length / ITEMS_PER_PAGE)}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-bold">Size ilişkilendirilmiş DPP bulunamadı.</p>
        </div>
      )}
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={['SUPPLIER', 'CUSTOMER', 'AUTHORITY']}>
      {content}
    </ProtectedRoute>
  );
}
