import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Package, CheckCircle2, Clock, Archive, Zap, Bell, Flag,
  AlertTriangle, Activity, User, Eye, XCircle,
} from 'lucide-react';
import {
  CERT_ALERTS, ACCESS_LOGS, INCOMPLETE,
  CBAM_LIMIT, REJECTABLE_FIELDS,
} from '../../../constants/adminConstants';
import { RoleBadge } from '../AdminBadges';
import type { AdminProduct, PendingBatch } from '../../../types/admin';

interface Props {
  products: AdminProduct[];
  pendingBatches: PendingBatch[];
  cbamWarnings: AdminProduct[];
  onApprove: (id: string) => void;
  onRejectConfirm: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function OverviewTab({
  products,
  pendingBatches,
  cbamWarnings,
  onApprove,
  onRejectConfirm,
  setActiveTab,
}: Props) {
  const router = useRouter();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectFields, setRejectFields] = useState<string[]>([]);

  const criticalCerts = CERT_ALERTS.filter(c => c.days_left <= 10);

  const toggleRejectField = (key: string) =>
    setRejectFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );

  const handleRejectBatch = (id: string) => {
    if (!rejectReason.trim()) return;
    onRejectConfirm(id);
    setRejectId(null);
    setRejectReason('');
    setRejectFields([]);
  };

  return (
    <div className="space-y-8">

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: 'Toplam Pasaport',   value: products.length,                                                 tab: 'passports',  icon: Package,      border: 'border-blue-500',   text: 'text-blue-700',   iconBg: 'bg-blue-50'   },
          { label: 'Yayında',           value: products.filter(p => p.passport_status === 'Yayında').length,    tab: 'passports',  icon: CheckCircle2, border: 'border-green-500',  text: 'text-green-700',  iconBg: 'bg-green-50'  },
          { label: 'Taslak',            value: products.filter(p => p.passport_status === 'Taslak').length,     tab: 'passports',  icon: Clock,        border: 'border-yellow-500', text: 'text-yellow-700', iconBg: 'bg-yellow-50' },
          { label: 'Arşivlendi',        value: products.filter(p => p.passport_status === 'Arşivlendi').length, tab: 'passports',  icon: Archive,      border: 'border-gray-400',   text: 'text-gray-600',   iconBg: 'bg-gray-50'   },
          { label: 'Onay Bekleyen',     value: pendingBatches.length,                                           tab: 'passports',  icon: Zap,          border: 'border-amber-500',  text: 'text-amber-700',  iconBg: 'bg-amber-50'  },
          { label: 'Sertifika Uyarısı', value: criticalCerts.length,                                            tab: 'compliance', icon: Bell,         border: 'border-orange-500', text: 'text-orange-700', iconBg: 'bg-orange-50' },
          { label: 'CBAM Uyarısı',      value: cbamWarnings.length,                                             tab: 'compliance', icon: Flag,         border: 'border-red-500',    text: 'text-red-700',    iconBg: 'bg-red-50'    },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <button
              key={i}
              onClick={() => setActiveTab(k.tab)}
              className={`bg-white rounded-2xl border-l-4 p-4 shadow-sm text-left transition-shadow hover:shadow-md cursor-pointer w-full ${k.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{k.label}</p>
                <div className={`p-1.5 rounded-lg ${k.iconBg}`}>
                  <Icon size={14} className={k.text} />
                </div>
              </div>
              <p className={`text-3xl font-black ${k.text}`}>{k.value}</p>
            </button>
          );
        })}
      </div>

      {/* ── ONAY BEKLİYEN BATCH'LER ── */}
      {pendingBatches.length > 0 && (
        <div className="bg-white rounded-3xl border-2 border-amber-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            Onay Bekleyen DPP&apos;ler
            <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-black px-2.5 py-0.5 rounded-full">
              {pendingBatches.length} bekliyor
            </span>
          </h2>
          <div className="space-y-4">
            {pendingBatches.map((batch) => (
              <div key={batch.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
                <div
                  className="flex items-start justify-between gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => rejectId !== batch.id && router.push(`/batches/${batch.id}`)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[11px] font-mono font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                        {batch.parti_no}
                      </span>
                      {batch.co2_a1a3 > CBAM_LIMIT && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1">
                          <Flag size={10} /> CBAM Uyarısı
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-black text-gray-900">{batch.urun_tipi}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500 font-medium">{batch.miktar_ton} ton</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500 font-medium">CO₂ A1–A3: {batch.co2_a1a3} kg CO₂e/kg</span>
                      <span className="text-gray-300">•</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        batch.co2_verification === 'Dahili Hesaplama'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {batch.co2_verification}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500 font-medium">
                        {batch.olusturan} • {batch.gonderilme_tarihi}
                      </span>
                    </div>
                  </div>
                </div>

                {rejectId === batch.id ? (
                  <div className="mt-3 space-y-3 bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-xs font-black text-red-700 uppercase tracking-wider">Hatalı Alanları İşaretle</p>
                    <div className="grid grid-cols-2 gap-2">
                      {REJECTABLE_FIELDS.map(f => (
                        <label key={f.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs font-bold transition-colors ${
                          rejectFields.includes(f.key)
                            ? 'bg-red-100 border-red-400 text-red-800'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
                        }`}>
                          <input type="checkbox" checked={rejectFields.includes(f.key)}
                            onChange={() => toggleRejectField(f.key)}
                            className="accent-red-600" />
                          {f.label}
                        </label>
                      ))}
                    </div>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Red gerekçesini yazın... (zorunlu)"
                      rows={2}
                      className="w-full px-3 py-2 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejectBatch(batch.id)}
                        className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40"
                        disabled={!rejectReason.trim()}
                      >
                        Reddet
                      </button>
                      <button
                        onClick={() => { setRejectId(null); setRejectReason(''); setRejectFields([]); }}
                        className="px-4 py-1.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/batches/${batch.id}`); }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Eye size={13} /> İçeriği Gör
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onApprove(batch.id); }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle2 size={13} /> Onayla & Yayınla
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRejectId(batch.id); }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <XCircle size={13} /> Reddet
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Kritik Uyarılar */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            Acil Aksiyon Gerektiren Uyarılar
          </h2>
          <div className="space-y-3">
            {cbamWarnings.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <Flag size={16} className="text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-black text-red-800">{p.product_name}</p>
                  <p className="text-xs text-red-600 font-medium">CO₂: {p.co2_cradle_to_gate_kg} kg/kg — CBAM limitini ({CBAM_LIMIT} kg/kg) aşıyor</p>
                </div>
              </div>
            ))}
            {CERT_ALERTS.filter(c => c.days_left <= 10).map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                <Clock size={16} className="text-orange-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-black text-orange-800">{c.product} — {c.cert}</p>
                  <p className="text-xs text-orange-600 font-medium">
                    {c.days_left <= 0 ? 'SÜRESİ DOLDU' : `${c.days_left} gün kaldı`} • {c.expiry}
                  </p>
                </div>
              </div>
            ))}
            {INCOMPLETE.filter(p => p.missing.length >= 3).map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                <AlertTriangle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-black text-yellow-800">{p.product} ({p.id})</p>
                  <p className="text-xs text-yellow-600 font-medium">Eksik: {p.missing.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Son Aktiviteler */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Activity size={16} className="text-blue-500" />
            Son Sistem Aktiviteleri
          </h2>
          <div className="space-y-3">
            {ACCESS_LOGS.slice(0, 5).map((log, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <User size={12} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {log.action} — <span className="text-blue-600">{log.product}</span>
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium">{log.user} • {log.timestamp}</p>
                </div>
                <RoleBadge role={log.role} />
              </div>
            ))}
          </div>
          <button
            onClick={() => setActiveTab('access')}
            className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Tümünü Gör →
          </button>
        </div>
      </div>
    </div>
  );
}
