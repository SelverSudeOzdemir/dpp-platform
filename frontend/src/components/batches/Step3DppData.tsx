import { useState } from 'react';
import { CheckCircle2, AlertCircle, Award, Trash2, Plus, Upload } from 'lucide-react';
import { Field, SelectField, SectionTitle } from './BatchFormFields';
import { DppSubStepper } from './DppSubStepper';
import { URUN_KATALOGU, CO2_VERIFICATION_OPTIONS, DISMANTLING_OPTIONS } from '../../constants/batchConstants';
import type { DppData, BatchInfo, Certification, SupplyStage } from '../../types/batch';

export default function Step3DppData({ data, onChange, batchInfo, erpImported }: {
  data: DppData;
  onChange: (d: DppData) => void;
  batchInfo: BatchInfo;
  erpImported: boolean;
}) {
  const [sub, setSub] = useState(0);
  const katalog = URUN_KATALOGU.find(u => u.urun_no === batchInfo.urun_no);
  const InfoCard = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-black text-gray-700 font-mono">{value || '—'}</p>
    </div>
  );

  const set = (field: keyof DppData) => (v: string) => onChange({ ...data, [field]: v });
  const setB = (field: keyof DppData) => (v: boolean) => onChange({ ...data, [field]: v });

  // Sertifika yönetimi
  const addCert = () => onChange({ ...data, certifications: [...data.certifications, { id: Date.now(), cert_type: '', issuer: '', cert_no: '', issue_date: '', expiry_date: '', file_name: '' }] });
  const removeCert = (id: number) => onChange({ ...data, certifications: data.certifications.filter(c => c.id !== id) });
  const setCert = (id: number, field: keyof Certification, v: string) =>
    onChange({ ...data, certifications: data.certifications.map(c => c.id === id ? { ...c, [field]: v } : c) });

  // Tedarik zinciri yönetimi
  const addStage = () => onChange({ ...data, supply_chain: [...data.supply_chain, { id: Date.now(), stage_name: '', organization: '', role: '', location: '', material_origin: '', process: '', material: '', quantity: '', unit: 'ton', date: '' }] });
  const removeStage = (id: number) => onChange({ ...data, supply_chain: data.supply_chain.filter(s => s.id !== id) });
  const setStage = (id: number, field: keyof SupplyStage, v: string) =>
    onChange({ ...data, supply_chain: data.supply_chain.map(s => s.id === id ? { ...s, [field]: v } : s) });
  // ADIM 1'e ilk yazıldığında supply_chain[0]'ı otomatik oluştur
  const setStage1 = (field: keyof SupplyStage, v: string) => {
    if (data.supply_chain.length === 0) {
      onChange({ ...data, supply_chain: [{ id: Date.now(), stage_name: 'Hammadde Tedariki', organization: '', role: '', location: '', material_origin: '', process: '', material: '', quantity: '', unit: 'ton', date: '', [field]: v }] });
    } else {
      setStage(data.supply_chain[0].id, field, v);
    }
  };

  return (
    <div>
      {erpImported && (
        <div className="flex items-center gap-2 mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 size={15} className="text-green-600 shrink-0" />
          <p className="text-sm font-bold text-green-800">
            SAP&apos;tan aktarıldı — alanlar otomatik dolduruldu. Eksik veya yanlış bilgileri düzenleyebilirsiniz.
          </p>
        </div>
      )}
      <DppSubStepper current={sub} onGoTo={setSub} />

      {/* SUB 0: TEKNİK BİLGİLER */}
      {sub === 0 && (
        <div className="space-y-6">
          {/* Katalogdan gelen — okunur */}
          <div>
            <SectionTitle label="Ürün Özellikleri (Katalogdan)" />
            {!katalog && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 font-medium">
                Adım 1'de ürün kodu seçilmedi. Geri dönerek ürün seçin.
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <InfoCard label="GTIN" value={katalog?.gtin ?? ''} />
              <InfoCard label="Malzeme Standardı" value={katalog?.malzeme_standard ?? ''} />
              <InfoCard label="Çelik Kalitesi" value={katalog?.celik_kalitesi ?? ''} />
              <InfoCard label="En (mm)" value={katalog?.en_mm ?? ''} />
              <InfoCard label="Ağırlık (kg/m)" value={katalog?.agirlik_m ?? ''} />
              <InfoCard label="Et Kalınlığı (mm)" value={katalog?.kalinlik_mm ?? ''} />
            </div>
          </div>

          {/* Batch'e özel — düzenlenebilir */}
          <div>
            <SectionTitle label="Bu Batch'e Özel" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Boy / Uzunluk"
                value={data.boy_mm}
                onChange={set('boy_mm')}
                type="number"
                placeholder="6000"
                hint="Standart: 6000, 9000, 12000 mm"
                suffix="mm"
                required
              />
            </div>
          </div>

          </div>
      )}

      {/* SUB 1: KİMYASAL & MEKANİK */}
      {sub === 1 && (
        <div className="space-y-5">
          <SectionTitle label="Kimyasal Kompozisyon (Alaşım Oranları %)" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'C (Karbon)',    name: 'c_pct',  placeholder: '0.19', hint: 'Maks. %0.24' },
              { label: 'Mn (Manganez)', name: 'mn_pct', placeholder: '1.45', hint: 'Maks. %1.60' },
              { label: 'Si (Silisyum)', name: 'si_pct', placeholder: '0.30', hint: 'Maks. %0.55' },
              { label: 'P (Fosfor)',    name: 'p_pct',  placeholder: '0.022', hint: 'Maks. %0.030' },
              { label: 'S (Kükürt)',    name: 's_pct',  placeholder: '0.018', hint: 'Maks. %0.030' },
              { label: 'N (Azot)',      name: 'n_pct',  placeholder: '0.009', hint: 'Maks. %0.012' },
            ].map(f => (
              <Field key={f.name} label={f.label} name={f.name}
                value={(data as any)[f.name]} onChange={set(f.name as keyof DppData)}
                type="number" placeholder={f.placeholder} hint={f.hint} suffix="%" />
            ))}
          </div>
          {/* Fe hesaplanmış göster */}
          {(data.c_pct || data.mn_pct || data.si_pct) && (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Fe (Demir) %</span>
              <span className="text-sm font-black text-gray-700 font-mono ml-auto">
                {(100 - [data.c_pct, data.mn_pct, data.si_pct, data.p_pct, data.s_pct, data.n_pct]
                  .reduce((acc, v) => acc + (parseFloat(v) || 0), 0)).toFixed(3)}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">hesaplanmış</span>
            </div>
          )}
          <SectionTitle label="Mekanik Özellikler (Dayanım Testleri)" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Akma Dayanımı" value={data.yield_mpa}
              onChange={set('yield_mpa')} type="number" placeholder="370"
              suffix="MPa" hint="Min. standart: 355 MPa (S355JR)" />
            <Field label="Çekme Dayanımı" value={data.tensile_mpa}
              onChange={set('tensile_mpa')} type="number" placeholder="530"
              suffix="MPa" hint="470–630 MPa (S355JR)" />
            <Field label="Uzama Oranı" value={data.elongation_pct}
              onChange={set('elongation_pct')} type="number" placeholder="24"
              suffix="%" hint="Min. standart: %22" />
            <Field label="Darbe Enerjisi" value={data.impact_energy_j}
              onChange={set('impact_energy_j')} type="number" placeholder="27"
              suffix="J" hint="Charpy — Min. 27J (S355JR)" />
            <Field label="Test Sıcaklığı" value={data.impact_temp_c}
              onChange={set('impact_temp_c')} type="number" placeholder="20"
              suffix="°C" hint="JR: +20°C / J0: 0°C / J2: -20°C" />
          </div>
          </div>
      )}

      {/* SUB 2: SERTİFİKALAR */}
      {sub === 2 && (
        <div className="space-y-6">

          {/* GENEL SERTİFİKALAR — fabrika geneli, salt okunur */}
          <div>
            <SectionTitle label="Genel Sertifikalar (Fabrika Geneli)" />
            <div className="space-y-2">
              {[
                { name: 'ISO 9001:2015',  issuer: 'TÜV NORD',  expiry: '2026-06-15', scope: 'Kalite Yönetim Sistemi' },
                { name: 'ISO 14001:2015', issuer: 'TÜV SÜD',   expiry: '2026-06-15', scope: 'Çevre Yönetim Sistemi' },
                { name: 'EN 1090-1+A1',   issuer: 'TSE',        expiry: '2027-01-10', scope: 'Yapısal Çelik Üretim Yetkinliği' },
              ].map((c) => (
                <div key={c.name} className="flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-gray-800">{c.name}</p>
                      <p className="text-[11px] text-gray-400 font-medium">{c.scope} — {c.issuer}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-gray-400 shrink-0">Geçerlilik: {c.expiry}</span>
                </div>
              ))}
            </div>
          </div>

          {/* BATCH'E ÖZEL SERTİFİKALAR — her batch için ayrı */}
          <div>
            <SectionTitle label="Bu Batch'e Özel Sertifikalar" />
            <div className="space-y-4">
              {data.certifications.map((cert) => (
                <div key={cert.id} className="border border-blue-100 bg-blue-50/30 rounded-2xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Award size={16} className="text-blue-600" />
                      <SelectField label="" value={cert.cert_type}
                        onChange={(v) => setCert(cert.id, 'cert_type', v)}
                        options={['EN 10204 Tip 3.1', 'EN 10204 Tip 3.2', 'CE Marking', 'EPD Belgesi']}
                        required />
                    </div>
                    <button type="button" onClick={() => removeCert(cert.id)}
                      className="text-red-400 hover:text-red-600 transition-colors ml-2 shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Sertifika Numarası" value={cert.cert_no}
                      onChange={(v) => setCert(cert.id, 'cert_no', v)}
                      placeholder="3.1-20260312-003" required />
                    <Field label="Veren Kuruluş" value={cert.issuer}
                      onChange={(v) => setCert(cert.id, 'issuer', v)}
                      placeholder="Kocaer Kalite Dep., TÜV..." />
                    <Field label="Düzenlenme Tarihi" value={cert.issue_date}
                      onChange={(v) => setCert(cert.id, 'issue_date', v)}
                      type="date" required />
                    <Field label="Geçerlilik Tarihi" value={cert.expiry_date}
                      onChange={(v) => setCert(cert.id, 'expiry_date', v)}
                      type="date" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      Sertifika PDF <span className="text-red-500">*</span>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-blue-200 rounded-xl bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                      <Upload size={16} className={cert.file_name ? 'text-green-500' : 'text-gray-400'} />
                      <span className={`text-sm font-medium ${cert.file_name ? 'text-green-700' : 'text-gray-500'}`}>
                        {cert.file_name || 'Bu batch\'e ait sertifika PDF\'ini yükleyin'}
                      </span>
                      <input type="file" accept=".pdf" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) setCert(cert.id, 'file_name', f.name); }} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addCert}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-bold text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <Plus size={16} /> Sertifika Ekle
            </button>
          </div>

          </div>
      )}

      {/* SUB 3: TEDARİK ZİNCİRİ */}
      {sub === 3 && (
        <div className="space-y-4">
          <SectionTitle label="Tedarik Zinciri ve İzlenebilirlik" />

          {/* ADIM 1 — HAMMADDEDEDİKİ (tedarikçi) — yarı dolu, düzenlenebilir */}
          <div className="border border-orange-200 bg-orange-50/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-orange-600 bg-orange-100 px-2.5 py-1 rounded-lg">ADIM 1</span>
                <span className="text-sm font-black text-gray-700">Hammadde Tedariki</span>
              </div>
              <span className="text-[10px] font-bold text-orange-500 bg-orange-100 px-2 py-0.5 rounded">Tedarikçiden</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Tedarikçi Adı" value={data.supply_chain[0]?.organization ?? ''}
                onChange={(v) => setStage1('organization', v)}
                placeholder="Erdemir A.Ş." required />
              <Field label="Rol" value={data.supply_chain[0]?.role ?? ''}
                onChange={(v) => setStage1('role', v)}
                placeholder="Hammadde Tedarikçisi" />
              <Field label="Lokasyon" value={data.supply_chain[0]?.location ?? ''}
                onChange={(v) => setStage1('location', v)}
                placeholder="Ereğli, Zonguldak" />
              <Field label="Tedarik Tarihi" value={data.supply_chain[0]?.date ?? ''}
                onChange={(v) => setStage1('date', v)}
                type="date" />
              <Field label="Malzeme" value={data.supply_chain[0]?.material ?? ''}
                onChange={(v) => setStage1('material', v)}
                placeholder="Çelik Billet" />
              <Field label="Menşei Ülke" value={data.supply_chain[0]?.material_origin ?? ''}
                onChange={(v) => setStage1('material_origin', v)}
                placeholder="Türkiye" />
              <Field label="Miktar" value={data.supply_chain[0]?.quantity ?? ''}
                onChange={(v) => setStage1('quantity', v)}
                type="number" placeholder="50"
                hint="Bu batch için kullanılan hammadde miktarı" />
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Birim</label>
                <select value={data.supply_chain[0]?.unit ?? 'ton'}
                  onChange={(e) => setStage1('unit', e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="ton">ton</option>
                  <option value="kg">kg</option>
                  <option value="adet">adet</option>
                </select>
              </div>
            </div>
            {batchInfo.tedarikci_parti_kodu && (
              <div className="flex items-center gap-2 bg-orange-100/60 border border-orange-200 rounded-lg px-3 py-2">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Tedarikçi Parti Kodu:</span>
                <span className="text-sm font-mono font-black text-orange-800">{batchInfo.tedarikci_parti_kodu}</span>
                <span className="text-[10px] text-orange-400 ml-1">Batch Bilgilerinden</span>
              </div>
            )}
          </div>

          {/* ADIM 2 — ÜRETİM (Kocaer) — batch bilgilerinden otomatik, salt okunur */}
          <div className="border border-blue-200 bg-blue-50/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-blue-600 bg-blue-100 px-2.5 py-1 rounded-lg">ADIM 2</span>
                <span className="text-sm font-black text-gray-700">Üretim</span>
              </div>
              <span className="text-[10px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded">Batch Bilgilerinden</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Üretici',    value: 'Kocaer Çelik A.Ş.' },
                { label: 'Rol',        value: 'Üretici' },
                { label: 'Tesis',      value: 'Aliağa Üretim Tesisi' },
                { label: 'Lokasyon',   value: 'Aliağa, İzmir, Türkiye' },
                { label: 'Üretim Tarihi', value: batchInfo.uretim_tarihi || '—' },
                { label: 'Ocak No',    value: batchInfo.ocak_no || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-blue-100 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                  <p className="text-sm font-black text-gray-700">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* EK AŞAMALAR — opsiyonel */}
          {data.supply_chain.slice(1).map((stage, idx) => (
            <div key={stage.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">ADIM {idx + 3}</span>
                <button type="button" onClick={() => removeStage(stage.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Aşama Adı" value={stage.stage_name}
                  onChange={(v) => setStage(stage.id, 'stage_name', v)} placeholder="Nakliye, Müşteri Teslimatı..." />
                <Field label="Organizasyon" value={stage.organization}
                  onChange={(v) => setStage(stage.id, 'organization', v)} placeholder="Nakliye firması..." />
                <Field label="Rol" value={stage.role}
                  onChange={(v) => setStage(stage.id, 'role', v)} placeholder="Taşıyıcı, Müşteri..." />
                <Field label="Lokasyon" value={stage.location}
                  onChange={(v) => setStage(stage.id, 'location', v)} placeholder="İstanbul, Türkiye" />
                <Field label="Tarih" value={stage.date}
                  onChange={(v) => setStage(stage.id, 'date', v)} type="date" />
                <Field label="Menşei Ülke" value={stage.material_origin}
                  onChange={(v) => setStage(stage.id, 'material_origin', v)} placeholder="Türkiye" />
                <Field label="Miktar" value={stage.quantity}
                  onChange={(v) => setStage(stage.id, 'quantity', v)}
                  type="number" placeholder="50" />
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Birim</label>
                  <select value={stage.unit}
                    onChange={(e) => setStage(stage.id, 'unit', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="ton">ton</option>
                    <option value="kg">kg</option>
                    <option value="adet">adet</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={() => {
            if (data.supply_chain.length === 0) {
              onChange({ ...data, supply_chain: [{ id: Date.now(), stage_name: 'Hammadde Tedariki', organization: '', role: '', location: '', material_origin: '', process: '', material: '', quantity: '', unit: 'ton', date: '' }] });
            } else {
              addStage();
            }
          }}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-bold text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <Plus size={16} /> Ek Aşama Ekle (Opsiyonel)
          </button>

          </div>
      )}

      {/* SUB 4: SÜRDÜRÜLEBİLİRLİK & ÖMÜR SONU */}
      {sub === 4 && (
        <div className="space-y-5">
          {/* ── KARBON AYAK İZİ (EN 15804+A2) ── */}
          <SectionTitle label="Karbon Ayak İzi (EN 15804+A2)" />

          {/* Yaşam Döngüsü Kapsam Görseli */}
          <div className="rounded-xl overflow-hidden border border-gray-200 text-xs font-bold">
            <div className="flex">
              <div className="flex-1 bg-blue-600 text-white px-3 py-2 text-center border-r border-blue-500">
                <div>A1</div>
                <div className="font-normal opacity-80 mt-0.5">Hammadde</div>
              </div>
              <div className="flex-1 bg-blue-600 text-white px-3 py-2 text-center border-r border-blue-500">
                <div>A2</div>
                <div className="font-normal opacity-80 mt-0.5">Nakliye</div>
              </div>
              <div className="flex-1 bg-blue-600 text-white px-3 py-2 text-center border-r border-white/30">
                <div>A3</div>
                <div className="font-normal opacity-80 mt-0.5">Üretim</div>
              </div>
              <div className="flex-1 bg-gray-100 text-gray-400 px-3 py-2 text-center">
                <div>A4</div>
                <div className="font-normal mt-0.5">Sevkiyat</div>
              </div>
            </div>
            <div className="flex text-center">
              <div className="flex-[3] bg-blue-50 text-blue-700 px-3 py-1 border-r border-blue-200 text-xs font-black tracking-wide">
                ← A1–A3 ZORUNLU (ESPR / CBAM) →
              </div>
              <div className="flex-1 bg-gray-50 text-gray-400 px-3 py-1 text-xs">
                İsteğe Bağlı
              </div>
            </div>
          </div>

          {/* Alan Girişleri */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Field label="A1–A3 Toplam *" name="co2_a1a3" value={data.co2_a1a3}
                onChange={set('co2_a1a3')} type="number" placeholder="1.85" required
                suffix="kg CO₂e/kg" hint="Hammadde + Nakliye + Üretim — ESPR zorunlu" />
            </div>
            <Field label="A3 Sadece Üretim" name="co2_a3" value={data.co2_a3}
              onChange={set('co2_a3')} type="number" placeholder="0.45"
              suffix="kg CO₂e/kg" hint="Yalnızca üretim aşaması" />
            <Field label="A4 Sevkiyat" name="co2_a4" value={data.co2_a4}
              onChange={set('co2_a4')} type="number" placeholder="0.08"
              suffix="kg CO₂e/kg" hint="Tesise nakliye emisyonu" />
          </div>
          <SelectField label="Doğrulama Durumu" value={data.co2_verification}
            onChange={(v) => onChange({ ...data, co2_verification: v })}
            options={CO2_VERIFICATION_OPTIONS} />

          {/* EPD Bilgileri */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black text-blue-700 uppercase tracking-widest">EPD — Çevre Ürün Beyanı</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">ESPR Zorunlu</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="EPD Belge Numarası" value={data.epd_no}
                onChange={set('epd_no')} placeholder="EPD-TR-2024-017-EN"
                required hint="EN 15804+A2 uyumlu EPD'nin resmi numarası" />
              <Field label="Geçerlilik Tarihi" value={data.epd_valid_until}
                onChange={set('epd_valid_until')} type="date" required />
              <div className="md:col-span-2">
                <Field label="EPD Belge URL (Opsiyonel)" value={data.epd_url}
                  onChange={set('epd_url')} placeholder="https://dpp.kocaersteel.com/docs/epd/..."
                  hint="Denetleyicilerin doğrudan erişebileceği belge bağlantısı" />
              </div>
            </div>
          </div>

          {/* Geri Dönüşüm Göstergeleri */}
          <SectionTitle label="Döngüsel Ekonomi Göstergeleri (EN 15804+A2)" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Geri Dönüştürülmüş İçerik" value={data.recycled_content_pct}
              onChange={set('recycled_content_pct')} type="number" placeholder="38"
              suffix="%" hint="Üretimde kullanılan geri dönüştürülmüş hammadde oranı — ESPR zorunlu" required />
            <Field label="Geri Dönüştürülebilirlik" value={data.recyclability_pct}
              onChange={set('recyclability_pct')} type="number" placeholder="100"
              suffix="%" hint="Ürünün ömür sonu geri dönüştürülebilirlik oranı — EN 15804+A2" required />
          </div>

          {/* CBAM Uyarısı */}
          {data.co2_a1a3 && parseFloat(data.co2_a1a3) > 2.0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">
                <span className="font-black">CBAM Uyarısı:</span> A1–A3 CO₂ değeri ({data.co2_a1a3} kg CO₂e/kg) değerlendirme eşiğini aşıyor.
              </p>
            </div>
          )}

          {/* Malzeme Uyum Beyanları */}
          <SectionTitle label="Malzeme Uyum Beyanları (REACH / RoHS)" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
              <input type="checkbox" id="svhc" checked={data.svhc_free}
                onChange={(e) => setB('svhc_free')(e.target.checked)} className="w-4 h-4 accent-green-600" />
              <div>
                <label htmlFor="svhc" className="text-sm font-bold text-gray-700 cursor-pointer">SVHC İçermez</label>
                <p className="text-[11px] text-gray-400 mt-0.5">REACH Tüzüğü — Çok Yüksek Endişe Veren Madde yok</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <input type="checkbox" id="hazmat" checked={data.hazardous_materials}
                onChange={(e) => setB('hazardous_materials')(e.target.checked)} className="w-4 h-4 accent-red-600" />
              <div>
                <label htmlFor="hazmat" className="text-sm font-bold text-gray-700 cursor-pointer">Tehlikeli Madde İçeriyor</label>
                <p className="text-[11px] text-gray-400 mt-0.5">Çelik ürünler için genellikle işaretlenmez</p>
              </div>
            </div>
          </div>

          {data.hazardous_materials && (
            <div className="border border-red-200 bg-red-50/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <p className="text-xs font-black text-red-700">ESPR Zorunlu Beyan — REACH Madde 33</p>
              </div>

              {/* Başlık satırı */}
              <div className="grid grid-cols-12 gap-2 px-1">
                <p className="col-span-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Madde Adı</p>
                <p className="col-span-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">CAS No</p>
                <p className="col-span-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Konsantrasyon</p>
                <p className="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">SVHC</p>
              </div>

              {/* Madde satırları */}
              {data.hazardous_substances.map((s) => (
                <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                  <input value={s.name} onChange={(e) => onChange({ ...data, hazardous_substances: data.hazardous_substances.map(x => x.id === s.id ? { ...x, name: e.target.value } : x) })}
                    placeholder="Kurşun (Pb)" className="col-span-4 px-3 py-2 border border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-300" />
                  <input value={s.cas_no} onChange={(e) => onChange({ ...data, hazardous_substances: data.hazardous_substances.map(x => x.id === s.id ? { ...x, cas_no: e.target.value } : x) })}
                    placeholder="7439-92-1" className="col-span-3 px-3 py-2 border border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-300 font-mono" />
                  <div className="col-span-3 relative">
                    <input value={s.concentration_pct} type="number" onChange={(e) => onChange({ ...data, hazardous_substances: data.hazardous_substances.map(x => x.id === s.id ? { ...x, concentration_pct: e.target.value } : x) })}
                      placeholder="0.005" className="w-full px-3 py-2 pr-7 border border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-300" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">%</span>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <input type="checkbox" checked={s.svhc} onChange={(e) => onChange({ ...data, hazardous_substances: data.hazardous_substances.map(x => x.id === s.id ? { ...x, svhc: e.target.checked } : x) })}
                      className="w-4 h-4 accent-red-600" />
                  </div>
                  <button type="button" onClick={() => onChange({ ...data, hazardous_substances: data.hazardous_substances.filter(x => x.id !== s.id) })}
                    className="col-span-1 flex justify-center text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button type="button"
                onClick={() => onChange({ ...data, hazardous_substances: [...data.hazardous_substances, { id: Date.now(), name: '', cas_no: '', concentration_pct: '', svhc: true }] })}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-red-200 rounded-xl text-sm font-bold text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors">
                <Plus size={14} /> Madde Ekle
              </button>
              <p className="text-[11px] text-gray-400">Konsantrasyon eşiği: ağırlıkça %0.1 — REACH Tüzüğü Madde 59</p>
            </div>
          )}

          {/* Ömür Sonu ve İmha */}
          <SectionTitle label="Ömür Sonu ve İmha" />
          <SelectField label="Söküm Zorluğu" value={data.dismantling_difficulty}
            onChange={(v) => onChange({ ...data, dismantling_difficulty: v })} options={DISMANTLING_OPTIONS} />
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              İmha / Geri Dönüşüm Talimatı <span className="text-red-500">*</span>
            </label>
            <textarea value={data.disposal_instructions}
              onChange={(e) => onChange({ ...data, disposal_instructions: e.target.value })}
              placeholder="Genel çöpe ATMAYIN. Ürün ömrünü tamamladığında yetkili çelik geri dönüşüm tesislerine teslim ediniz."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none" />
          </div>
          </div>
      )}

      {/* SUB 5: ÜRETİCİ & TESİS */}
      {sub === 5 && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 font-medium">
              Bu bilgiler sistem tarafından otomatik doldurulmaktadır. Değişiklik için sistem yöneticisiyle iletişime geçin.
            </p>
          </div>

          <SectionTitle label="Üretici Firma Bilgileri" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Üretici Adı',      value: 'Kocaer Çelik A.Ş.' },
              { label: 'Vergi Numarası',   value: 'TR1234567890' },
              { label: 'Website',          value: 'www.kocaersteel.com' },
              { label: 'DPP E-postası',    value: 'dpp@kocaersteel.com' },
              { label: 'EORI Numarası',    value: 'TR12345678900000' },
              { label: 'Adres',            value: 'Aliağa OSB, 35800 İzmir, Türkiye' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-700">{value}</p>
              </div>
            ))}
          </div>

          <SectionTitle label="Üretim Tesisi Bilgileri" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Tesis Adı',    value: 'Aliağa Üretim Tesisi' },
              { label: 'Tesis Kodu',   value: 'KCR-ALA-01' },
              { label: 'Ülke',         value: 'Türkiye' },
              { label: 'GLN Kodu',     value: '8690000000001' },
              { label: 'Koordinat',    value: '38.8008° K, 26.9719° D' },
              { label: 'Adres',        value: 'Aliağa OSB No:12, 35800 İzmir' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-700">{value}</p>
              </div>
            ))}
          </div>

          </div>
      )}
    </div>
  );
}
