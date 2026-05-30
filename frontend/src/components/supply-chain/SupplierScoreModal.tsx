import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, AlertCircle, Loader2, Sparkles, History } from 'lucide-react';

interface SupplierScoreModalProps {
  organizationId: string;
  organizationName: string;
  onClose: () => void;
  onOpenHistory?: () => void;
}

export default function SupplierScoreModal({ organizationId, organizationName, onClose, onOpenHistory }: SupplierScoreModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  // Body scroll kilitleme
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const token = localStorage.getItem('token');
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
        
        const res = await fetch(`${BASE_URL}/supply-chain/organizations/${organizationId}/score?include_ai=true`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.status === 403) {
           throw new Error('Tedarikçi puanlarını görüntüleme yetkiniz yok (Sadece Admin, Engineer, Authority).');
        }

        if (!res.ok) {
          throw new Error('Skor bilgisi alınamadı.');
        }
        
        const result = await res.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };
    
    fetchScore();
  }, [organizationId]);

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={i} className="min-h-[1em] mb-1.5 last:mb-0 leading-relaxed">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-bold text-indigo-950">{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-900 to-indigo-950 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white/10 rounded-xl shadow-inner border border-white/5">
              <ShieldCheck size={24} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">Tedarikçi Güven Skoru</h2>
              <p className="text-xs text-indigo-200 font-medium">{organizationName} — AI Destekli Analiz Raporu</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
              <Loader2 size={40} className="animate-spin mb-4 opacity-80" />
              <p className="text-sm font-bold animate-pulse">AI Raporu oluşturuluyor...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-red-900 mb-1">Erişim Reddedildi veya Hata</h3>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          ) : data ? (
            <div className="space-y-6">
              
              {/* Score Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Genel Güven Skoru</p>
                  <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-indigo-50 to-white border-8 border-indigo-50 mb-2 shadow-inner">
                    <span className={`text-3xl font-black ${
                      data.trust_score >= 80 ? 'text-emerald-600' :
                      data.trust_score >= 60 ? 'text-amber-500' : 'text-red-600'
                    }`}>
                      {data.trust_score}
                    </span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black border ${
                    data.risk_level === 'DÜŞÜK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    data.risk_level === 'ORTA' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    RİSK: {data.risk_level}
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Toplam Değerlendirme</p>
                    <p className="text-2xl font-black text-gray-800">{data.total_evaluations}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Ortalama Gecikme</p>
                    <p className="text-xl font-bold text-gray-800">
                      {data.average_delay_days > 0 ? <span className="text-red-500">+{data.average_delay_days} Gün</span> : <span className="text-emerald-500">Zamanında</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Hasar Oranı</p>
                    <p className="text-xl font-bold text-gray-800">
                      %{data.average_damage_pct}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Son Değerlendirme</p>
                    <p className="text-sm font-bold text-gray-800 mt-1">
                      {data.last_evaluation_date ? new Date(data.last_evaluation_date).toLocaleDateString('tr-TR') : 'Yok'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-scores */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-4">Metrik Ortalamaları (1-5)</h3>
                <div className="space-y-4">
                  {/* Delivery */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-gray-600">Teslimat Performansı</span>
                      <span className="text-gray-900">{data.avg_delivery_score}/5</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(data.avg_delivery_score / 5) * 100}%` }} />
                    </div>
                  </div>
                  {/* Quality */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-gray-600">Kalite Performansı</span>
                      <span className="text-gray-900">{data.avg_quality_score}/5</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(data.avg_quality_score / 5) * 100}%` }} />
                    </div>
                  </div>
                  {/* Comm */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-gray-600">İletişim ve Çözüm Odaklılık</span>
                      <span className="text-gray-900">{data.avg_communication_score}/5</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(data.avg_communication_score / 5) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Report */}
              {data.ai_report ? (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-indigo-100/50 bg-white/50 backdrop-blur-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-600" />
                      <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest">Ollama Local LLM Yorumu</h3>
                    </div>
                    {onOpenHistory && (
                      <button 
                        onClick={() => {
                          onClose();
                          onOpenHistory();
                        }}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
                      >
                        <History size={12} />
                        Geçmiş
                      </button>
                    )}
                  </div>
                  <div className="p-5 text-sm text-gray-700 leading-relaxed font-medium">
                    {renderMarkdown(data.ai_report)}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 border border-gray-200 rounded-2xl p-5 text-center">
                  <p className="text-sm text-gray-500 font-medium">AI raporu bu tedarikçi için henüz oluşturulmamış veya anket sayısı yetersiz.</p>
                </div>
              )}

            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
}
