import { TrendingUp, CheckCircle2, AlertTriangle, Truck } from 'lucide-react';
import { SUPPLIER_PERF, LOGISTICS } from '../../../constants/adminConstants';

export default function SupplyChainTab() {
  return (
    <div className="space-y-8">

      {/* Tedarikçi CO₂ Performansı */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-600" />
          Tedarikçi CO₂ Doğrulama Performansı
        </h2>
        <div className="space-y-4">
          {SUPPLIER_PERF.map((s, i) => (
            <div key={i} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-black text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500 font-medium">{s.role} • {s.method}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.verified ? (
                    <span className="flex items-center gap-1 text-xs font-black text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                      <CheckCircle2 size={12} /> Doğrulanmış
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-black text-red-700 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                      <AlertTriangle size={12} /> Doğrulanmamış
                    </span>
                  )}
                  <span className={`text-xs font-black px-2 py-1 rounded-lg ${s.risk === 'Düşük' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    Risk: {s.risk}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 w-32 shrink-0">Veri Güvenilirliği</span>
                <div className="flex-1 bg-white rounded-full h-2 border border-gray-100">
                  <div
                    className={`h-2 rounded-full ${s.accuracy >= 90 ? 'bg-green-500' : s.accuracy >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${s.accuracy}%` }}
                  />
                </div>
                <span className="text-sm font-black text-gray-900 w-10 text-right">%{s.accuracy}</span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium mt-2">Son güncelleme: {s.updated}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lojistik Emisyon Rotası */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Truck size={16} className="text-gray-600" />
          Lojistik Emisyon Rotası
        </h2>
        <div className="space-y-3">
          {LOGISTICS.map((leg, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{leg.from} → {leg.to}</p>
                <p className="text-xs text-gray-500 font-medium">{leg.method} • {leg.dist}</p>
              </div>
              <p className="text-xs font-black text-blue-700">{leg.co2}</p>
            </div>
          ))}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
            <span className="text-xs font-black text-blue-800">Toplam Lojistik Emisyonu</span>
            <span className="text-sm font-black text-blue-900">0.085 kg CO₂e/kg</span>
          </div>
        </div>
      </div>
    </div>
  );
}
