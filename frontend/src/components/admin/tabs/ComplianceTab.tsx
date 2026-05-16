import { useState } from 'react';
import { Flag, AlertTriangle, CheckCircle2, XCircle, Calendar, ShieldAlert } from 'lucide-react';
import { CBAM_LIMIT, CERT_ALERTS, REACH_LIST, REACH_TOTAL } from '../../../constants/adminConstants';
import type { AdminProduct, CertType } from '../../../types/admin';

interface Props {
  products: AdminProduct[];
}

export default function ComplianceTab({ products }: Props) {
  const [certFilter, setCertFilter] = useState<'tumu' | CertType>('tumu');
  const [showAllReach, setShowAllReach] = useState(false);

  return (
    <div className="space-y-8">

      {/* CBAM Emisyon Takibi */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Flag size={16} className="text-red-500" />
            CBAM Emisyon Limit Takibi
          </h2>
          <div className="flex items-center gap-2 text-[10px] font-bold">
            <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded">Eşik: {CBAM_LIMIT} kg CO₂e/kg</span>
            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Uyarı: &gt; {(CBAM_LIMIT * 0.85).toFixed(2)} kg</span>
          </div>
        </div>
        <div className="space-y-4">
          {products.map((p, i) => {
            const co2 = p.co2_cradle_to_gate_kg;
            const pct = Math.min((co2 / (CBAM_LIMIT * 1.5)) * 100, 100);
            const isOver = co2 > CBAM_LIMIT;
            const isWarn = co2 > CBAM_LIMIT * 0.85 && !isOver;
            return (
              <div key={i} className={`p-4 rounded-2xl border ${isOver ? 'bg-red-50 border-red-200' : isWarn ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isOver ? <Flag size={14} className="text-red-600" /> : isWarn ? <AlertTriangle size={14} className="text-yellow-600" /> : <CheckCircle2 size={14} className="text-green-600" />}
                    <span className="text-sm font-black text-gray-900">{p.product_name}</span>
                    <span className="text-[10px] font-mono text-gray-400">{p.id}</span>
                  </div>
                  <span className={`text-sm font-black ${isOver ? 'text-red-700' : isWarn ? 'text-yellow-700' : 'text-green-700'}`}>
                    {co2} kg CO₂e/kg
                  </span>
                </div>
                <div className="w-full bg-white rounded-full h-2 border border-gray-100">
                  <div className={`h-2 rounded-full ${isOver ? 'bg-red-500' : isWarn ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                </div>
                {isOver && (
                  <p className="text-[10px] text-red-600 font-bold mt-2">
                    ⚠ AB CBAM limitini {(co2 - CBAM_LIMIT).toFixed(2)} kg aşıyor — Aksiyon gerekli
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sertifika Geçerlilik Takibi */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={16} className="text-orange-500" />
            Sertifika Geçerlilik Takibi
          </h2>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {([
              { key: 'tumu',     label: 'Tümü' },
              { key: 'firma',    label: 'Firma Geneli' },
              { key: 'urun-tipi', label: 'Ürün Tipi' },
              { key: 'batch',    label: 'Batch' },
            ] as { key: 'tumu' | CertType; label: string }[]).map(f => (
              <button
                key={f.key}
                onClick={() => setCertFilter(f.key)}
                className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors ${
                  certFilter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {CERT_ALERTS.filter(c => certFilter === 'tumu' || c.type === certFilter).map((c, i) => {
            const expired  = c.days_left < 0;
            const critical = !expired && c.days_left <= 10;
            const warn     = !expired && !critical && c.days_left <= 60;
            const TYPE_CFG = {
              'firma':     { label: 'Firma Geneli', cls: 'bg-purple-100 text-purple-700' },
              'urun-tipi': { label: 'Ürün Tipi',   cls: 'bg-blue-100 text-blue-700'     },
              'batch':     { label: 'Batch',        cls: 'bg-gray-100 text-gray-600'     },
            } as const;
            return (
              <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${
                expired  ? 'bg-red-50 border-red-200'      :
                critical ? 'bg-orange-50 border-orange-200' :
                warn     ? 'bg-yellow-50 border-yellow-200' :
                           'bg-white border-gray-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${expired || critical ? 'bg-red-100' : warn ? 'bg-yellow-100' : 'bg-green-100'}`}>
                    <CheckCircle2 size={16} className={expired || critical ? 'text-red-600' : warn ? 'text-yellow-600' : 'text-green-600'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-black text-gray-900">{c.cert}</p>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${TYPE_CFG[c.type].cls}`}>
                        {TYPE_CFG[c.type].label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      {c.product}{c.id ? ` • ${c.id}` : ''} • {c.issuer}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-gray-600 font-bold">{c.expiry}</p>
                  <p className={`text-xs font-black mt-0.5 ${expired ? 'text-red-700' : critical ? 'text-orange-700' : warn ? 'text-yellow-700' : 'text-green-700'}`}>
                    {expired ? `${Math.abs(c.days_left)} gün önce doldu` : `${c.days_left} gün kaldı`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ECHA SVHC / REACH */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert size={16} className="text-blue-600" />
            ECHA SVHC / REACH Uyumluluk Kontrolü
          </h2>
        </div>
        <p className="text-xs text-gray-400 font-medium mb-5">Son liste güncelleme: 2026-01-15 • {REACH_TOTAL} madde tarandı</p>

        {/* Özet Kart */}
        {(() => {
          const warnings   = REACH_LIST.filter(s => s.concentration >= s.threshold);
          const nearLimit  = REACH_LIST.filter(s => s.concentration < s.threshold && s.concentration >= s.threshold * 0.7);
          const hasIssues  = warnings.length > 0 || nearLimit.length > 0;
          return (
            <div className="space-y-3">
              {/* Özet banner */}
              <div className={`flex items-center justify-between p-4 rounded-2xl border ${
                warnings.length > 0  ? 'bg-red-50 border-red-200'      :
                nearLimit.length > 0 ? 'bg-yellow-50 border-yellow-200' :
                                       'bg-green-50 border-green-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${warnings.length > 0 ? 'bg-red-100' : nearLimit.length > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                    {warnings.length > 0
                      ? <XCircle size={16} className="text-red-600" />
                      : nearLimit.length > 0
                        ? <AlertTriangle size={16} className="text-yellow-600" />
                        : <CheckCircle2 size={16} className="text-green-600" />}
                  </div>
                  <div>
                    <p className={`text-sm font-black ${warnings.length > 0 ? 'text-red-800' : nearLimit.length > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                      {warnings.length > 0
                        ? `${warnings.length} madde eşiği aşıyor — Beyan zorunlu`
                        : nearLimit.length > 0
                          ? `${nearLimit.length} madde eşiğe yaklaşıyor — Takip gerekli`
                          : `${REACH_TOTAL} madde tarandı — Uyarı yok`}
                    </p>
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">REACH Madde 33 • Eşik: %0.1 (Cd için %0.01)</p>
                  </div>
                </div>
                {!hasIssues && (
                  <span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-1 rounded-lg">SCIP Beyanı Gerekmez</span>
                )}
              </div>

              {/* Tümünü Göster butonu — sadece uyarı yoksa */}
              {!hasIssues && (
                <button
                  onClick={() => setShowAllReach(v => !v)}
                  className="w-full text-xs font-black text-gray-400 hover:text-gray-600 py-2 border border-dashed border-gray-200 rounded-xl transition-colors"
                >
                  {showAllReach ? 'Gizle ↑' : `Tüm ${REACH_TOTAL} maddeyi gör ↓`}
                </button>
              )}

              {/* Tüm liste — genişletilmiş */}
              {!hasIssues && showAllReach && REACH_LIST.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                  <div>
                    <p className="text-xs font-bold text-gray-800">{s.substance}</p>
                    <p className="text-[10px] text-gray-400 font-medium">CAS {s.cas} • Eşik: %{s.threshold} • Tespit: %{s.concentration.toFixed(3)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-green-600" />
                    <span className="text-xs font-black text-green-700">Uyumlu</span>
                  </div>
                </div>
              ))}

              {/* Sadece uyarı ve eşiğe yakın maddeler */}
              {hasIssues && [...warnings, ...nearLimit].map((s, i) => {
                const isOver = s.concentration >= s.threshold;
                return (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${isOver ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div>
                      <p className="text-xs font-black text-gray-900">{s.substance}</p>
                      <p className="text-[10px] text-gray-500 font-medium">CAS {s.cas} • Eşik: %{s.threshold}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black ${isOver ? 'text-red-700' : 'text-yellow-700'}`}>
                        %{s.concentration.toFixed(3)} tespit edildi
                      </p>
                      <p className={`text-[10px] font-bold mt-0.5 ${isOver ? 'text-red-600' : 'text-yellow-600'}`}>
                        {isOver ? 'Eşik aşıldı' : `Eşiğin %${Math.round((s.concentration / s.threshold) * 100)}'i`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
