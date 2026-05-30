import React, { useEffect, useState } from 'react';
import { X, History, Sparkles, AlertTriangle, CheckCircle2, ChevronRight, Calendar } from 'lucide-react';

interface SupplierScoreHistoryModalProps {
  organizationId: string;
  organizationName: string;
  onClose: () => void;
}

export default function SupplierScoreHistoryModal({ organizationId, organizationName, onClose }: SupplierScoreHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Body scroll kilitleme
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
        
        const res = await fetch(`${BASE_URL}/supply-chain/organizations/${organizationId}/score/history`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.status === 403) {
            throw new Error('Tedarikçi geçmişini görüntüleme yetkiniz yok.');
        }

        if (!res.ok) {
          throw new Error('Geçmiş analizler alınırken hata oluştu.');
        }
        
        const data = await res.json();
        setHistory(data);
      } catch (err: any) {
        setError(err.message || 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [organizationId]);

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={i} className="min-h-[1em] mb-1.5 last:mb-0 leading-relaxed text-gray-700">
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

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-lg shadow-sm">
              <History size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Geçmiş AI Tedarikçi Analizleri</h2>
              <p className="text-xs text-gray-500 font-medium">{organizationName} için kaydedilmiş tüm raporlar</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Sidebar - Liste */}
          <div className="w-full md:w-1/3 border-r border-gray-100 bg-gray-50/50 overflow-y-auto flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium">Geçmiş yükleniyor...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-500 text-sm">{error}</div>
            ) : history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <History size={32} className="mb-3 opacity-50" />
                <p className="text-sm">Henüz kaydedilmiş bir AI analizi bulunmuyor.</p>
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedReport(item)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      selectedReport?.id === item.id 
                        ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-100' 
                        : 'bg-white/50 border-gray-100 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                        <Calendar size={12} />
                        {formatDate(item.created_at)}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        item.risk_level === 'DÜŞÜK' ? 'bg-emerald-100 text-emerald-700' :
                        item.risk_level === 'ORTA' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.risk_level} RİSK
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-gray-900">{item.trust_score}</span>
                      <span className="text-xs font-bold text-gray-400">/ 100</span>
                    </div>
                    <div className="mt-2 text-[10px] text-gray-400 font-mono">
                      Model: {item.model_name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main - Rapor İçeriği */}
          <div className="flex-1 overflow-y-auto bg-white p-6">
            {!selectedReport ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Sparkles size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Görüntülemek için soldan bir rapor seçin</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">AI Değerlendirme Raporu</h3>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(selectedReport.created_at)} tarihli analiz</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-indigo-600">{selectedReport.trust_score}</div>
                    <div className="text-xs font-bold text-gray-400 uppercase">Güven Skoru</div>
                  </div>
                </div>
                
                <div className="prose prose-sm max-w-none">
                  {renderMarkdown(selectedReport.ai_report_text)}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
