import { useState, useEffect } from 'react';
import { ChevronLeft, Database, CheckCircle2 } from 'lucide-react';
import {
  ERP_CONNECTIONS,
  ERP_SYNC_CATEGORIES,
  ERP_MISSING_FIELDS,
} from '../../constants/batchConstants';
import type { ExcelImportData, BatchInfo, DppData } from '../../types/batch';
import { apiSyncSap } from '../../lib/api';

export default function ErpSyncFlow({ onSync, onCancel }: { onSync: (d: ExcelImportData) => void; onCancel?: () => void }) {
  const [subStep, setSubStep] = useState<'select' | 'syncing' | 'done'>('select');
  const [selectedErp, setSelectedErp] = useState<string | null>(null);
  const [batchRef, setBatchRef] = useState('');
  const [syncedCount, setSyncedCount] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [fetchedData, setFetchedData] = useState<ExcelImportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subStep !== 'syncing') return;
    setError(null);
    apiSyncSap(batchRef || 'KCR-2026-0318-A')
      .then(res => {
        setFetchedData(res);
      })
      .catch(err => {
        console.error("Backend SAP sync failed:", err);
        setError(err.message || 'SAP bağlantı hatası');
        setSubStep('select');
        setSyncedCount(0);
        alert('SAP veri çekimi başarısız oldu: ' + (err.message || 'Bilinmeyen Hata'));
      });
  }, [subStep, batchRef]);

  const selectedConn = ERP_CONNECTIONS.find(c => c.id === selectedErp);
  const canSync = selectedConn?.status === 'connected';
  const totalFetched = ERP_SYNC_CATEGORIES.reduce((s, c) => s + c.fetched, 0);
  const totalFields  = ERP_SYNC_CATEGORIES.reduce((s, c) => s + c.total, 0);

  // Sıralı animasyon
  useEffect(() => {
    if (subStep !== 'syncing') return;
    if (syncedCount >= ERP_SYNC_CATEGORIES.length) {
      const t = setTimeout(() => setSubStep('done'), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setSyncedCount(n => n + 1), 480);
    return () => clearTimeout(t);
  }, [subStep, syncedCount]);

  // ── SEÇİM EKRANI ──────────────────────────────────────────────────────────
  if (subStep === 'select') return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors shrink-0">
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="p-2.5 bg-green-50 rounded-xl shrink-0"><Database size={20} className="text-green-600" /></div>
        <div>
          <h2 className="text-lg font-black text-gray-900">SAP&apos;tan Veri Çek</h2>
          <p className="text-sm text-gray-500">Bağlı ERP sisteminizi seçin ve veriyi otomatik çekin.</p>
        </div>
      </div>

      <div className="space-y-2.5 mb-6">
        {ERP_CONNECTIONS.map(conn => {
          const active = conn.status === 'connected';
          const sel    = selectedErp === conn.id;
          return (
            <button key={conn.id} type="button" disabled={!active}
              onClick={() => active && setSelectedErp(conn.id)}
              className={`w-full text-left border-2 rounded-xl px-4 py-3.5 transition-all ${
                sel    ? 'border-green-500 bg-green-50 shadow-sm shadow-green-100'
                : active ? 'border-gray-200 bg-white hover:border-green-400'
                : 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
              }`}>
              <div className="flex items-center gap-3">
                {/* Kısaltma rozeti */}
                <div className={`w-10 h-10 rounded-xl border text-[10px] font-black flex items-center justify-center shrink-0 ${conn.abbr_bg} ${conn.abbr_color}`}>
                  {conn.abbr}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-gray-900">{conn.name}</span>
                    <span className="text-[10px] font-mono text-gray-400">{conn.version}</span>
                    <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${
                      conn.status === 'connected'      ? 'bg-green-100 text-green-700'
                      : conn.status === 'disconnected' ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-400'
                    }`}>
                      {conn.status === 'connected' ? '● Bağlı' : conn.status === 'disconnected' ? '✕ Bağlantı Yok' : '○ Yapılandırılmadı'}
                    </span>
                  </div>
                  {conn.status === 'disconnected' && (
                    <p className="text-[11px] text-red-500 font-medium mt-0.5">Bağlantı kurulamıyor. Admin ile iletişime geçin.</p>
                  )}
                  {conn.status === 'not_configured' && (
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">Bu bağlantı henüz yapılandırılmadı.</p>
                  )}
                </div>
                {sel && <CheckCircle2 size={18} className="text-green-600 shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Batch referansı */}
      <div className="mb-4">
        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">
          ERP Batch / Sipariş Referansı <span className="text-gray-300 font-normal normal-case">(opsiyonel)</span>
        </label>
        <input
          type="text"
          placeholder="Örn: SAP-MO-2026-0318 veya boş bırakın"
          value={batchRef}
          onChange={e => setBatchRef(e.target.value)}
          disabled={!canSync}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white disabled:bg-gray-50 disabled:text-gray-400 font-mono"
        />
        <p className="text-[11px] text-gray-400 mt-1.5 font-medium">
          Belirtilmezse ERP&apos;deki en son parti otomatik seçilir.
        </p>
      </div>

      <button type="button" disabled={!canSync} onClick={() => { setShowConfirmModal(true); }}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-green-100">
        <Database size={15} /> Veri Çekmeyi Başlat
      </button>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-green-100 rounded-xl text-green-700"><Database size={20} /></div>
              <h3 className="text-lg font-black text-gray-900">Veri Çekme Onayı</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 font-medium">
              SAP&apos;den <span className="font-bold text-gray-800">{batchRef || 'en son'}</span> batch nolu veriler çekilmeye başlansın mı?
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors">İptal</button>
              <button type="button" onClick={() => { setShowConfirmModal(false); setSyncedCount(0); setSubStep('syncing'); }} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm shadow-green-100">Evet, Başla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── SENKRONİZASYON ANİMASYONU ─────────────────────────────────────────────
  if (subStep === 'syncing') return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-green-50 rounded-xl animate-pulse"><Database size={20} className="text-green-600" /></div>
        <div>
          <h2 className="text-lg font-black text-gray-900">Senkronizasyon Yapılıyor</h2>
          <p className="text-sm text-gray-500">{selectedConn?.name} üzerinden veriler çekiliyor…</p>
        </div>
      </div>

      {/* İlerleme çubuğu */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${(syncedCount / ERP_SYNC_CATEGORIES.length) * 100}%` }}
        />
      </div>

      {/* Kategori listesi */}
      <div className="space-y-2">
        {ERP_SYNC_CATEGORIES.map((cat, i) => {
          const done   = i < syncedCount;
          const active = i === syncedCount;
          const { Icon } = cat;
          return (
            <div key={cat.name} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ${
              done   ? 'bg-green-50 border-green-100'
              : active ? 'bg-blue-50 border-blue-200'
              : 'bg-gray-50 border-gray-100'
            }`}>
              <div className={`p-1.5 rounded-lg transition-colors ${
                done ? 'bg-green-100 text-green-600' : active ? 'bg-blue-100 text-blue-500' : 'bg-gray-100 text-gray-300'
              }`}>
                <Icon size={13} />
              </div>
              <span className={`flex-1 text-sm font-bold ${done ? 'text-gray-800' : active ? 'text-blue-700' : 'text-gray-400'}`}>
                {cat.name}
              </span>
              {done && (
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${cat.full ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {cat.fetched}/{cat.total} alan
                </span>
              )}
              {active && (
                <span className="text-[11px] font-black text-blue-600 animate-pulse">Çekiliyor…</span>
              )}
              {!done && !active && (
                <span className="text-[11px] text-gray-300 font-medium">Bekliyor</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── ÖZET / ONAY EKRANI ────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-green-50 rounded-xl"><CheckCircle2 size={20} className="text-green-600" /></div>
        <div>
          <h2 className="text-lg font-black text-gray-900">Senkronizasyon Tamamlandı</h2>
          <p className="text-sm text-gray-500">{selectedConn?.name} üzerinden veri çekimi başarılı.</p>
        </div>
      </div>

      {/* Özet istatistikler */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-black text-green-700">{totalFetched}</p>
          <p className="text-[11px] font-bold text-green-600 mt-0.5">Alan Aktarıldı</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-black text-amber-700">{ERP_MISSING_FIELDS.length}</p>
          <p className="text-[11px] font-bold text-amber-600 mt-0.5">Alan Eksik</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-black text-blue-700">{Math.round((totalFetched / totalFields) * 100)}%</p>
          <p className="text-[11px] font-bold text-blue-600 mt-0.5">Tamamlanma</p>
        </div>
      </div>

      {/* Kategori dökümü */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden mb-4">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategori</span>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Alan</span>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Durum</span>
        </div>
        {ERP_SYNC_CATEGORIES.map((cat, i) => {
          const { Icon } = cat;
          return (
            <div key={cat.name} className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 ${i < ERP_SYNC_CATEGORIES.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className="flex items-center gap-2">
                <Icon size={13} className="text-gray-400 shrink-0" />
                <span className="text-sm font-bold text-gray-700">{cat.name}</span>
              </div>
              <span className="text-sm font-black text-gray-600 text-center tabular-nums">{cat.fetched}/{cat.total}</span>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full text-center ${cat.full ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {cat.full ? 'Tam' : 'Eksik'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Eksik alanlar */}
      {ERP_MISSING_FIELDS.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5">
          <p className="text-xs font-black text-amber-700 mb-2">Eksik Alanlar — Manuel Tamamlanmalı</p>
          <div className="flex flex-wrap gap-1.5">
            {ERP_MISSING_FIELDS.map(f => (
              <span key={f} className="text-[11px] font-bold bg-white border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full">{f}</span>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={() => fetchedData && onSync(fetchedData)} disabled={!fetchedData}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-green-100 disabled:opacity-50">
        <CheckCircle2 size={15} /> Onayla ve Forma Geç
      </button>
    </div>
  );
}
