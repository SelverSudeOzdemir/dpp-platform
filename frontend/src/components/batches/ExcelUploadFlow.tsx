import { useState } from 'react';
import { ChevronLeft, FileSpreadsheet, CheckCircle2, AlertCircle, Package, Upload, Download, X, Loader2 } from 'lucide-react';
import { apiParseExcel } from '../../lib/api';
import {
  MOCK_EXISTING_BATCHES,
  MOCK_UPLOADED_FILES,
  DURUM_CLASS,
  CATEGORIES,
  DPP_FIELDS,
  USER_EXCEL_HEADERS,
  EXCEL_MOCK_VALUES,
  AUTO_MAPPING,
  FIELD_TO_BATCHINFO,
  FIELD_TO_DPPDATA,
  URUN_KATALOGU,
} from '../../constants/batchConstants';
import type { ExcelImportData, BatchInfo, DppData } from '../../types/batch';

function ExcelFileHistory({
  batchId, onUploadNew, onBack,
}: {
  batchId: string;
  onUploadNew: () => void;
  onBack: () => void;
}) {
  const batch = MOCK_EXISTING_BATCHES.find(b => b.id === batchId);
  const files = MOCK_UPLOADED_FILES[batchId] ?? [];

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-center gap-3 mb-5">
        <button type="button" onClick={onBack}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-black text-gray-900">Yüklenen Dosyalar</h2>
          <p className="text-sm text-gray-500">Bu DPP için daha önce aktarılan Excel / CSV dosyaları.</p>
        </div>
      </div>

      {/* Seçili batch özeti */}
      {batch && (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5">
          <div className="p-2 bg-white border border-gray-200 rounded-lg shrink-0">
            <Package size={16} className="text-gray-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
                {batch.parti_no}
              </span>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${DURUM_CLASS[batch.dpp_durum] ?? 'bg-gray-100 text-gray-600'}`}>
                {batch.dpp_durum}
              </span>
            </div>
            <p className="text-sm font-bold text-gray-800 truncate mt-0.5">{batch.urun_tipi}</p>
          </div>
        </div>
      )}

      {/* Dosya listesi */}
      {files.length > 0 ? (
        <div className="border border-gray-100 rounded-2xl overflow-hidden mb-5">
          {/* Tablo başlığı */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dosya Adı</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Alan</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Boyut</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Tarih</span>
          </div>
          {/* Satırlar */}
          {files.map((f, idx) => (
            <div
              key={f.id}
              className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3.5 ${idx < files.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50 transition-colors`}
            >
              {/* Dosya adı + ikon */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black
                  ${f.file_type === 'xlsx' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {f.file_type === 'xlsx' ? 'XLS' : 'CSV'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate leading-tight">{f.file_name}</p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">{f.uploaded_by}</p>
                </div>
              </div>
              {/* Alan sayısı */}
              <span className="text-xs font-black text-center text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                {f.fields_imported} alan
              </span>
              {/* Boyut */}
              <span className="text-xs text-gray-400 font-medium text-right whitespace-nowrap">{f.file_size}</span>
              {/* Tarih */}
              <span className="text-[11px] text-gray-400 font-medium text-right whitespace-nowrap">{f.uploaded_at}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-gray-200 rounded-2xl px-6 py-10 text-center mb-5">
          <FileSpreadsheet size={28} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-bold text-gray-400">Bu batch için henüz dosya yüklenmemiş.</p>
          <p className="text-xs text-gray-400 mt-1">İlk Excel / CSV aktarımını başlatmak için aşağıdaki butonu kullanın.</p>
        </div>
      )}

      {/* Eylem butonu */}
      <button
        type="button"
        onClick={onUploadNew}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-blue-100"
      >
        <Upload size={15} /> Yeni Dosya Yükle
      </button>
    </div>
  );
}

function findFuzzyMatch(key: string, headers: string[]): string {
  const normKey = key.toLowerCase();
  
  const keywordMap: Record<string, string[]> = {
    c_pct: ['karbon', 'carbon', 'c %', 'c_pct', 'c'],
    mn_pct: ['mangan', 'manganese', 'mn %', 'mn_pct', 'mn'],
    si_pct: ['silisyum', 'silicon', 'si %', 'si_pct', 'si'],
    p_pct: ['fosfor', 'phosphorus', 'p %', 'p_pct', 'p'],
    s_pct: ['kükürt', 'kükurt', 'kukurt', 'sulfur', 's %', 's_pct', 's'],
    n_pct: ['azot', 'nitrogen', 'n %', 'n_pct', 'n'],
    yield_mpa: ['akma', 'yield', 'strength'],
    tensile_mpa: ['çekme', 'cekme', 'tensile'],
    elongation_pct: ['uzama', 'elongation'],
    recycled_content_pct: ['geri dönüşüm', 'recycled', 'recycle', 'geri donusum'],
  };

  const keywords = keywordMap[key];
  if (!keywords) return '— Eşleştirme Yok —';

  for (const header of headers) {
    const normHeader = header.toLowerCase();
    for (const kw of keywords) {
      if (normHeader.includes(kw)) {
        return header;
      }
    }
  }

  return '— Eşleştirme Yok —';
}

function ExcelUploadFlow({ onImport, selectedBatchId }: { onImport: (d: ExcelImportData) => void; selectedBatchId?: string | null }) {
  const [subStep, setSubStep]   = useState<0 | 1>(0);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>(USER_EXCEL_HEADERS);
  const [excelValues, setExcelValues] = useState<Record<string, string>>(EXCEL_MOCK_VALUES);

  // Hangi Excel sütunu hangi DPP alanına eşleşiyor
  const [mapping, setMapping] = useState<Record<string, string>>(() =>
    Object.fromEntries(DPP_FIELDS.map(f => [f.key, AUTO_MAPPING[f.key] ?? '— Eşleştirme Yok —']))
  );

  // Kaydedilecek değerler — Excel'den otomatik dolur, mühendis düzenleyebilir
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(DPP_FIELDS.map(f => {
      const col = AUTO_MAPPING[f.key];
      return [f.key, col ? (excelValues[col] ?? '') : ''];
    }))
  );

  const handleMappingChange = (fieldKey: string, excelCol: string) => {
    setMapping(prev => ({ ...prev, [fieldKey]: excelCol }));
    // Yeni sütun seçilince değeri otomatik doldur
    const excelVal = excelCol === '— Eşleştirme Yok —' ? '' : (excelValues[excelCol] ?? '');
    setValues(prev => ({ ...prev, [fieldKey]: excelVal }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const res = await apiParseExcel(file);
      setFileName(res.file_name);
      
      const newHeaders = ['— Eşleştirme Yok —', ...res.headers];
      setExcelHeaders(newHeaders);
      setExcelValues(res.values);

      const newMapping: Record<string, string> = {};
      const newValues: Record<string, string> = {};
      
      DPP_FIELDS.forEach(f => {
        const matchedHeader = findFuzzyMatch(f.key, res.headers);
        newMapping[f.key] = matchedHeader;
        newValues[f.key] = matchedHeader === '— Eşleştirme Yok —' ? '' : (res.values[matchedHeader] ?? '');
      });

      setMapping(newMapping);
      setValues(newValues);
      setSubStep(1);
    } catch (err: any) {
      console.warn("Backend parsing failed, falling back to mock data:", err);
      setFileName(file.name);
      setExcelHeaders(USER_EXCEL_HEADERS);
      setExcelValues(EXCEL_MOCK_VALUES);
      setMapping(Object.fromEntries(DPP_FIELDS.map(f => [f.key, AUTO_MAPPING[f.key] ?? '— Eşleştirme Yok —'])));
      setValues(Object.fromEntries(DPP_FIELDS.map(f => [f.key, AUTO_MAPPING[f.key] ? (EXCEL_MOCK_VALUES[AUTO_MAPPING[f.key]] ?? '') : ''])));
      setSubStep(1);
    } finally {
      setIsParsing(false);
    }
  };

  const autoCount = DPP_FIELDS.filter(f => mapping[f.key] !== '— Eşleştirme Yok —').length;

  const SUBSTEPS = ['Dosya Yükleme', 'Eşleştirme & Değerler'];

  const handleSave = () => {
    const batchInfo: Partial<BatchInfo> = {};
    const dppData: Partial<DppData> = {};
    // urun_tipi özel olarak katalogdan çek
    const urunNo = values['urun_kodu'];
    const katalog = URUN_KATALOGU.find(u => u.urun_no === urunNo);
    if (katalog) {
      (batchInfo as Record<string, string>)['urun_tipi'] = katalog.urun_tipi;
      Object.assign(dppData, {
        gtin: katalog.gtin, material_standard: katalog.malzeme_standard,
        celik_kalitesi: katalog.celik_kalitesi, en_mm: katalog.en_mm,
        agirlik_m: katalog.agirlik_m, kalinlik_mm: katalog.kalinlik_mm,
      });
    }
    DPP_FIELDS.forEach(f => {
      if (values[f.key] && FIELD_TO_BATCHINFO[f.key]) {
        (batchInfo as Record<string, string>)[FIELD_TO_BATCHINFO[f.key]] = values[f.key];
      }
      if (values[f.key] && FIELD_TO_DPPDATA[f.key]) {
        (dppData as Record<string, string>)[FIELD_TO_DPPDATA[f.key]] = values[f.key];
      }
    });
    onImport({ batchInfo, dppData });
  };

  const existingBatch = selectedBatchId
    ? MOCK_EXISTING_BATCHES.find(b => b.id === selectedBatchId)
    : null;

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-blue-50 rounded-xl"><FileSpreadsheet size={20} className="text-blue-600" /></div>
        <div>
          <h2 className="text-lg font-black text-gray-900">Excel / CSV ile Veri Aktarımı</h2>
          <p className="text-sm text-gray-500">Dosyanızı yükleyin, sütunları eşleştirin ve taslak olarak kaydedin.</p>
        </div>
      </div>
      {existingBatch && (
        <div className="flex items-center gap-2 mb-5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Package size={14} className="text-blue-600 shrink-0" />
          <p className="text-sm font-bold text-blue-800">
            Hedef DPP: <span className="font-mono">{existingBatch.parti_no}</span>
            <span className="font-normal text-blue-600 ml-2">— {existingBatch.urun_tipi}</span>
          </p>
        </div>
      )}

      {/* İç adım göstergesi */}
      <div className="flex items-center gap-0 mb-8">
        {SUBSTEPS.map((label, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all
                ${i < subStep ? 'bg-blue-600 text-white' : i === subStep ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'}`}>
                {i < subStep ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] font-bold mt-1 whitespace-nowrap ${i === subStep ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < SUBSTEPS.length - 1 && (
              <div className={`w-24 h-0.5 mb-4 mx-1 ${i < subStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── ADIM 0: YÜKLEME ── */}
      {subStep === 0 && (
        <div className="space-y-5">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-gray-800 mb-1">Kocaer DPP Şablonu</p>
                <p className="text-xs text-gray-500 mb-3">İsterseniz şablonu indirip doldurun. Kendi Excel'inizi de yükleyebilirsiniz.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Batch Kimliği', 'Kimyasal Kompozisyon', 'Mekanik Özellikler', 'CO₂ Emisyonu', 'Sertifikalar'].map(col => (
                    <span key={col} className="text-[10px] font-bold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded">{col}</span>
                  ))}
                </div>
              </div>
              <button className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-blue-300 text-sm font-bold text-gray-700 rounded-xl transition-colors">
                <Download size={15} className="text-blue-500" /> .xlsx İndir
              </button>
            </div>
          </div>

          <div
            className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer relative"
            onClick={() => document.getElementById('excel-file-input')?.click()}
          >
            {isParsing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-blue-500" size={36} />
                <p className="text-sm font-bold text-gray-600">Dosya ayrıştırılıyor...</p>
              </div>
            ) : (
              <>
                <Upload size={36} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-bold text-gray-600">Dosyayı buraya sürükleyin</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">veya tıklayarak seçin</p>
                <span className="text-[11px] font-bold bg-gray-200 text-gray-500 px-3 py-1 rounded-full">.xlsx &nbsp;·&nbsp; .csv</span>
              </>
            )}
            <input
              type="file"
              id="excel-file-input"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleFileChange}
              disabled={isParsing}
            />
          </div>
          <p className="text-center text-xs text-gray-400">Demo için alana tıklayın — örnek kimyasal kompozisyon verisi yüklenecektir.</p>
        </div>
      )}

      {/* ── ADIM 1: EŞLEŞTİRME & DEĞERLER ── */}
      {subStep === 1 && (
        <div className="space-y-4">

          {/* Dosya + özet */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={16} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-800">{fileName}</span>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-bold">{Object.keys(excelValues).length} sütun okundu</span>
              <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-bold">{autoCount} alan otomatik eşleşti</span>
            </div>
            <button onClick={() => { setFileName(''); setSubStep(0); }} className="text-gray-400 hover:text-gray-600">
              <X size={15} />
            </button>
          </div>

          {/* Uyarı notu */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium">
              Eşleştirilemeyen alanlar boş bırakılır — sonradan manuel olarak veya başka bir Excel yükleyerek tamamlanabilir.
            </p>
          </div>

          {/* Tablo başlığı */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-50 px-4 py-2.5 border-b border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-wider gap-2">
              <span className="col-span-3">DPP Alanı</span>
              <span className="col-span-3">Excel Sütunu</span>
              <span className="col-span-2">Excel&apos;deki Değer</span>
              <span className="col-span-4">Kaydedilecek Değer</span>
            </div>

            {CATEGORIES.map(cat => {
              const fields = DPP_FIELDS.filter(f => f.category === cat);
              if (!fields.length) return null;
              return (
                <div key={cat}>
                  <div className="px-4 py-1.5 bg-gray-50 border-y border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{cat}</span>
                  </div>
                  {fields.map(field => {
                    const selectedCol = mapping[field.key];
                    const isMapped = selectedCol !== '— Eşleştirme Yok —';
                    const rawVal = isMapped ? (excelValues[selectedCol] ?? '') : '';
                    const isAuto = !!AUTO_MAPPING[field.key];
                    return (
                      <div key={field.key} className={`grid grid-cols-12 items-center px-4 py-2.5 gap-2 border-b border-gray-50 last:border-0 ${!isMapped ? 'bg-gray-50/50' : ''}`}>
                        {/* DPP Alanı */}
                        <div className="col-span-3 flex items-center gap-1">
                          <span className={`text-sm font-bold ${isMapped ? 'text-gray-800' : 'text-gray-400'}`}>{field.label}</span>
                          {field.required && <span className="text-red-400 text-xs">*</span>}
                        </div>

                        {/* Excel Sütunu dropdown */}
                        <div className="col-span-3">
                          <select
                            value={selectedCol}
                            onChange={e => handleMappingChange(field.key, e.target.value)}
                            className={`w-full text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                              !isMapped ? 'border-gray-200 text-gray-400' : isAuto ? 'border-green-200 text-green-700' : 'border-blue-200 text-blue-700'
                            }`}
                          >
                            {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>

                        {/* Excel'deki ham değer — readonly */}
                        <div className="col-span-2">
                          {isMapped && rawVal ? (
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{rawVal}</span>
                          ) : (
                            <span className="text-xs text-gray-300 italic">—</span>
                          )}
                        </div>

                        {/* Kaydedilecek değer — düzenlenebilir */}
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={values[field.key]}
                            onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                            disabled={!isMapped}
                            placeholder={isMapped ? 'Değeri düzenleyin...' : 'Sütun seçilmedi'}
                            className={`w-full text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              !isMapped
                                ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-white border-gray-200 text-gray-800'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Butonlar */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => { setFileName(''); setSubStep(0); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-sm font-bold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={15} /> Geri
            </button>
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-400 font-medium">
                Eksik alanlar daha sonra tamamlanabilir.
              </p>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                <CheckCircle2 size={15} /> Taslak Olarak Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { ExcelFileHistory, ExcelUploadFlow };
