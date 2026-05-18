import { useState } from 'react';
import { FileText, FileSpreadsheet, X } from 'lucide-react';

export type SapDocument = {
  id: string;
  name: string;
  docType: string;
  size: string;
  date: string;
  ext: 'pdf' | 'xlsx';
};

export const MOCK_SAP_DOCS: SapDocument[] = [
  { id: '1', name: 'MTC_KCR-2026-0312-A.pdf',   docType: 'EN 10204 3.1',  size: '842 KB', date: '12.03.2026', ext: 'pdf'  },
  { id: '2', name: 'KimyasalAnaliz_0312.xlsx',   docType: 'Analiz Raporu', size: '124 KB', date: '12.03.2026', ext: 'xlsx' },
  { id: '3', name: 'MekanikTest_0312.pdf',        docType: 'Mekanik Test',  size: '318 KB', date: '12.03.2026', ext: 'pdf'  },
  { id: '4', name: 'UretimEmri_462891.pdf',       docType: 'Üretim Emri',   size: '210 KB', date: '11.03.2026', ext: 'pdf'  },
  { id: '5', name: 'ISO9001_Kocaer_2026.pdf',     docType: 'ISO 9001',      size: '1.2 MB', date: '01.01.2026', ext: 'pdf'  },
];

export default function SapDocumentsModal({ batchNo, onPull, onCancel }: {
  batchNo: string;
  onPull: (docs: SapDocument[]) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(['1', '2', '3']));

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Başlık */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900">SAP&apos;tan Belgeler</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              <span className="font-mono font-bold text-gray-700">{batchNo || '—'}</span> batch&apos;ine ait belgeler bulundu
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Belge listesi */}
        <div className="px-6 py-4 space-y-2">
          {MOCK_SAP_DOCS.map(doc => (
            <label
              key={doc.id}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                ${selected.has(doc.id) ? 'border-blue-200 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}
            >
              <input
                type="checkbox"
                checked={selected.has(doc.id)}
                onChange={() => toggle(doc.id)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <div className={`p-1.5 rounded-lg shrink-0 ${doc.ext === 'xlsx' ? 'bg-green-100' : 'bg-red-50'}`}>
                {doc.ext === 'xlsx'
                  ? <FileSpreadsheet size={15} className="text-green-600" />
                  : <FileText size={15} className="text-red-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{doc.name}</p>
                <p className="text-[11px] text-gray-400 font-medium">{doc.docType} · {doc.size} · {doc.date}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Alt butonlar */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium">{selected.size} belge seçildi</p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={() => onPull(MOCK_SAP_DOCS.filter(d => selected.has(d.id)))}
              disabled={selected.size === 0}
              className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm shadow-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Seçilenleri Çek →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
