import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { apiCreateDpp, apiGetProducts, apiUpdateDpp } from '../../lib/api';
import ErpSyncFlow from '../../components/batches/ErpSyncFlow';
import { Step1BatchInfo } from '../../components/batches/Step1BatchInfo';
import Step3DppData from '../../components/batches/Step3DppData';
import Step4Preview, { getMissingFields } from '../../components/batches/Step4Preview';
import SapDocumentsModal, { type SapDocument } from '../../components/batches/SapDocumentsModal';
import type { BatchInfo, DppData, ExcelImportData } from '../../types/batch';
import { EMPTY_DPP, MOCK_BATCH_DPP } from '../../constants/batchConstants';
import {
  ChevronRight, ChevronLeft,
  Send, Loader2,
  Save, Clock, CheckCircle2,
  Files, ChevronDown, FileText, FileSpreadsheet, Cpu,
} from 'lucide-react';

export default function NewBatch() {
  const router = useRouter();
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const [step, setStep]               = useState(0);
  const [submitted, setSubmitted]     = useState(false);
  const [erpOverlay, setErpOverlay]   = useState(false);
  const [erpImported, setErpImported] = useState(false);
  const [batchLoading, setBatchLoading]   = useState(false);
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [batchInfo, setBatchInfo] = useState<BatchInfo>({
    parti_no: '', tedarikci_parti_kodu: '', urun_no: '', urun_tipi: '',
    ocak_no: '', uretim_tarihi: '', miktar_ton: '',
  });
  const [dppData, setDppData]           = useState<DppData>(EMPTY_DPP);
  const [erpLockedFields, setErpLockedFields] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving]         = useState(false);
  const [lastSaved, setLastSaved]       = useState<Date | null>(null);
  const [productTypes, setProductTypes] = useState<any[]>([]);

  // Belge yönetimi
  const [showSapDocs, setShowSapDocs]       = useState(false);
  const [pulledDocuments, setPulledDocuments] = useState<SapDocument[]>([]);
  const [belgelerOpen, setBelgelerOpen]     = useState(false);

  useEffect(() => {
    loadProductTypes();
  }, []);

  const loadProductTypes = async () => {
    try {
      const prods = await apiGetProducts();
      setProductTypes(prods);
    } catch (err) {
      console.error('Urun tipleri alınamadı:', err);
    }
  };

  const missingFields   = getMissingFields(batchInfo, dppData);
  const isValidToSubmit = missingFields.length === 0;

  const handleSaveDraft = () => {
    setIsSaving(true);
    setTimeout(() => { setIsSaving(false); setLastSaved(new Date()); }, 1000);
  };

  const handleSubmitDpp = async () => {
    try {
      const matchingProduct = productTypes.find(
        (p: any) => p.product_name === batchInfo.urun_tipi || p.id === batchInfo.urun_no
      );
      const payload = {
        product_type_id: matchingProduct ? matchingProduct.id : 'c8f5f0b4-5b4d-4e96-a83a-86718d098e94',
        gs1_serial_number: batchInfo.parti_no || 'KCR-2026-0312-A',
        production_date: batchInfo.uretim_tarihi || '2026-03-12',
        gtin: batchInfo.urun_no || '08690000112345',
      };
      const newDpp = await apiCreateDpp(payload);
      if (newDpp && newDpp.id) {
        await apiUpdateDpp(newDpp.id, { dpp_status: 'pending_approval' });
      }
      setSubmitted(true);
    } catch (err: any) {
      console.error('DPP oluşturulamadı, mock akışa devam ediliyor:', err);
      setSubmitted(true);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    const batchId = router.query.batchId as string | undefined;
    if (!batchId) return;
    const existing = MOCK_BATCH_DPP[batchId];
    if (!existing) return;
    setBatchLoading(true);
    const t = setTimeout(() => {
      setBatchInfo(prev => ({ ...prev, ...existing.batchInfo }));
      setDppData(prev => ({ ...prev, ...existing.dppData }));
      setExistingLoaded(true);
      setBatchLoading(false);
    }, 1300);
    return () => clearTimeout(t);
  }, [router.isReady, router.query.batchId]);

  const handleErpSync = (d: ExcelImportData) => {
    if (!existingLoaded) setBatchInfo(prev => ({ ...prev, ...d.batchInfo }));
    setDppData(prev => ({ ...prev, ...d.dppData }));
    setErpImported(true);
    setErpOverlay(false);
    const locked = new Set<string>([
      ...Object.keys(d.batchInfo).filter(k => !!(d.batchInfo as Record<string, unknown>)[k]),
      ...Object.keys(d.dppData).filter(k => !!(d.dppData as Record<string, unknown>)[k]),
    ]);
    setErpLockedFields(locked);
    // SAP belgelerini seç ekranını aç
    setShowSapDocs(true);
  };

  const handleDocsPull = (docs: SapDocument[]) => {
    setPulledDocuments(docs);
    setShowSapDocs(false);
    setBelgelerOpen(true);
  };

  const canProceedStep0 = existingLoaded || !!(batchInfo.parti_no && batchInfo.urun_tipi && batchInfo.ocak_no && batchInfo.uretim_tarihi);
  const handleNext  = () => { if (step === 0 && !canProceedStep0) return; setStep(s => Math.min(s + 1, 2)); };
  const handleBack  = () => setStep(s => Math.max(s - 1, 0));
  const handleReset = () => {
    setSubmitted(false); setStep(0); setErpOverlay(false); setErpImported(false);
    setBatchInfo({ parti_no: '', tedarikci_parti_kodu: '', urun_no: '', urun_tipi: '', ocak_no: '', uretim_tarihi: '', miktar_ton: '' });
    setDppData(EMPTY_DPP);
    setPulledDocuments([]);
    setBelgelerOpen(false);
  };

  if (submitted) {
    return (
      <ProtectedRoute allowedRoles={['ENGINEER', 'ADMIN']}>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <Send size={32} className="text-green-600" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900">Onaya Gönderildi!</h2>
            <p className="text-gray-500 font-medium mt-2 max-w-sm">
              <span className="font-bold text-gray-700">{batchInfo.parti_no}</span> numaralı batch DPP&apos;si Admin onayına iletildi.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => router.push(isAdmin ? '/admin' : '/batches')}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
              {isAdmin ? 'Admin Paneline Dön' : 'Batch Listesine Dön'}
            </button>
            <button onClick={handleReset}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors">
              Yeni Batch Oluştur
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const STEP_META = [
    {
      label: 'Batch Bilgileri',
      desc: 'Üretim partisine ait temel kimlik ve üretim bilgilerini girin.',
      hint: 'SAP bağlantısı olan mühendisler "SAP\'tan Veri Çek" butonunu kullanabilir.',
    },
    {
      label: 'DPP Verileri',
      desc: 'Kimyasal, mekanik, karbon ve yaşam döngüsü bilgilerini doldurun.',
      hint: 'SAP\'tan gelen alanlar kilitlidir; yalnızca eksik veriler elle girilir.',
    },
    {
      label: 'Önizleme & Gönder',
      desc: 'Girilen tüm bilgileri gözden geçirin ve onaya gönderin.',
      hint: 'Eksik zorunlu alan varsa sistem sizi uyarır.',
    },
  ];

  return (
    <ProtectedRoute allowedRoles={['ENGINEER', 'ADMIN']}>
      <div className="max-w-screen-xl mx-auto py-10 px-6">
        <button type="button" onClick={() => router.push(isAdmin ? '/admin' : '/batches')}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors mb-8">
          <ChevronLeft size={16} /> {isAdmin ? 'Admin Paneline Dön' : 'Batch Listesine Dön'}
        </button>

        <div className="flex gap-8 items-start">

          {/* ── Sol kenar çubuğu ── */}
          <aside className="w-72 shrink-0 sticky top-8">
            <div className="mb-8">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                Yeni Batch &amp; DPP Oluştur
              </h1>
              <p className="text-sm text-gray-500 mt-2 font-medium leading-relaxed">
                Üretim partisi bilgilerini girerek DPP oluşturun ve onaya gönderin.
              </p>
            </div>

            {/* Dikey stepper */}
            <div className="flex flex-col gap-1">
              {STEP_META.map((s, i) => {
                const isDone   = i < step;
                const isActive = i === step;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all
                        ${isDone ? 'bg-blue-600 text-white' : isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'}`}>
                        {isDone ? <CheckCircle2 size={15} /> : i + 1}
                      </div>
                      {i < STEP_META.length - 1 && (
                        <div className={`w-0.5 flex-1 my-1 min-h-[2rem] ${isDone ? 'bg-blue-400' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div className={`pb-6 ${i === STEP_META.length - 1 ? 'pb-0' : ''}`}>
                      <p className={`text-sm font-black leading-none mb-1 ${isActive ? 'text-blue-600' : isDone ? 'text-gray-700' : 'text-gray-400'}`}>
                        {s.label}
                      </p>
                      {isActive && (
                        <>
                          <p className="text-xs text-gray-500 font-medium leading-relaxed">{s.desc}</p>
                          <p className="text-[11px] text-blue-500 font-medium mt-1.5 leading-relaxed">{s.hint}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Taslağı Kaydet */}
            {!erpOverlay && !batchLoading && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <button type="button" onClick={handleSaveDraft} disabled={isSaving}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50">
                  {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} className="text-gray-500" />}
                  {isSaving ? 'Kaydediliyor...' : 'Taslağı Kaydet'}
                </button>
                {lastSaved && !isSaving && (
                  <p className="text-[10px] font-bold text-gray-400 mt-1.5 flex items-center justify-center gap-1">
                    <Clock size={10} /> Son kayıt: {lastSaved.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            )}
          </aside>

          {/* ── Sağ içerik alanı ── */}
          <div className="flex-1 min-w-0">

            {/* Belgeler dropdown — SAP'tan belge çekildiyse görünür */}
            {pulledDocuments.length > 0 && (
              <div className="flex justify-end mb-3 relative">
                <button
                  type="button"
                  onClick={() => setBelgelerOpen(o => !o)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 shadow-sm transition-colors"
                >
                  <Files size={15} className="text-blue-500" />
                  Belgeler
                  <span className="bg-blue-100 text-blue-700 text-[11px] font-black px-1.5 py-0.5 rounded-full">
                    {pulledDocuments.length}
                  </span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${belgelerOpen ? 'rotate-180' : ''}`} />
                </button>

                {belgelerOpen && (
                  <>
                    {/* Arka kapanıcı overlay */}
                    <div className="fixed inset-0 z-10" onClick={() => setBelgelerOpen(false)} />

                    <div className="absolute top-full right-0 mt-1.5 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200 z-20 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">SAP&apos;tan Çekilen Belgeler</p>
                      </div>

                      <div className="py-2 max-h-64 overflow-y-auto">
                        {pulledDocuments.map(doc => (
                          <div key={doc.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                            <div className={`p-1.5 rounded-lg shrink-0 ${doc.ext === 'xlsx' ? 'bg-green-100' : 'bg-red-50'}`}>
                              {doc.ext === 'xlsx'
                                ? <FileSpreadsheet size={13} className="text-green-600" />
                                : <FileText size={13} className="text-red-500" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate">{doc.name}</p>
                              <p className="text-[11px] text-gray-400 font-medium">{doc.docType} · {doc.size}</p>
                            </div>
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">SAP</span>
                          </div>
                        ))}
                      </div>

                      <div className="px-4 py-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => { setBelgelerOpen(false); alert('Parse işlemi backend entegrasyonunda aktif olacaktır.'); }}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                          <Cpu size={14} /> Parse Et
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Form kartı */}
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-xl shadow-gray-100 min-h-[500px]">
              {batchLoading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
                    <Loader2 size={28} className="text-blue-500 animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-black text-gray-800">Veriler Yükleniyor</p>
                    <p className="text-sm text-gray-400 font-medium mt-1">Mevcut DPP bilgileri getiriliyor…</p>
                  </div>
                </div>
              )}

              {!batchLoading && step === 0 && erpOverlay && (
                <ErpSyncFlow onSync={handleErpSync} onCancel={() => setErpOverlay(false)} />
              )}
              {!batchLoading && step === 0 && !erpOverlay && (
                <Step1BatchInfo
                  data={batchInfo}
                  onChange={setBatchInfo}
                  erpImported={erpImported}
                  existingLoaded={existingLoaded}
                  onErpClick={() => setErpOverlay(true)}
                  erpLockedFields={erpLockedFields}
                />
              )}
              {!batchLoading && step === 1 && (
                <Step3DppData data={dppData} onChange={setDppData} batchInfo={batchInfo} erpImported={erpImported} erpLockedFields={erpLockedFields} />
              )}
              {!batchLoading && step === 2 && (
                <Step4Preview batchInfo={batchInfo} dppData={dppData} erpImported={erpImported} />
              )}
            </div>

            {/* Navigasyon butonları */}
            {!erpOverlay && !batchLoading && (
              <div className="flex items-center justify-between mt-5">
                <button type="button" onClick={handleBack}
                  className={`inline-flex items-center gap-1.5 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors ${step === 0 ? 'invisible' : ''}`}>
                  <ChevronLeft size={16} /> Geri
                </button>

                {step < 2 ? (
                  <button type="button" onClick={handleNext}
                    disabled={step === 0 && !canProceedStep0}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Devam Et <ChevronRight size={16} />
                  </button>
                ) : (
                  <button type="button" onClick={() => isValidToSubmit && handleSubmitDpp()}
                    disabled={!isValidToSubmit}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-100 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Send size={16} /> Onaya Gönder
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SAP Belge Seçim Modalı */}
      {showSapDocs && (
        <SapDocumentsModal
          batchNo={batchInfo.parti_no}
          onPull={handleDocsPull}
          onCancel={() => setShowSapDocs(false)}
        />
      )}

    </ProtectedRoute>
  );
}
