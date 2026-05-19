import { useState } from 'react';
import { Database, CheckCircle2, Lock, Factory } from 'lucide-react';
import { Field, SelectField, SectionTitle } from './BatchFormFields';
import { URUN_KATALOGU, PRODUCTION_ROUTE_OPTIONS } from '../../constants/batchConstants';
import type { BatchInfo } from '../../types/batch';

export function Step1BatchInfo({ data, onChange, erpImported, existingLoaded = false, onErpClick, erpLockedFields = new Set() }: {
  data: BatchInfo;
  onChange: (d: BatchInfo) => void;
  erpImported: boolean;
  existingLoaded?: boolean;
  onErpClick: () => void;
  erpLockedFields?: Set<string>;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const selectedUrun = URUN_KATALOGU.find((u) => u.urun_no === data.urun_no);

  const handleUrunSec = (urun_no: string) => {
    const urun = URUN_KATALOGU.find((u) => u.urun_no === urun_no);
    onChange({ ...data, urun_no, urun_tipi: urun?.urun_tipi ?? '' });
  };

  const ROField = ({ label, value, mono = false, sapLocked = false }: { label: string; value: string; mono?: boolean; sapLocked?: boolean }) => (
    <div>
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
      <div className={`flex items-center gap-2 px-3.5 py-2.5 border border-gray-100 rounded-xl bg-gray-50 ${mono ? 'font-mono' : ''}`}>
        <Lock size={11} className="text-gray-300 shrink-0" />
        <span className="text-sm font-bold text-gray-700 truncate flex-1">{value || '—'}</span>
        {sapLocked && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">SAP</span>}
      </div>
    </div>
  );

  if (existingLoaded) {
    return (
      <div className="relative">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl"><Factory size={20} className="text-blue-600" /></div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Üretim Partisi Bilgileri</h2>
              <p className="text-sm text-gray-500">Mevcut DPP — temel bilgiler salt okunur.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-black rounded-xl transition-colors"
          >
            <Database size={13} /> SAP&apos;tan Veri Çek
          </button>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-green-100 rounded-xl text-green-700"><Database size={20} /></div>
                <h3 className="text-lg font-black text-gray-900">SAP Verisi Yenile</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6 font-medium">
                <span className="font-bold text-gray-800">{data.parti_no}</span> batch no&apos;lu partinin SAP verileri tekrar çekilsin mi? Çünkü devam eden bir DPP için farklı bir batch no&apos;lu partinin bilgileri çekilemez.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors">İptal</button>
                <button type="button" onClick={() => { setShowConfirm(false); onErpClick(); }} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm shadow-green-100">Evet, Veri Çek</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
          <Lock size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-800">Bu alanlar değiştirilemez</p>
            <p className="text-xs text-amber-700 font-medium mt-0.5">
              Parti numarası, ürün kodu ve üretim bilgileri DPP kimliğini oluşturur.
              Değişiklik için Admin ile iletişime geçin.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <SectionTitle label="Batch Kimliği" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ROField label="Parti Numarası" value={data.parti_no} mono />
            <ROField label="Tedarikçi Parti Kodu" value={data.tedarikci_parti_kodu} mono />
          </div>
        </div>

        <div className="mb-6">
          <SectionTitle label="Ürün Bilgisi" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ROField label="Ürün Kodu" value={data.urun_no} mono />
            <ROField label="Ürün Tipi" value={data.urun_tipi} />
            <ROField label="GTIN" value={selectedUrun?.gtin ?? ''} mono />
            <ROField label="HS Code (GTİP)" value={selectedUrun?.hs_code ?? ''} mono />
          </div>
        </div>

        <div>
          <SectionTitle label="Üretim Bilgisi" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ROField label="Ocak / Fırın No" value={data.ocak_no} mono />
            <ROField label="Üretim Tarihi" value={data.uretim_tarihi} />
            <ROField label="Miktar" value={data.miktar_ton ? `${data.miktar_ton} ton` : ''} />
            <ROField label="Üretim Rotası" value={data.production_route} sapLocked={!!data.production_route} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl"><Factory size={20} className="text-blue-600" /></div>
          <div>
            <h2 className="text-lg font-black text-gray-900">Üretim Partisi Bilgileri</h2>
            <p className="text-sm text-gray-500">Bu batch&apos;e ait temel üretim bilgilerini girin.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onErpClick}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-black rounded-xl transition-colors"
        >
          <Database size={13} /> SAP&apos;tan Veri Çek
        </button>
      </div>

      {erpImported && (
        <div className="flex items-start gap-2 mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
          <p className="text-sm font-bold text-green-800">
            SAP&apos;tan aktarıldı — <span className="inline-flex items-center gap-1">SAP <span className="text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full font-black">etiketli</span></span> alanlar kilitlidir. Tedarikçi parti kodunu ve eksik alanları tamamlayın.
          </p>
        </div>
      )}

      <div className="mb-6">
        <SectionTitle label="Batch Kimliği" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {erpLockedFields.has('parti_no') ? (
            <ROField label="Parti Numarası (Kocaer)" value={data.parti_no} mono sapLocked />
          ) : (
            <Field
              label="Parti Numarası (Kocaer)"
              value={data.parti_no}
              onChange={(v) => onChange({ ...data, parti_no: v })}
              placeholder="KCR-2026-XXXX-A"
              hint="Kocaer'in kendi üretim parti numarası"
              required
            />
          )}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Tedarikçi Parti Kodu</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.tedarikci_parti_kodu}
                onChange={(e) => onChange({ ...data, tedarikci_parti_kodu: e.target.value })}
                placeholder="ERD-2026-XXXX"
                className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <button
                type="button"
                disabled={!data.tedarikci_parti_kodu}
                title="Tedarikçinin DPP API'sine bağlanarak kimyasal, CO₂ ve tedarik zinciri verilerini otomatik getirir"
                className="px-3 py-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black rounded-xl hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                onClick={() => alert('Bu özellik tedarikçi DPP API entegrasyonu tamamlandığında aktif olacaktır.\n\nEndpoint: GET /api/supplier-dpp/{tedarikci_parti_kodu}')}
              >
                DPP&apos;den Getir
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Hammadde tedarikçisinin kendi parti referansı</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <SectionTitle label="Ürün Bilgisi" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {erpLockedFields.has('urun_no') ? (
            <ROField label="Ürün Kodu" value={`${data.urun_no} — ${data.urun_tipi}`} sapLocked />
          ) : (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Ürün Kodu <span className="text-red-500">*</span>
              </label>
              <select
                value={data.urun_no}
                onChange={(e) => handleUrunSec(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Seçiniz...</option>
                {URUN_KATALOGU.map((u) => (
                  <option key={u.urun_no} value={u.urun_no}>{u.urun_no} — {u.urun_tipi}</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">Katalog kodu — tüm batch&apos;lerde sabit kalır</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">GTIN</label>
            <div className="w-full px-3.5 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-500 font-mono">
              {selectedUrun ? selectedUrun.gtin : '—'}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Ürün kodu seçilince otomatik gelir</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">HS Code (GTİP)</label>
            <div className="w-full px-3.5 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-500 font-mono">
              {selectedUrun ? selectedUrun.hs_code : '—'}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Gümrük tarife kodu — CBAM beyanında kullanılır</p>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle label="Üretim Bilgisi" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {erpLockedFields.has('ocak_no') ? (
            <ROField label="Ocak / Fırın No" value={data.ocak_no} mono sapLocked />
          ) : (
            <Field label="Ocak / Fırın No" value={data.ocak_no} onChange={(v) => onChange({ ...data, ocak_no: v })} placeholder="EAF-03" required />
          )}
          {erpLockedFields.has('uretim_tarihi') ? (
            <ROField label="Üretim Tarihi" value={data.uretim_tarihi} sapLocked />
          ) : (
            <Field label="Üretim Tarihi" value={data.uretim_tarihi} onChange={(v) => onChange({ ...data, uretim_tarihi: v })} type="date" required />
          )}
          {erpLockedFields.has('miktar_ton') ? (
            <ROField label="Miktar" value={`${data.miktar_ton} ton`} sapLocked />
          ) : (
            <Field label="Miktar (ton)" value={data.miktar_ton} onChange={(v) => onChange({ ...data, miktar_ton: v })} type="number" placeholder="42.5" required />
          )}
          {erpLockedFields.has('production_route') ? (
            <ROField label="Üretim Rotası" value={data.production_route} sapLocked />
          ) : (
            <div>
              <SelectField
                label="Üretim Rotası"
                value={data.production_route}
                onChange={(v) => onChange({ ...data, production_route: v })}
                options={PRODUCTION_ROUTE_OPTIONS}
                required
              />
              <p className="text-[11px] text-gray-400 mt-1">CBAM beyanında zorunlu — çeliğin nasıl üretildiği</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
