import { useState } from 'react';
import { ClipboardList, Zap, GitBranch, Shield, Database, Edit3 } from 'lucide-react';
import { VERSION_HISTORY } from '../../../constants/adminConstants';
import type { AdminProduct, PendingBatch, PassportStatus } from '../../../types/admin';

interface Props {
  products: AdminProduct[];
  pendingBatches: PendingBatch[];
  onStatusChange: (id: string, status: PassportStatus) => void;
  setActiveTab: (tab: string) => void;
}

export default function PassportsTab({ products, pendingBatches, onStatusChange, setActiveTab }: Props) {
  const [search, setSearch] = useState('');
  const [pendingStatusChange, setPendingStatusChange] = useState<{ id: string; status: PassportStatus } | null>(null);

  const filteredProducts = search.trim()
    ? products.filter(p =>
        p.product_name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  return (
    <div className="space-y-8">

      {/* Onay Bekleyen Banner */}
      {pendingBatches.length > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-3">
            <Zap size={15} className="text-amber-600 shrink-0" />
            <span className="text-sm font-black text-amber-800">
              {pendingBatches.length} batch onay bekliyor
            </span>
          </div>
          <button
            onClick={() => setActiveTab('overview')}
            className="text-xs font-black text-amber-700 hover:text-amber-900 transition-colors"
          >
            Genel Bakış&apos;ta İncele →
          </button>
        </div>
      )}

      {/* Pasaport Tablosu */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <ClipboardList size={16} className="text-blue-600" />
            Tüm Pasaportlar
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="ID veya ürün adı ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
            <span className="text-xs text-gray-400 font-bold whitespace-nowrap">{filteredProducts.length} kayıt</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {['ID & Ürün', 'Pasaport Durumu', 'Versiyon', 'Veri Kaynağı', 'Blokzincir Mühürü'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded block w-max mb-1">{p.id}</span>
                    <span className="text-sm font-bold text-gray-900">{p.product_name}</span>
                  </td>
                  <td className="px-5 py-4">
                    {pendingStatusChange?.id === p.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">{p.passport_status} →</span>
                        <span className="text-xs font-black text-blue-700">{pendingStatusChange.status}</span>
                        <button
                          onClick={() => { onStatusChange(p.id, pendingStatusChange.status); setPendingStatusChange(null); }}
                          className="px-2 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => setPendingStatusChange(null)}
                          className="px-2 py-1 border border-gray-200 text-gray-500 text-[10px] font-black rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <select
                        value={p.passport_status}
                        onChange={e => {
                          const newStatus = e.target.value as PassportStatus;
                          if (newStatus === p.passport_status) return;
                          if (newStatus === 'Geri Çağrıldı' || newStatus === 'Arşivlendi') {
                            setPendingStatusChange({ id: p.id, status: newStatus });
                          } else {
                            onStatusChange(p.id, newStatus);
                          }
                        }}
                        className="text-xs font-bold border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {(['Taslak', 'Yayında', 'Arşivlendi', 'Geri Çağrıldı'] as PassportStatus[]).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-mono font-black text-gray-700 bg-gray-100 px-2 py-1 rounded">v{p.version}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg ${
                      p.data_source === 'SAP/ERP' ? 'bg-green-50 text-green-700' :
                      p.data_source === 'API'     ? 'bg-blue-50 text-blue-700'   :
                                                    'bg-yellow-50 text-yellow-700'
                    }`}>
                      {p.data_source === 'SAP/ERP' ? <Zap size={11} /> : p.data_source === 'API' ? <Database size={11} /> : <Edit3 size={11} />}
                      {p.data_source}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {p.blockchain_timestamp ? (
                      <div className="flex items-center gap-1.5">
                        <Shield size={12} className="text-green-600" />
                        <span className="text-[10px] font-mono font-bold text-green-700">{p.blockchain_timestamp.split('T')[0]}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-bold italic">Mühürsüz</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Versiyon Geçmişi */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
          <GitBranch size={16} className="text-purple-600" />
          Versiyon Geçmişi (Audit Trail)
        </h2>
        <div className="relative border-l-2 border-gray-100 ml-3 space-y-5">
          {VERSION_HISTORY.map((v, i) => (
            <div key={i} className="relative pl-6">
              <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-purple-300 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 block" />
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{v.id}</span>
                    <span className="text-[10px] font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded">v{v.version}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold">{v.at}</span>
                </div>
                <p className="text-sm font-bold text-gray-800">{v.changes}</p>
                <p className="text-[10px] text-gray-400 font-medium mt-1">→ {v.by}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
