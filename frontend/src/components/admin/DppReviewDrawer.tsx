import { useState, useEffect } from 'react';
import {
  X, Factory, Ruler, FlaskConical, Award, GitBranch, Leaf, Building2,
  CheckCircle2, Shield, Loader2, XCircle, AlertCircle,
} from 'lucide-react';
import type { PendingBatch } from '../../types/admin';
import { REJECTABLE_FIELDS } from '../../constants/adminConstants';
import { apiGetDppById } from '../../lib/api';

// ─── BÖLÜM TANIMLARI ────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'batch',          label: 'Batch',        icon: Factory      },
  { id: 'technical',      label: 'Teknik',        icon: Ruler        },
  { id: 'chemical',       label: 'Kimyasal',      icon: FlaskConical },
  { id: 'certs',          label: 'Sertifikalar',  icon: Award        },
  { id: 'supply',         label: 'Tedarik',       icon: GitBranch    },
  { id: 'sustain',        label: 'Sürdürülebilir',icon: Leaf         },
  { id: 'manufacturer',   label: 'Üretici',       icon: Building2    },
] as const;

// ─── SALT OKUNUR ALAN ────────────────────────────────────────────────────────
function RO({
  label, value, mono = false, colSpan2 = false,
}: {
  label: string; value?: string | null; mono?: boolean; colSpan2?: boolean;
}) {
  return (
    <div className={colSpan2 ? 'col-span-2' : ''}>
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-sm">
        <p className={`text-sm font-bold text-gray-900 break-words ${mono ? 'font-mono' : ''}`}>
          {value || <span className="text-gray-400 font-normal italic">—</span>}
        </p>
      </div>
    </div>
  );
}

// ─── BÖLÜM AYIRICI ───────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px bg-gray-200 flex-1" />
      <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <div className="h-px bg-gray-200 flex-1" />
    </div>
  );
}

// ─── ANA BİLEŞEN ────────────────────────────────────────────────────────────
interface Props {
  batch: PendingBatch;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string, fields: string[]) => void;
}

export default function DppReviewDrawer({ batch, onClose, onApprove, onReject }: Props) {
  const [activeSec, setActiveSec] = useState(0);
  const [dppData, setDppData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectFields, setRejectFields] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    apiGetDppById(batch.id)
      .then(setDppData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [batch.id]);

  const d = dppData;

  const changeSection = (i: number) => {
    setActiveSec(i);
    setRejectOpen(false);
    setRejectReason('');
    setRejectFields([]);
  };

  return (
    <>
      {/* Arka plan */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Merkezi modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl h-[88vh] flex flex-col overflow-hidden">

          {/* ── HEADER ── */}
          <div className="px-6 pt-5 pb-0 shrink-0">
            {/* Üst satır: ikon + başlık + kapat */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
                  <Shield size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 leading-tight">
                    DPP İnceleme
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                      {batch.parti_no}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500">{batch.urun_tipi}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Onay Bekliyor
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Section pill nav */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-none">
              {SECTIONS.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === activeSec;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => changeSection(i)}
                    className={`
                      relative flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold whitespace-nowrap
                      transition-all rounded-t-xl border-b-2
                      ${isActive
                        ? 'text-blue-600 border-blue-600 bg-blue-50/60'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon size={12} />
                    {s.label}
                  </button>
                );
              })}
            </div>
            <div className="h-px bg-gray-100 -mx-6" />
          </div>

          {/* ── İÇERİK ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-gray-50/60">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 size={22} className="text-blue-400 animate-spin" />
                <span className="ml-3 text-sm text-gray-400 font-medium">Yükleniyor…</span>
              </div>
            ) : !d ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <AlertCircle size={22} className="text-red-400" />
                <p className="text-sm text-gray-400 font-medium">Veri yüklenemedi.</p>
              </div>
            ) : (
              <>
                {/* ══ BATCH BİLGİSİ ══ */}
                {activeSec === 0 && (
                  <div className="space-y-4">
                    <Divider label="Batch Kimliği" />
                    <div className="grid grid-cols-2 gap-3">
                      <RO label="Parti Numarası"       value={d.parti_no || batch.parti_no} mono />
                      <RO label="Tedarikçi Parti Kodu" value={d.tedarikci_parti_kodu} mono />
                    </div>

                    <Divider label="Ürün Bilgisi" />
                    <div className="grid grid-cols-2 gap-3">
                      <RO label="Ürün Kodu"   value={d.urun_no}               mono />
                      <RO label="Ürün Tipi"   value={d.urun_tipi || batch.urun_tipi} />
                      <RO label="GTIN"        value={d.gtin}                  mono />
                      <RO label="HS Code (GTİP)" value={d.hs_code}            mono />
                    </div>

                    <Divider label="Üretim Bilgisi" />
                    <div className="grid grid-cols-2 gap-3">
                      <RO label="Ocak / Fırın No" value={d.ocak_no}                                mono />
                      <RO label="Üretim Tarihi"   value={d.uretim_tarihi} />
                      <RO label="Miktar"          value={d.miktar_ton ? `${d.miktar_ton} ton` : null} />
                      <RO label="Üretim Rotası"   value={d.production_route} />
                    </div>
                  </div>
                )}

                {/* ══ TEKNİK BİLGİLER ══ */}
                {activeSec === 1 && (
                  <div className="space-y-4">
                    <Divider label="Ürün Özellikleri (Katalogdan)" />
                    <div className="grid grid-cols-3 gap-3">
                      <RO label="Malzeme Standardı" value={d.material_standard} />
                      <RO label="Çelik Kalitesi"    value={d.celik_kalitesi} />
                      <RO label="En (mm)"           value={d.en_mm}       mono />
                      <RO label="Et Kalınlığı (mm)" value={d.kalinlik_mm} mono />
                      <RO label="Ağırlık (kg/m)"    value={d.agirlik_m}   mono />
                    </div>
                    <Divider label="Bu Batch'e Özel" />
                    <div className="grid grid-cols-2 gap-3">
                      <RO label="Boy / Uzunluk" value={d.boy_mm ? `${d.boy_mm} mm` : null} mono />
                    </div>
                  </div>
                )}

                {/* ══ KİMYASAL & MEKANİK ══ */}
                {activeSec === 2 && (
                  <div className="space-y-4">
                    <Divider label="Kimyasal Kompozisyon (Alaşım Oranları %)" />
                    <div className="grid grid-cols-3 gap-3">
                      <RO label="C (Karbon)"    value={d.c_pct  ? `${d.c_pct}%`  : null} mono />
                      <RO label="Mn (Manganez)" value={d.mn_pct ? `${d.mn_pct}%` : null} mono />
                      <RO label="Si (Silisyum)" value={d.si_pct ? `${d.si_pct}%` : null} mono />
                      <RO label="P (Fosfor)"    value={d.p_pct  ? `${d.p_pct}%`  : null} mono />
                      <RO label="S (Kükürt)"    value={d.s_pct  ? `${d.s_pct}%`  : null} mono />
                      <RO label="N (Azot)"      value={d.n_pct  ? `${d.n_pct}%`  : null} mono />
                    </div>

                    {(d.c_pct || d.mn_pct || d.si_pct) && (
                      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          Fe (Demir) %
                        </span>
                        <span className="text-sm font-black text-gray-900 font-mono ml-auto">
                          {(
                            100 -
                            [d.c_pct, d.mn_pct, d.si_pct, d.p_pct, d.s_pct, d.n_pct].reduce(
                              (a: number, v: string) => a + (parseFloat(v) || 0), 0
                            )
                          ).toFixed(3)}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">hesaplanmış</span>
                      </div>
                    )}

                    <Divider label="Mekanik Özellikler (Dayanım Testleri)" />
                    <div className="grid grid-cols-3 gap-3">
                      <RO label="Akma Dayanımı"  value={d.yield_mpa       ? `${d.yield_mpa} MPa`       : null} mono />
                      <RO label="Çekme Dayanımı" value={d.tensile_mpa     ? `${d.tensile_mpa} MPa`     : null} mono />
                      <RO label="Uzama Oranı"    value={d.elongation_pct  ? `${d.elongation_pct}%`     : null} mono />
                      <RO label="Darbe Enerjisi" value={d.impact_energy_j ? `${d.impact_energy_j} J`   : null} mono />
                      <RO label="Test Sıcaklığı" value={d.impact_temp_c   ? `${d.impact_temp_c}°C`     : null} mono />
                    </div>
                  </div>
                )}

                {/* ══ SERTİFİKALAR ══ */}
                {activeSec === 3 && (
                  <div className="space-y-4">
                    <Divider label="Genel Sertifikalar (Fabrika Geneli)" />
                    <div className="space-y-2">
                      {[
                        { name: 'ISO 9001:2015',  issuer: 'TÜV NORD', expiry: '2026-06-15', scope: 'Kalite Yönetim Sistemi' },
                        { name: 'ISO 14001:2015', issuer: 'TÜV SÜD',  expiry: '2026-06-15', scope: 'Çevre Yönetim Sistemi' },
                        { name: 'EN 1090-1+A1',   issuer: 'TSE',      expiry: '2027-01-10', scope: 'Yapısal Çelik Üretim Yetkinliği' },
                      ].map((c) => (
                        <div
                          key={c.name}
                          className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm"
                        >
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                            <div>
                              <p className="text-sm font-black text-gray-900">{c.name}</p>
                              <p className="text-[11px] text-gray-500 font-medium">
                                {c.scope} — {c.issuer}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-gray-600 shrink-0">
                            Geçerlilik: {c.expiry}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Divider label="Bu Batch'e Özel Sertifikalar" />
                    {d.certifications?.length > 0 ? (
                      <div className="space-y-3">
                        {d.certifications.map((cert: any, i: number) => (
                          <div key={i} className="border border-blue-100 bg-blue-50/30 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <Award size={14} className="text-blue-600" />
                              <span className="text-sm font-black text-gray-900">{cert.cert_type || '—'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <RO label="Sertifika No"      value={cert.cert_no}     mono />
                              <RO label="Veren Kuruluş"     value={cert.issuer} />
                              <RO label="Düzenlenme Tarihi" value={cert.issue_date} />
                              <RO label="Geçerlilik Tarihi" value={cert.expiry_date} />
                              {cert.test_standard && (
                                <RO label="Test Standardı" value={cert.test_standard} colSpan2 />
                              )}
                            </div>
                            {cert.file_name && (
                              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                <Shield size={12} /> {cert.file_name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic font-medium">
                        Bu batch'e özel sertifika bulunmuyor.
                      </p>
                    )}
                  </div>
                )}

                {/* ══ TEDARİK ZİNCİRİ ══ */}
                {activeSec === 4 && (
                  <div className="space-y-4">
                    <Divider label="Tedarik Zinciri ve İzlenebilirlik" />
                    {d.supply_chain?.length > 0 ? (
                      d.supply_chain.map((stage: any, idx: number) => (
                        <div
                          key={idx}
                          className={`border rounded-2xl p-4 space-y-3
                            ${idx === 0
                              ? 'border-orange-200 bg-orange-50/30'
                              : idx === 1
                              ? 'border-blue-200 bg-blue-50/30'
                              : 'border-gray-200 bg-gray-50'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-black px-2.5 py-1 rounded-lg
                                ${idx === 0 ? 'text-orange-600 bg-orange-100'
                                  : idx === 1 ? 'text-blue-600 bg-blue-100'
                                  : 'text-gray-500 bg-gray-100'
                                }`}
                              >
                                ADIM {stage.sequence ?? idx + 1}
                              </span>
                              <span className="text-sm font-black text-gray-900">{stage.stage_name}</span>
                            </div>
                            {idx === 0 && (
                              <span className="text-[10px] font-bold text-orange-500 bg-orange-100 px-2 py-0.5 rounded">
                                Tedarikçiden
                              </span>
                            )}
                            {idx === 1 && (
                              <span className="text-[10px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded">
                                Batch Bilgilerinden
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <RO label="Organizasyon"  value={stage.organization} />
                            <RO label="Rol"           value={stage.role} />
                            <RO label="Lokasyon"      value={stage.location} />
                            <RO label="Tarih"         value={stage.date} />
                            {stage.material        && <RO label="Malzeme"     value={stage.material} />}
                            {stage.material_origin && <RO label="Menşei Ülke" value={stage.material_origin} />}
                            {stage.quantity        && (
                              <RO label="Miktar" value={`${stage.quantity} ${stage.unit || 'ton'}`} mono />
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 italic font-medium">
                        Tedarik zinciri bilgisi girilmemiş.
                      </p>
                    )}
                  </div>
                )}

                {/* ══ SÜRDÜRÜLEBİLİRLİK ══ */}
                {activeSec === 5 && (
                  <div className="space-y-4">
                    <Divider label="Karbon Ayak İzi (EN 15804+A2)" />
                    {/* A1-A3 görsel bar */}
                    <div className="rounded-xl overflow-hidden border border-gray-200 text-xs font-bold">
                      <div className="flex">
                        {['A1 Hammadde', 'A2 Nakliye', 'A3 Üretim'].map((l) => (
                          <div
                            key={l}
                            className="flex-1 bg-blue-600 text-white px-3 py-2 text-center border-r border-blue-500 last:border-0"
                          >
                            <div className="font-black">{l.split(' ')[0]}</div>
                            <div className="font-normal opacity-80 text-[10px] mt-0.5">
                              {l.split(' ').slice(1).join(' ')}
                            </div>
                          </div>
                        ))}
                        <div className="flex-1 bg-gray-100 text-gray-400 px-3 py-2 text-center">
                          <div>A4</div>
                          <div className="font-normal text-[10px] mt-0.5">Sevkiyat</div>
                        </div>
                      </div>
                      <div className="flex text-[10px]">
                        <div className="flex-[3] bg-blue-50 text-blue-700 px-3 py-1 border-r border-blue-200 font-black tracking-wide text-center">
                          ← A1–A3 ZORUNLU (ESPR / CBAM) →
                        </div>
                        <div className="flex-1 bg-gray-50 text-gray-400 px-3 py-1 text-center">
                          İsteğe Bağlı
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <RO label="A1–A3 Toplam"     value={d.co2_a1a3 ? `${d.co2_a1a3} kg CO₂e/kg` : null} mono />
                      <RO label="Doğrulama Durumu" value={d.co2_verification} />
                      <RO label="A3 Sadece Üretim" value={d.co2_a3   ? `${d.co2_a3} kg CO₂e/kg`   : null} mono />
                      <RO label="A4 Sevkiyat"      value={d.co2_a4   ? `${d.co2_a4} kg CO₂e/kg`   : null} mono />
                    </div>

                    <Divider label="EPD — Çevre Ürün Beyanı" />
                    <div className="grid grid-cols-2 gap-3">
                      <RO label="EPD Belge Numarası" value={d.epd_cert_no || d.epd_no} mono />
                      <RO label="Geçerlilik Tarihi"  value={d.epd_valid_until} />
                      <RO label="EPD URL"            value={d.epd_url} colSpan2 />
                    </div>

                    <Divider label="Döngüsel Ekonomi Göstergeleri" />
                    <div className="grid grid-cols-2 gap-3">
                      <RO
                        label="Geri Dönüştürülmüş İçerik"
                        value={
                          (d.geri_donusum_orani || d.recycled_content_pct)
                            ? `${d.geri_donusum_orani ?? d.recycled_content_pct}%`
                            : null
                        }
                        mono
                      />
                      <RO
                        label="Geri Dönüştürülebilirlik"
                        value={d.recyclability_pct ? `${d.recyclability_pct}%` : null}
                        mono
                      />
                    </div>

                    <Divider label="Malzeme Uyum Beyanları (REACH / RoHS)" />
                    <div
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border
                        ${d.svhc_free ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}
                    >
                      <CheckCircle2
                        size={15}
                        className={d.svhc_free ? 'text-green-500' : 'text-gray-300'}
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-900">SVHC İçermez</p>
                        <p className="text-[11px] text-gray-500">
                          REACH Tüzüğü — Çok Yüksek Endişe Veren Madde yok
                        </p>
                      </div>
                      <span
                        className={`ml-auto text-[11px] font-black px-2 py-0.5 rounded-full
                          ${d.svhc_free ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                      >
                        {d.svhc_free ? 'Evet' : 'Hayır'}
                      </span>
                    </div>

                    <Divider label="Ömür Sonu ve İmha" />
                    <div className="grid grid-cols-2 gap-3">
                      <RO label="Söküm Zorluğu"       value={d.eol_disassembly || d.dismantling_difficulty} />
                      <RO
                        label="İmha / Geri Dönüşüm Talimatı"
                        value={d.eol_disposal || d.disposal_instructions}
                        colSpan2
                      />
                    </div>
                  </div>
                )}

                {/* ══ ÜRETİCİ & TESİS ══ */}
                {activeSec === 6 && (
                  <div className="space-y-4">
                    <Divider label="Üretici Firma Bilgileri" />
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Üretici Adı',    value: d.uretici_adi       || 'Kocaer Çelik A.Ş.'          },
                        { label: 'Vergi Numarası', value: d.uretici_vergi_no  || 'TR1234567890'                 },
                        { label: 'Website',        value: d.uretici_website   || 'www.kocaersteel.com'          },
                        { label: 'DPP E-postası',  value: d.uretici_email     || 'dpp@kocaersteel.com'          },
                        { label: 'EORI Numarası',  value: 'TR12345678900000'                                    },
                        { label: 'Adres',          value: d.uretici_adres     || 'Aliağa OSB, 35800 İzmir, TR'  },
                      ].map(({ label, value }) => (
                        <RO key={label} label={label} value={value} />
                      ))}
                    </div>

                    <Divider label="Üretim Tesisi Bilgileri" />
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Tesis Adı',  value: d.tesis_adi    || 'Aliağa Üretim Tesisi'            },
                        { label: 'Tesis Kodu', value: 'KCR-ALA-01'                                        },
                        { label: 'Ülke',       value: d.tesis_ulkesi || 'Türkiye'                         },
                        { label: 'GLN Kodu',   value: d.tesis_gln    || '8690000000001'                   },
                        { label: 'Koordinat',  value: '38.8008° K, 26.9719° D'                            },
                        { label: 'Adres',      value: d.tesis_adres  || 'Aliağa OSB No:12, 35800 İzmir'   },
                      ].map(({ label, value }) => (
                        <RO key={label} label={label} value={value} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── FOOTER — sticky onay/red ── */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white shrink-0">
            {!rejectOpen ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { onApprove(batch.id); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-green-100"
                >
                  <CheckCircle2 size={15} /> Onayla
                </button>
                <button
                  type="button"
                  onClick={() => setRejectOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 text-sm font-bold rounded-xl transition-colors"
                >
                  <XCircle size={15} /> Reddet
                </button>
              </div>
            ) : (
              /* ── Reddetme formu — aynı UI ── */
              <div className="space-y-3 bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-xs font-black text-red-700 uppercase tracking-wider">
                  Hatalı Alanları İşaretle
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {REJECTABLE_FIELDS.map((f) => (
                    <label
                      key={f.key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs font-bold transition-colors
                        ${rejectFields.includes(f.key)
                          ? 'bg-red-100 border-red-400 text-red-800'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={rejectFields.includes(f.key)}
                        onChange={() =>
                          setRejectFields((prev) =>
                            prev.includes(f.key)
                              ? prev.filter((k) => k !== f.key)
                              : [...prev, f.key]
                          )
                        }
                        className="accent-red-600"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Red gerekçesini yazın... (zorunlu)"
                  rows={2}
                  className="w-full px-3 py-2 border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!rejectReason.trim()}
                    onClick={() => {
                      if (!rejectReason.trim()) return;
                      onReject(batch.id, rejectReason, rejectFields);
                      onClose();
                    }}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
                  >
                    Reddet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectOpen(false);
                      setRejectReason('');
                      setRejectFields([]);
                    }}
                    className="px-4 py-1.5 border border-gray-200 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-lg transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
