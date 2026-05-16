import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { Package, Calendar, ArrowRight, ShieldCheck, Truck, ClipboardList } from 'lucide-react';

// Her role ait mock DPP listesi
const ROLE_DATA = {
  SUPPLIER: {
    title: 'Tedarik Ettiğiniz Partiler',
    description: 'Hammadde veya yarı mamul tedarik ettiğiniz batch\'lere ait DPP\'ler.',
    icon: Truck,
    color: 'orange',
    items: [
      { id: 'KCR-742', name: 'IPE 200 Yapısal Çelik Profil', role_detail: 'Ham Madde Tedarikçisi', date: '2026-03-10', status: 'Yayında', category: 'Structural Steel' },
      { id: 'KCR-891', name: 'HEB 300 Geniş Başlıklı Profil', role_detail: 'Ham Madde Tedarikçisi', date: '2026-03-12', status: 'Taslak',  category: 'Structural Steel' },
    ],
  },
  CUSTOMER: {
    title: 'Satın Aldığınız Partiler',
    description: 'Sipariş verdiğiniz veya teslim aldığınız ürünlere ait DPP\'ler.',
    icon: Package,
    color: 'blue',
    items: [
      { id: 'KCR-742', name: 'IPE 200 Yapısal Çelik Profil', role_detail: 'Alıcı', date: '2026-03-10', status: 'Yayında', category: 'Structural Steel' },
    ],
  },
  AUTHORITY: {
    title: 'Denetlemeniz Gereken Partiler',
    description: 'Yasal denetim kapsamındaki ürünlere ait DPP\'ler.',
    icon: ShieldCheck,
    color: 'purple',
    items: [
      { id: 'KCR-742', name: 'IPE 200 Yapısal Çelik Profil', role_detail: 'Denetleyici', date: '2026-03-10', status: 'Yayında', category: 'Structural Steel' },
      { id: 'KCR-558', name: 'CHS 88.9x3.2 Yuvarlak Boru',  role_detail: 'Denetleyici', date: '2026-03-14', status: 'Geri Çağrıldı', category: 'Tubes and Pipes' },
    ],
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

export default function MyDpps() {
  const router = useRouter();
  const { role, user } = useAuth();

  const data = ROLE_DATA[role as keyof typeof ROLE_DATA];

  // Rol değişimi sırasında (ör. logout) data henüz undefined olabilir — render'ı beklet
  if (!data) return null;

  // ADMIN bu sayfaya giremez, ADMIN için farklı sayfa var
  const content = (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

      {/* Başlık */}
      <div className="mb-8">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
          Hoş geldiniz, {user?.full_name}
        </p>
        <h1 className="text-2xl font-black text-gray-900">{data.title}</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">{data.description}</p>
      </div>

      {/* Liste */}
      <div className="space-y-4">
        {data.items.map((item) => {
          const colorKey = COLOR[ROLE_DATA[role as keyof typeof ROLE_DATA]?.color || 'blue'];
          const Icon = data.icon;
          return (
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
                    <span className="text-[10px] font-mono font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">{item.id}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_STYLE[item.status] || 'bg-gray-100 text-gray-600'}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm font-black text-gray-900">{item.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500 font-medium">{item.category}</span>
                    <span className="text-gray-300">•</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${colorKey.badge}`}>{item.role_detail}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <Calendar size={11} /> {item.date}
                    </span>
                  </div>
                </div>
              </div>
              <ArrowRight size={18} className="text-gray-300 group-hover:text-gray-600 transition-colors shrink-0" />
            </div>
          );
        })}
      </div>

      {data.items.length === 0 && (
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
