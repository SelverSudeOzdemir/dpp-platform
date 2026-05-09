import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import type { BatchInfo, DppData } from '../../types/batch';

export const getMissingFields = (batchInfo: BatchInfo, dppData: DppData): string[] => {
  const missing: string[] = [];
  if (!batchInfo.parti_no) missing.push('Parti Numarası');
  if (!batchInfo.urun_no) missing.push('Ürün Kodu');
  if (!batchInfo.uretim_tarihi) missing.push('Üretim Tarihi');
  if (!dppData.celik_kalitesi && !dppData.yield_mpa) missing.push('Çelik Kalitesi veya Dayanım Değeri');
  if (!dppData.co2_a1a3) missing.push('CO2 Emisyon Sınırı (Kapsam 1-3)');
  return missing;
};

export default function Step4Preview({ batchInfo, dppData, erpImported }: { batchInfo: BatchInfo; dppData: DppData; erpImported: boolean }) {
  const methodLabel = erpImported ? 'ERP / SAP' : 'Manuel';
  const missingFields = getMissingFields(batchInfo, dppData);
  const isValid = missingFields.length === 0;

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div><p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
    <p className="text-sm font-bold text-gray-800 mt-0.5">{value || '—'}</p></div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-amber-50 rounded-xl"><CheckCircle2 size={20} className="text-amber-600" /></div>
        <div>
          <h2 className="text-lg font-black text-gray-900">Önizleme & Onaya Gönder</h2>
          <p className="text-sm text-gray-500">Verileri gözden geçirin. Onay sonrası DPP yayınlanacaktır.</p>
        </div>
      </div>

      {!isValid && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 text-red-700 font-black mb-2">
            <AlertTriangle size={18} />
            Onaya Göndermek İçin Eksik Alanlar Var
          </div>
          <p className="text-xs text-red-600 mb-3 font-medium">Bu taslağı kaydedebilirsiniz ancak onaya gönderebilmek için aşağıdaki tüm kritik alanları doldurmalısınız:</p>
          <div className="flex flex-wrap gap-2">
            {missingFields.map(f => (
              <span key={f} className="text-[11px] font-bold bg-white border border-red-200 text-red-700 px-2.5 py-1 rounded-lg shadow-sm">
                • {f}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Batch Bilgileri</h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Row label="Parti No" value={batchInfo.parti_no} />
          <Row label="Ürün Tipi" value={batchInfo.urun_tipi} />
          <Row label="Ocak No" value={batchInfo.ocak_no} />
          <Row label="Üretim Tarihi" value={batchInfo.uretim_tarihi} />
          <Row label="Miktar" value={batchInfo.miktar_ton ? `${batchInfo.miktar_ton} ton` : ''} />
          <Row label="Veri Kaynağı" value={methodLabel} />
        </div>
      </div>
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 font-medium">
          &quot;Onaya Gönder&quot; butonuna bastıktan sonra DPP Admin onayına iletilecektir.
          Onay alındıktan sonra blockchain&apos;e kaydedilir ve yayına girer.
        </p>
      </div>
    </div>
  );
}
