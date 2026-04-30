import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { productService, Product } from '../Services/productService';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/spinner';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { Plus, ChevronDown, FileText, XCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen]               = useState(false);
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [loadingBatch, setLoadingBatch]       = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  // 1. Veri çekme işlemini bağımsız bir fonksiyona ayırdık (Scope sorunu çözüldü)
  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Veriler yüklenirken hata oluştu:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Sayfa ilk yüklendiğinde verileri çek
  useEffect(() => {
    loadProducts();
  }, []);

  // 3. Silme Fonksiyonu
  const handleDelete = async (id: string) => {
    // Kullanıcıya emin misin diye soruyoruz
    if (window.confirm("Bu pasaportu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
      try {
        await productService.deleteProduct(id); // LocalStorage'dan sil
        await loadProducts(); // Güncel listeyi tekrar ekrana bas
      } catch (error) {
        console.error("Silme işlemi başarısız:", error);
        alert("Silme işlemi sırasında bir hata oluştu.");
      }
    }
  };

  // Yüklenme Ekranı (Spinner)
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
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Üst Başlık ve Eylem Butonu */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dijital Ürün Pasaportları</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Kocaer Çelik ürün portföyü ve izlenebilirlik dataları.</p>
        </div>
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

      {/* İstatistik Özetleri */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-5 border-l-4 border-blue-500 bg-white shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Toplam Kayıt</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{products.length}</p>
        </Card>
        <Card className="p-5 border-l-4 border-green-500 bg-white shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Aktif Yayınlar</p>
          <p className="text-3xl font-black text-gray-900 mt-1">
            {products.filter(p => p.status === 'Aktif').length}
          </p>
        </Card>
        <Card className="p-5 border-l-4 border-yellow-500 bg-white shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Taslak Durumunda</p>
          <p className="text-3xl font-black text-gray-900 mt-1">
            {products.filter(p => p.status === 'Taslak').length}
          </p>
        </Card>
      </div>

      {/* Modern Veri Tablosu */}
      <div className="bg-white shadow-xl shadow-gray-100 border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ürün Bilgisi</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Oluşturma</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {/* Ürünleri Listeleme */}
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {product.id}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{product.product_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{product.product_category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      product.status === 'Aktif' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        product.status === 'Aktif' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></span>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                    {product.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {/* SİLME VE DETAY BUTONLARI */}
                          <div className="flex items-center justify-end gap-3">                       
                        <button onClick={() => handleDelete(product.id)}
                        className="text-red-500 hover:text-red-700 font-bold transition-colors"
                      >
                        Sil
                        
                      </button>
                      <button 
                      onClick={() => router.push(`/dpp/${product.id}`)}
                      className="text-blue-600 hover:text-blue-800 font-bold transition-colors">
                        Görüntüle 
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {/* Eğer hiç ürün yoksa boş state göster */}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Sistemde henüz bir ürün pasaportu bulunmuyor. Yeni bir tane ekleyerek başlayabilirsiniz.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                        {p.status && (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {p.status}
                          </span>
                        )}
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