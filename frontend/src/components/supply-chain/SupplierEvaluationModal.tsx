import React, { useState } from 'react';
import { X, Star, Save, Loader2, CalendarClock, MessageSquare, AlertTriangle } from 'lucide-react';

interface SupplierEvaluationModalProps {
  organizationId: string;
  organizationName: string;
  dppId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SupplierEvaluationModal({ organizationId, organizationName, dppId, onClose, onSuccess }: SupplierEvaluationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    delivery_score: 5,
    quality_score: 5,
    communication_score: 5,
    estimated_delivery_days: 10,
    actual_delivery_days: 10,
    damage_rate_pct: 0,
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'notes' ? value : Number(value) }));
  };

  const setScore = (field: 'delivery_score' | 'quality_score' | 'communication_score', val: number) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const submitEvaluation = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

      const payload = {
        ...formData,
        ...(dppId && { dpp_id: dppId })
      };

      const res = await fetch(`${BASE_URL}/supply-chain/organizations/${organizationId}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Değerlendirme kaydedilirken bir hata oluştu.');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ value, onChange }: { value: number, onChange: (val: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`p-1 transition-colors ${value >= star ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}
        >
          <Star size={24} fill={value >= star ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50/30 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">Tedarikçi Değerlendirmesi</h2>
            <p className="text-xs text-gray-500 font-medium">{organizationName} için yeni anket</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100 shadow-sm">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto bg-slate-50/30 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm flex items-start gap-3">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p className="font-bold">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Yıldızlı Puanlamalar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-700">Teslimat Performansı</p>
                  <p className="text-[10px] text-gray-400">Ürünlerin zamanında gelme durumu</p>
                </div>
                <StarRating value={formData.delivery_score} onChange={(v) => setScore('delivery_score', v)} />
              </div>
              
              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <div>
                  <p className="text-sm font-bold text-gray-700">Kalite Performansı</p>
                  <p className="text-[10px] text-gray-400">Ürün kalitesi ve paketleme</p>
                </div>
                <StarRating value={formData.quality_score} onChange={(v) => setScore('quality_score', v)} />
              </div>
              
              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <div>
                  <p className="text-sm font-bold text-gray-700">İletişim & Çözüm</p>
                  <p className="text-[10px] text-gray-400">Sorunlara yaklaşım ve hızlı dönüş</p>
                </div>
                <StarRating value={formData.communication_score} onChange={(v) => setScore('communication_score', v)} />
              </div>
            </div>

            {/* Metrikler */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2">
                  <CalendarClock size={14} className="text-blue-500" />
                  Tahmini Gün
                </label>
                <input 
                  type="number" min="1" name="estimated_delivery_days" 
                  value={formData.estimated_delivery_days} onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2">
                  <CalendarClock size={14} className="text-indigo-500" />
                  Gerçekleşen Gün
                </label>
                <input 
                  type="number" min="1" name="actual_delivery_days" 
                  value={formData.actual_delivery_days} onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Hasar Oranı (%)
              </label>
              <input 
                type="number" min="0" max="100" step="0.1" name="damage_rate_pct" 
                value={formData.damage_rate_pct} onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2">
                <MessageSquare size={14} className="text-gray-400" />
                Ek Notlar
              </label>
              <textarea 
                name="notes" rows={3} value={formData.notes} onChange={handleChange}
                placeholder="Örn: Teslimat 2 gün gecikti ancak ürün kalitesi beklediğimizden iyiydi..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
          >
            İptal
          </button>
          <button 
            onClick={submitEvaluation}
            disabled={loading}
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-md shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? 'Kaydediliyor...' : 'Değerlendirmeyi Kaydet'}
          </button>
        </div>

      </div>
    </div>
  );
}
