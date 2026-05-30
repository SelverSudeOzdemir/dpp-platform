import React, { useEffect, useState } from 'react';
import { X, Sparkles, AlertTriangle, CheckCircle2, XCircle, Info, Loader2, ArrowRight } from 'lucide-react';

interface AiAnalysisModalProps {
  dppId: string;
  onClose: () => void;
}

export default function AiAnalysisModal({ dppId, onClose }: AiAnalysisModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [aiReport, setAiReport] = useState<any>(null);
  const [error, setError] = useState('');

  // Body scroll kilitleme
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Basit Markdown render (sadece **kalın** yazılar için)
  const renderMarkdown = (text: string) => {
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

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const token = localStorage.getItem('token');
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
        
        // Önce endpoint'i çağır
        const res = await fetch(`${BASE_URL}/ai/analyze/${dppId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          throw new Error('AI analizi alınırken bir hata oluştu.');
        }
        
        const result = await res.json();
        setData(result.analysis);
        setAiReport(result.ai_report);
      } catch (err: any) {
        setError(err.message || 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalysis();
  }, [dppId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">AI Uyumluluk Analizi</h2>
              <p className="text-xs text-gray-500 font-medium">ESPR, CBAM ve CIRPASS Kuralları</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
              <Loader2 size={48} className="animate-spin mb-4 opacity-80" />
              <p className="text-sm font-bold animate-pulse">DPP verileri AI motoru tarafından inceleniyor...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-red-900 mb-1">Analiz Başarısız</h3>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          ) : data ? (
            <div className="space-y-6">
              
              {/* Score Header Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Score Card */}
                <div className="col-span-1 bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center justify-center shadow-sm">
                  <div className="relative mb-2">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                      <circle 
                        cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                        strokeDasharray={251.2} 
                        strokeDashoffset={251.2 - (251.2 * data.score) / 100}
                        className={`transition-all duration-1000 ease-out ${
                          data.score >= 80 ? 'text-emerald-500' : 
                          data.score >= 60 ? 'text-amber-500' : 'text-red-500'
                        }`} 
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-2xl font-black text-gray-900">{data.score}</span>
                      <span className="text-[10px] text-gray-400 font-bold -mt-1">/100</span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">Uyumluluk</p>
                </div>

                {/* Risk and Stats Card */}
                <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                  <div className={`p-5 rounded-2xl border ${
                    data.risk_color === 'green' ? 'bg-emerald-50 border-emerald-100' :
                    data.risk_color === 'yellow' ? 'bg-amber-50 border-amber-100' :
                    data.risk_color === 'orange' ? 'bg-orange-50 border-orange-100' : 'bg-red-50 border-red-100'
                  }`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">Risk Seviyesi</p>
                    <p className={`text-2xl font-black ${
                      data.risk_color === 'green' ? 'text-emerald-700' :
                      data.risk_color === 'yellow' ? 'text-amber-700' :
                      data.risk_color === 'orange' ? 'text-orange-700' : 'text-red-700'
                    }`}>{data.risk_level}</p>
                    <p className="text-xs font-medium opacity-80 mt-2">
                      Sınıflandırma Notu: <span className="font-bold">{data.grade}</span>
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Doldurulan Alanlar</p>
                    <p className="text-2xl font-black text-gray-900">{data.filled_count} <span className="text-sm text-gray-400 font-medium">/ {data.total_count}</span></p>
                    <p className="text-xs font-medium text-gray-500 mt-2">
                      {data.missing_fields?.length > 0 ? `${data.missing_fields.length} kritik alan eksik` : 'Tüm zorunlu alanlar tam'}
                    </p>
                  </div>
                </div>

              </div>

              {/* Recommendations */}
              {data.recommendations && data.recommendations.length > 0 && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5">
                  <h3 className="text-sm font-black text-indigo-900 mb-4 flex items-center gap-2">
                    <Sparkles size={16} /> AI Aksiyon Önerileri
                  </h3>
                  <div className="space-y-3">
                    {data.recommendations.map((rec: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded-xl shadow-sm border border-indigo-50/50">
                        <ArrowRight size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regulatory Gaps (Kırmızı) */}
              {data.regulatory_gaps && data.regulatory_gaps.length > 0 && (
                <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5">
                  <h3 className="text-sm font-black text-red-900 mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} /> Yasal Uyumluluk Riskleri
                  </h3>
                  <div className="space-y-2">
                    {data.regulatory_gaps.map((gap: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-white px-4 py-2 rounded-xl shadow-sm border border-red-100">
                        <span className="text-sm font-bold text-gray-800">{gap.field}</span>
                        <span className="text-[10px] font-black uppercase text-red-700 bg-red-50 px-2 py-1 rounded-md">
                          {gap.regulation}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Scores */}
              {data.category_scores && (
                <div>
                  <h3 className="text-sm font-black text-gray-900 mb-4 px-1">Kategori Analizi</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(data.category_scores).map(([key, cat]: [string, any]) => (
                      <div key={key} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                        <p className="text-xs font-bold text-gray-700 mb-2 truncate">{cat.label}</p>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                          <div 
                            className={`h-1.5 rounded-full ${cat.percentage >= 80 ? 'bg-emerald-500' : cat.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                            style={{ width: `${cat.percentage}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-medium text-gray-500">
                          <span>{cat.filled}/{cat.total} Alan</span>
                          <span className="font-bold text-gray-900">%{cat.percentage}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Yorum Raporu */}
              {aiReport && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mt-6">
                  <h3 className="text-sm font-black text-indigo-900 mb-4 flex items-center gap-2">
                    <Sparkles size={16} /> AI Değerlendirme Raporu
                  </h3>
                  {aiReport.success ? (
                    <div className="prose prose-sm max-w-none text-gray-700">
                      {renderMarkdown(aiReport.report)}
                    </div>
                  ) : (
                    <div className="text-gray-700 text-sm">
                      <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-xs font-mono border border-red-100">
                        <span className="font-bold">Hata Detayı:</span> {aiReport.error || 'Bilinmeyen Hata'}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{aiReport.fallback_report}</p>
                    </div>
                  )}
                  {aiReport.model && (
                    <p className="text-[10px] text-indigo-400 font-bold mt-4 uppercase tracking-widest text-right">
                      Model: {aiReport.model}
                    </p>
                  )}
                </div>
              )}

            </div>
          ) : null}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
}
