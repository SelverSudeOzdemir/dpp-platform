import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { X, Download, FileSpreadsheet, FileText, Loader2, AlertCircle } from 'lucide-react';
import type { SapDocument } from './SapDocumentsModal';

type SheetData = { name: string; rows: (string | number | boolean | null)[][] };

export default function DocPreviewModal({
  doc,
  onClose,
}: {
  doc: SapDocument;
  onClose: () => void;
}) {
  const [loading, setLoading]       = useState(false);
  const [sheets, setSheets]         = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!doc.url || doc.ext !== 'xlsx') return;

    setLoading(true);
    setError(null);

    fetch(doc.url)
      .then(r => {
        if (!r.ok) throw new Error('Dosya sunucudan alınamadı.');
        return r.arrayBuffer();
      })
      .then(buf => {
        const wb = XLSX.read(buf, { type: 'array' });
        const parsed: SheetData[] = wb.SheetNames.map(name => ({
          name,
          rows: (XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
            wb.Sheets[name],
            { header: 1, defval: null }
          ) as (string | number | boolean | null)[][])
            // Tamamen boş satırları filtrele
            .filter(row => row.some(cell => cell !== null && cell !== '')),
        }));
        setSheets(parsed);
        setActiveSheet(0);
      })
      .catch(e => setError(e.message ?? 'Bilinmeyen hata'))
      .finally(() => setLoading(false));
  }, [doc.url, doc.ext]);

  /* ── Hücre değerini string'e çevir ─────────────────────── */
  const cellStr = (v: string | number | boolean | null): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') {
      // Ondalık mı tam sayı mı?
      return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/\.?0+$/, '');
    }
    return String(v);
  };

  const currentRows = sheets[activeSheet]?.rows ?? [];

  return (
    /* Backdrop — tıklayınca kapat */
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      {/* Modal kutusu — içine tıklamak backdrop'u tetiklemesin */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Başlık ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-xl shrink-0 ${doc.ext === 'xlsx' ? 'bg-green-100' : 'bg-red-50'}`}>
              {doc.ext === 'xlsx'
                ? <FileSpreadsheet size={18} className="text-green-600" />
                : <FileText        size={18} className="text-red-500"   />
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">{doc.name}</p>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                {doc.docType} · {doc.size} · {doc.date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            {doc.url && (
              <a
                href={doc.url}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download size={12} /> İndir
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* ── İçerik ── */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Yükleniyor */}
          {loading && (
            <div className="flex-1 flex items-center justify-center gap-3 py-20">
              <Loader2 size={22} className="animate-spin text-blue-500" />
              <span className="text-sm font-medium text-gray-500">Dosya yükleniyor…</span>
            </div>
          )}

          {/* Hata */}
          {!loading && error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-sm font-medium text-red-500">{error}</p>
            </div>
          )}

          {/* PDF — önizleme yok */}
          {!loading && !error && doc.ext === 'pdf' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
              <div className="p-5 bg-red-50 rounded-2xl">
                <FileText size={44} className="text-red-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-gray-700">PDF önizleme desteklenmiyor</p>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  Dosyayı indirerek açabilirsiniz.
                </p>
              </div>
              {doc.url ? (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
                >
                  <Download size={15} /> Dosyayı Aç
                </a>
              ) : (
                <p className="text-xs text-gray-400 italic">Bu belge henüz sisteme yüklenmedi.</p>
              )}
            </div>
          )}

          {/* URL yok */}
          {!loading && !error && !doc.url && doc.ext !== 'pdf' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
              <AlertCircle size={32} className="text-amber-400" />
              <p className="text-sm font-medium text-amber-600">Bu belge henüz sisteme yüklenmedi.</p>
            </div>
          )}

          {/* ── Excel tablo görünümü ── */}
          {!loading && !error && doc.ext === 'xlsx' && sheets.length > 0 && (
            <>
              {/* Sekme çubuğu — birden fazla sayfa varsa */}
              {sheets.length > 1 && (
                <div className="flex gap-1 px-6 pt-3 shrink-0">
                  {sheets.map((s, i) => (
                    <button
                      key={s.name}
                      onClick={() => setActiveSheet(i)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                        activeSheet === i
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Tablo */}
              <div className="flex-1 overflow-auto px-6 py-4">
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      {currentRows.map((row, ri) => {
                        // İlk satır büyük başlık — birleşik göster
                        const isTitle = ri === 0;
                        const isSubtitle = ri === 1;

                        if (isTitle) {
                          const titleVal = cellStr(row[0]);
                          if (!titleVal) return null;
                          return (
                            <tr key={ri}>
                              <td
                                colSpan={Math.max(...currentRows.map(r => r.length))}
                                className="px-4 py-3 text-center font-black text-white bg-[#1B4F8A] text-sm tracking-wide"
                              >
                                {titleVal}
                              </td>
                            </tr>
                          );
                        }

                        if (isSubtitle) {
                          const subVal = cellStr(row[0]);
                          if (!subVal) return null;
                          return (
                            <tr key={ri}>
                              <td
                                colSpan={Math.max(...currentRows.map(r => r.length))}
                                className="px-4 py-2 text-center font-medium text-white bg-[#85B4D8] text-[11px]"
                              >
                                {subVal}
                              </td>
                            </tr>
                          );
                        }

                        const isSection = row.length >= 1 &&
                          cellStr(row[0]).startsWith('  ') &&
                          row.slice(1).every(c => c === null || c === '');

                        if (isSection) {
                          return (
                            <tr key={ri}>
                              <td
                                colSpan={Math.max(...currentRows.map(r => r.length))}
                                className="px-4 py-2 font-black text-[#1B4F8A] bg-[#D6E4F0] text-[11px] tracking-wide"
                              >
                                {cellStr(row[0]).trim()}
                              </td>
                            </tr>
                          );
                        }

                        const alt = ri % 2 === 0;
                        return (
                          <tr key={ri} className={alt ? 'bg-white' : 'bg-gray-50'}>
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className={`px-3 py-2 border-b border-gray-50 whitespace-nowrap ${
                                  ci === 0
                                    ? 'font-bold text-gray-700 bg-opacity-80'
                                    : 'text-gray-600'
                                }`}
                              >
                                {cellStr(cell)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
