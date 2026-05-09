import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import ErpSyncFlow from '../../components/batches/ErpSyncFlow';
import { ExcelFileHistory, ExcelUploadFlow } from '../../components/batches/ExcelUploadFlow';
import { MainStepper } from '../../components/batches/MainStepper';
import { Step1BatchInfo } from '../../components/batches/Step1BatchInfo';
import Step3DppData from '../../components/batches/Step3DppData';
import Step4Preview, { getMissingFields } from '../../components/batches/Step4Preview';
import type { BatchInfo, DppData, ExcelImportData } from '../../types/batch';
import { EMPTY_DPP, MOCK_BATCH_DPP } from '../../constants/batchConstants';
import {
  ChevronRight, ChevronLeft,
  Send, Loader2,
  Save, Clock,
} from 'lucide-react';

export default function NewBatch() {
  const router = useRouter();
  const [step, setStep]           = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [erpOverlay, setErpOverlay]   = useState(false);
  const [erpImported, setErpImported] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [batchInfo, setBatchInfo] = useState<BatchInfo>({
    parti_no: '', tedarikci_parti_kodu: '', urun_no: '', urun_tipi: '',
    ocak_no: '', uretim_tarihi: '', miktar_ton: '',
  });
  const [dppData, setDppData] = useState<DppData>(EMPTY_DPP);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const missingFields = getMissingFields(batchInfo, dppData);
  const isValidToSubmit = missingFields.length === 0;

  const handleSaveDraft = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 1000);
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
    if (!existingLoaded) {
      setBatchInfo(prev => ({ ...prev, ...d.batchInfo }));
    }
    setDppData(prev => ({ ...prev, ...d.dppData }));
    setErpImported(true);
    setErpOverlay(false); // ERP overlay kapanır, form pre-dolu açılır
  };

  const canProceedStep0 = existingLoaded || !!(batchInfo.parti_no && batchInfo.urun_tipi && batchInfo.ocak_no && batchInfo.uretim_tarihi);
  const handleNext = () => { if (step === 0 && !canProceedStep0) return; setStep(s => Math.min(s + 1, 2)); };
  const handleBack = () => setStep(s => Math.max(s - 1, 0));
  const handleReset = () => {
    setSubmitted(false); setStep(0); setErpOverlay(false); setErpImported(false);
    setBatchInfo({ parti_no: '', tedarikci_parti_kodu: '', urun_no: '', urun_tipi: '', ocak_no: '', uretim_tarihi: '', miktar_ton: '' });
    setDppData(EMPTY_DPP);
  };

  if (submitted) {
    return (
      <ProtectedRoute allowedRoles={['ENGINEER', 'ADMIN']}>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"><Send size={32} className="text-green-600" /></div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900">Onaya Gönderildi!</h2>
            <p className="text-gray-500 font-medium mt-2 max-w-sm">
              <span className="font-bold text-gray-700">{batchInfo.parti_no}</span> numaralı batch DPP&apos;si Admin onayına iletildi.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => router.push('/batches')}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
              Batch Listesine Dön
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

  return (
    <ProtectedRoute allowedRoles={['ENGINEER', 'ADMIN']}>
      <div className="max-w-3xl mx-auto py-10 px-4">
        <button type="button" onClick={() => router.push('/batches')}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors mb-8">
          <ChevronLeft size={16} /> Batch Listesine Dön
        </button>
        <div className="mb-2">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Yeni Batch & DPP Oluştur</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Üretim partisi bilgilerini girerek DPP oluşturun ve onaya gönderin.</p>
        </div>
        <div className="mt-10"><MainStepper current={step} /></div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-xl shadow-gray-100 min-h-[400px]">
          {batchLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
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
            />
          )}
          {!batchLoading && step === 1 && <Step3DppData data={dppData} onChange={setDppData} batchInfo={batchInfo} erpImported={erpImported} />}
          {!batchLoading && step === 2 && <Step4Preview batchInfo={batchInfo} dppData={dppData} erpImported={erpImported} />}
        </div>

        {!erpOverlay && !batchLoading && (
          <div className="flex items-center justify-between mt-6">
            <button type="button" onClick={handleBack}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors ${step === 0 ? 'invisible' : ''}`}>
              <ChevronLeft size={16} /> Geri
            </button>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <button type="button" onClick={handleSaveDraft} disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="text-gray-500" />}
                  {isSaving ? 'Kaydediliyor...' : 'Taslağı Kaydet'}
                </button>
                {lastSaved && !isSaving && (
                  <span className="text-[10px] font-bold text-gray-400 mt-1 flex items-center gap-1 mr-1">
                    <Clock size={10} /> Son kayıt: {lastSaved.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {step < 2 ? (
                <button type="button" onClick={handleNext}
                  disabled={step === 0 && !canProceedStep0}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-start">
                  Devam Et <ChevronRight size={16} />
                </button>
              ) : (
                <button type="button" onClick={() => isValidToSubmit && setSubmitted(true)}
                  disabled={!isValidToSubmit}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-100 disabled:opacity-40 disabled:cursor-not-allowed self-start">
                  <Send size={16} /> Onaya Gönder
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
