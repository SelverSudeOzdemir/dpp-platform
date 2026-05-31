import { useState, useEffect } from 'react';
import { Flag, AlertTriangle, CheckCircle2, XCircle, Calendar, ShieldAlert, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { CBAM_LIMIT, CERT_ALERTS } from '../../../constants/adminConstants';
import { apiGetCbamStatus, apiGetReachReport, apiGetProducts } from '../../../lib/api';
import type { AdminProduct, CertType } from '../../../types/admin';

interface Props {
  products: AdminProduct[];
}

const ITEMS_PER_PAGE = 5;

export default function ComplianceTab({ products }: Props) {
  const [certFilter, setCertFilter] = useState<'tumu' | CertType>('tumu');

  // Sayfalama state'leri
  const [cbamPage, setCbamPage] = useState(1);
  const [certPage, setCertPage] = useState(1);
  const [reachPage, setReachPage] = useState(1);

  // Dinamik REACH verisi — sadece backend'den çekilir
  const [reachList, setReachList] = useState<{substance: string; cas: string; threshold: number; concentration: number; present: boolean}[]>([]);
  const [reachTotal, setReachTotal] = useState(0);
  const [reachLoading, setReachLoading] = useState(true);

  // Dinamik CBAM verisi — sadece backend'den çekilir
  const [cbamProducts, setCbamProducts] = useState<AdminProduct[]>([]);
  const [cbamLoading, setCbamLoading] = useState(true);

  useEffect(() => {
    fetchCbamData();
    fetchReachData();
  }, []);

  // Filtre değişince sertifika sayfasını sıfırla
  useEffect(() => {
    setCertPage(1);
  }, [certFilter]);

  const fetchCbamData = async () => {
    setCbamLoading(true);
    try {
      const response = await apiGetCbamStatus();
      if (response && response.data) {
        const mapped = response.data.map((item: any) => ({
          id: item.dpp_id ? String(item.dpp_id).slice(0, 8) : '—',
          product_name: item.name || item.product_name || 'Bilinmeyen Ürün',
          product_category: 'Structural Steel',
          co2_cradle_to_gate_kg: item.co2_value || 0,
          passport_status: 'Yayında' as const,
          version: '1.0',
          blockchain_timestamp: '',
        }));
        setCbamProducts(mapped);
      }
    } catch (err) {
      console.error('CBAM verileri alınamadı:', err);
    } finally {
      setCbamLoading(false);
    }
  };

  const fetchReachData = async () => {
    setReachLoading(true);
    try {
      const prods = await apiGetProducts();
      if (prods && prods.length > 0) {
        const report = await apiGetReachReport(prods[0].id);
        if (report && report.results && report.results.length > 0) {
          const mapped = report.results.map((r: any) => ({
            substance: r.substance,
            cas: r.cas,
            threshold: r.threshold_pct,
            concentration: r.detected_pct,
            present: r.detected_pct > 0,
          }));
          setReachList(mapped);
          setReachTotal(mapped.length);
        }
      }
    } catch (err) {
      console.error('REACH verileri alınamadı:', err);
    } finally {
      setReachLoading(false);
    }
  };

  // Sayfalama hesaplamaları
  const filteredCerts = CERT_ALERTS.filter(c => certFilter === 'tumu' || c.type === certFilter);
  const cbamTotalPages = Math.max(1, Math.ceil(cbamProducts.length / ITEMS_PER_PAGE));
  const certTotalPages = Math.max(1, Math.ceil(filteredCerts.length / ITEMS_PER_PAGE));

  const paginatedCbam = cbamProducts.slice((cbamPage - 1) * ITEMS_PER_PAGE, cbamPage * ITEMS_PER_PAGE);
  const paginatedCerts = filteredCerts.slice((certPage - 1) * ITEMS_PER_PAGE, certPage * ITEMS_PER_PAGE);

  // REACH sayfalama
  const warnings   = reachList.filter(s => s.concentration >= s.threshold);
  const nearLimit  = reachList.filter(s => s.concentration < s.threshold && s.concentration >= s.threshold * 0.7);
  const hasIssues  = warnings.length > 0 || nearLimit.length > 0;
  const reachDisplayList = hasIssues ? [...warnings, ...nearLimit] : reachList;
  const reachTotalPages = Math.max(1, Math.ceil(reachDisplayList.length / ITEMS_PER_PAGE));
  const paginatedReach = reachDisplayList.slice((reachPage - 1) * ITEMS_PER_PAGE, reachPage * ITEMS_PER_PAGE);

  // Sayfalama bileşeni
  const Pagination = ({ page, totalPages, onPrev, onNext, totalItems }: {
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    totalItems: number;
  }) => {
    if (totalItems <= ITEMS_PER_PAGE) return null;
    const start = (page - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(page * ITEMS_PER_PAGE, totalItems);
    return (
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-3">
        <span className="text-[10px] font-medium text-gray-400">
          {start}–{end} / {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            disabled={page <= 1}
            className="p-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={12} />
          </button>
          <span className="text-[10px] font-bold text-gray-600 px-1.5">
            {page}/{totalPages}
          </span>
          <button
            onClick={onNext}
            disabled={page >= totalPages}
            className="p-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* ── 3 KART YAN YANA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ─── KART 1: CBAM Emisyon Takibi ─── */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-50">
                <Flag size={13} className="text-red-500" />
              </div>
              CBAM Emisyon Limit
            </h2>
            <span className="bg-gray-50 text-gray-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-gray-100">
              Eşik: {CBAM_LIMIT} kg
            </span>
          </div>

          {/* Uyarı badge */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="bg-yellow-50 text-yellow-600 text-[8px] font-bold px-1.5 py-0.5 rounded border border-yellow-100">
              Uyarı: &gt; {(CBAM_LIMIT * 0.85).toFixed(2)} kg
            </span>
            <span className="text-[8px] font-medium text-gray-400">
              {cbamProducts.length} ürün
            </span>
          </div>

          <div className="space-y-2.5 flex-1">
            {cbamLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-[10px] text-blue-600 font-bold">
                  <Loader2 size={12} className="animate-spin" /> Yükleniyor...
                </div>
              </div>
            )}
            {!cbamLoading && cbamProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 size={20} className="text-green-400 mb-2" />
                <p className="text-[10px] text-gray-400 font-medium">Kayıt bulunamadı</p>
              </div>
            )}
            {paginatedCbam.map((p, i) => {
              const co2 = p.co2_cradle_to_gate_kg;
              const pct = Math.min((co2 / (CBAM_LIMIT * 1.5)) * 100, 100);
              const isOver = co2 > CBAM_LIMIT;
              const isWarn = co2 > CBAM_LIMIT * 0.85 && !isOver;
              return (
                <div key={i} className={`p-3 rounded-xl border transition-all hover:shadow-sm ${isOver ? 'bg-red-50 border-red-200' : isWarn ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50/50 border-green-100'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isOver ? <Flag size={11} className="text-red-600 shrink-0" /> : isWarn ? <AlertTriangle size={11} className="text-yellow-600 shrink-0" /> : <CheckCircle2 size={11} className="text-green-600 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-gray-900 truncate">{p.product_name}</p>
                        <span className="text-[8px] font-mono text-gray-400">{p.display_id || p.id}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black shrink-0 ml-1 ${isOver ? 'text-red-700' : isWarn ? 'text-yellow-700' : 'text-green-700'}`}>
                      {co2} kg
                    </span>
                  </div>
                  <div className="w-full bg-white/80 rounded-full h-1 border border-gray-100">
                    <div className={`h-1 rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : isWarn ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  {isOver && (
                    <p className="text-[8px] text-red-600 font-bold mt-1">
                      ⚠ Limiti {(co2 - CBAM_LIMIT).toFixed(2)} kg aşıyor
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <Pagination
            page={cbamPage}
            totalPages={cbamTotalPages}
            onPrev={() => setCbamPage(p => Math.max(1, p - 1))}
            onNext={() => setCbamPage(p => Math.min(cbamTotalPages, p + 1))}
            totalItems={cbamProducts.length}
          />
        </div>

        {/* ─── KART 2: Sertifika Geçerlilik Takibi ─── */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-50">
                <Calendar size={13} className="text-orange-500" />
              </div>
              Sertifika Takibi
            </h2>
          </div>

          {/* Filtre butonları */}
          <div className="flex items-center gap-0.5 bg-gray-50 rounded-lg p-0.5 mb-3">
            {([
              { key: 'tumu',     label: 'Tümü' },
              { key: 'firma',    label: 'Firma' },
              { key: 'urun-tipi', label: 'Ürün' },
              { key: 'batch',    label: 'Batch' },
            ] as { key: 'tumu' | CertType; label: string }[]).map(f => (
              <button
                key={f.key}
                onClick={() => setCertFilter(f.key)}
                className={`text-[9px] font-black px-2 py-1 rounded-md transition-all flex-1 ${
                  certFilter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Toplam + süresi dolmuş badge */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[8px] font-medium text-gray-400">
              {filteredCerts.length} sertifika
            </span>
            {filteredCerts.filter(c => c.days_left < 0).length > 0 && (
              <span className="bg-red-50 text-red-600 text-[8px] font-bold px-1.5 py-0.5 rounded border border-red-100">
                {filteredCerts.filter(c => c.days_left < 0).length} dolmuş
              </span>
            )}
          </div>

          <div className="space-y-2 flex-1">
            {paginatedCerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 size={20} className="text-green-400 mb-2" />
                <p className="text-[10px] text-gray-400 font-medium">Kayıt bulunamadı</p>
              </div>
            )}
            {paginatedCerts.map((c, i) => {
              const expired  = c.days_left < 0;
              const critical = !expired && c.days_left <= 10;
              const warn     = !expired && !critical && c.days_left <= 60;
              const TYPE_CFG = {
                'firma':     { label: 'Firma', cls: 'bg-purple-100 text-purple-700' },
                'urun-tipi': { label: 'Ürün',  cls: 'bg-blue-100 text-blue-700'     },
                'batch':     { label: 'Batch', cls: 'bg-gray-100 text-gray-600'     },
              } as const;
              return (
                <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-sm ${
                  expired  ? 'bg-red-50 border-red-200'      :
                  critical ? 'bg-orange-50 border-orange-200' :
                  warn     ? 'bg-yellow-50 border-yellow-200' :
                             'bg-white border-gray-100'
                }`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={`p-1 rounded-lg shrink-0 ${expired || critical ? 'bg-red-100' : warn ? 'bg-yellow-100' : 'bg-green-100'}`}>
                      <CheckCircle2 size={12} className={expired || critical ? 'text-red-600' : warn ? 'text-yellow-600' : 'text-green-600'} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                        <p className="text-[11px] font-black text-gray-900 truncate">{c.cert}</p>
                        <span className={`text-[7px] font-black px-1 py-0.5 rounded ${TYPE_CFG[c.type].cls}`}>
                          {TYPE_CFG[c.type].label}
                        </span>
                      </div>
                      <p className="text-[9px] text-gray-400 font-medium truncate">
                        {c.product} • {c.issuer}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-1">
                    <p className="text-[9px] font-mono text-gray-500 font-bold">{c.expiry}</p>
                    <p className={`text-[9px] font-black mt-0.5 ${expired ? 'text-red-700' : critical ? 'text-orange-700' : warn ? 'text-yellow-700' : 'text-green-700'}`}>
                      {expired ? `${Math.abs(c.days_left)} gün doldu` : `${c.days_left} gün`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={certPage}
            totalPages={certTotalPages}
            onPrev={() => setCertPage(p => Math.max(1, p - 1))}
            onNext={() => setCertPage(p => Math.min(certTotalPages, p + 1))}
            totalItems={filteredCerts.length}
          />
        </div>

        {/* ─── KART 3: ECHA SVHC / REACH ─── */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50">
                <ShieldAlert size={13} className="text-blue-600" />
              </div>
              REACH Uyumluluk
            </h2>
          </div>

          <p className="text-[9px] text-gray-400 font-medium mb-3">
            Son güncelleme: 2026-01-15 • {reachTotal} madde {reachLoading && <Loader2 size={10} className="inline animate-spin ml-1" />}
          </p>

          {/* Özet Banner */}
          <div className={`flex items-center gap-2.5 p-3 rounded-xl border mb-3 ${
            warnings.length > 0  ? 'bg-red-50 border-red-200'      :
            nearLimit.length > 0 ? 'bg-yellow-50 border-yellow-200' :
                                   'bg-green-50 border-green-100'
          }`}>
            <div className={`p-1.5 rounded-lg shrink-0 ${warnings.length > 0 ? 'bg-red-100' : nearLimit.length > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
              {warnings.length > 0
                ? <XCircle size={14} className="text-red-600" />
                : nearLimit.length > 0
                  ? <AlertTriangle size={14} className="text-yellow-600" />
                  : <CheckCircle2 size={14} className="text-green-600" />}
            </div>
            <div className="min-w-0">
              <p className={`text-[10px] font-black leading-tight ${warnings.length > 0 ? 'text-red-800' : nearLimit.length > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                {warnings.length > 0
                  ? `${warnings.length} madde eşiği aşıyor`
                  : nearLimit.length > 0
                    ? `${nearLimit.length} madde eşiğe yakın`
                    : 'Tüm maddeler uyumlu'}
              </p>
              <p className="text-[8px] text-gray-400 font-medium mt-0.5">
                REACH Madde 33 • Eşik: %0.1
              </p>
            </div>
            {!hasIssues && (
              <span className="text-[7px] font-black text-green-700 bg-green-100 px-1.5 py-0.5 rounded shrink-0 ml-auto">
                SCIP ✓
              </span>
            )}
          </div>

          {/* REACH Listesi */}
          <div className="space-y-2 flex-1">
            {reachLoading && (
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center gap-2 text-[10px] text-blue-600 font-bold">
                  <Loader2 size={12} className="animate-spin" /> Yükleniyor...
                </div>
              </div>
            )}
            {!reachLoading && reachDisplayList.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6">
                <CheckCircle2 size={20} className="text-green-400 mb-2" />
                <p className="text-[10px] text-gray-400 font-medium">Veri bulunamadı</p>
              </div>
            )}
            {!reachLoading && paginatedReach.map((s, i) => {
              const isOver = s.concentration >= s.threshold;
              const isNear = !isOver && s.concentration >= s.threshold * 0.7;
              return (
                <div key={i} className={`p-3 rounded-xl border transition-all hover:shadow-sm ${
                  isOver ? 'bg-red-50 border-red-200' :
                  isNear ? 'bg-yellow-50 border-yellow-200' :
                           'bg-green-50/50 border-green-100'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-bold text-gray-900 truncate">{s.substance}</p>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {isOver
                        ? <XCircle size={11} className="text-red-600" />
                        : isNear
                          ? <AlertTriangle size={11} className="text-yellow-600" />
                          : <CheckCircle2 size={11} className="text-green-600" />}
                      <span className={`text-[9px] font-black ${isOver ? 'text-red-700' : isNear ? 'text-yellow-700' : 'text-green-700'}`}>
                        {isOver ? 'Aşıldı' : isNear ? 'Yakın' : 'Uyumlu'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[8px] text-gray-400 font-medium">
                    <span>CAS {s.cas}</span>
                    <span>•</span>
                    <span>Eşik: %{s.threshold}</span>
                    <span>•</span>
                    <span className={isOver ? 'text-red-600 font-bold' : ''}>%{s.concentration.toFixed(3)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={reachPage}
            totalPages={reachTotalPages}
            onPrev={() => setReachPage(p => Math.max(1, p - 1))}
            onNext={() => setReachPage(p => Math.min(reachTotalPages, p + 1))}
            totalItems={reachDisplayList.length}
          />
        </div>
      </div>
    </div>
  );
}
