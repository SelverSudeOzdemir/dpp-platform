import { useState, useEffect } from 'react';
import { Download, Globe, FileText, Database, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { INCOMPLETE } from '../../../constants/adminConstants';
import type { AdminProduct, IncompleteProduct } from '../../../types/admin';
import { apiGetIncompleteReport } from '../../../lib/api';

interface Props {
  products: AdminProduct[];
}

export default function ReportsTab({ products }: Props) {
  const [exportDateFrom, setExportDateFrom] = useState('2026-01-01');
  const [exportDateTo, setExportDateTo] = useState('2026-03-27');
  const [exportProduct, setExportProduct] = useState('all');
  const [showCbamInfo, setShowCbamInfo] = useState(false);
  const [showExcelInfo, setShowExcelInfo] = useState(false);
  const [showJsonInfo, setShowJsonInfo] = useState(false);
  const [incompleteFilter, setIncompleteFilter] = useState<'taslak' | 'geri-cagrildi'>('taslak');
  const [selectedIncomplete, setSelectedIncomplete] = useState<IncompleteProduct | null>(null);
  const [incompleteList, setIncompleteList] = useState<IncompleteProduct[]>(INCOMPLETE);
  const [loadingIncomplete, setLoadingIncomplete] = useState(false);

  useEffect(() => {
    const fetchIncomplete = async () => {
      setLoadingIncomplete(true);
      try {
        const data = await apiGetIncompleteReport();
        if (data && data.length > 0) {
          const mapped = data.map((item: any) => ({
            id: item.dpp_id ? (item.dpp_id.length > 8 ? item.dpp_id.slice(0, 8) + '…' : item.dpp_id) : '—',
            product: item.product_name || 'Bilinmeyen Ürün',
            version: '1.0',
            status: 'Taslak',
            missing: item.missing || []
          }));
          setIncompleteList(mapped);
        }
      } catch (err) {
        console.error('Eksik veri raporu backendden alınamadı, mock kullanılacak:', err);
      } finally {
        setLoadingIncomplete(false);
      }
    };
    fetchIncomplete();
  }, []);

  return (
    <>
      <div className="space-y-8">

        {/* Bulk Export */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Download size={16} className="text-blue-600" />
            Toplu Veri Dışa Aktarma (Bulk Export)
          </h2>

          {/* Filtreler */}
          <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Başlangıç Tarihi</label>
              <input
                type="date"
                value={exportDateFrom}
                onChange={e => setExportDateFrom(e.target.value)}
                className="text-xs font-bold border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Bitiş Tarihi</label>
              <input
                type="date"
                value={exportDateTo}
                onChange={e => setExportDateTo(e.target.value)}
                className="text-xs font-bold border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Ürün / Batch</label>
              <select
                value={exportProduct}
                onChange={e => setExportProduct(e.target.value)}
                className="text-xs font-bold border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tüm Ürünler</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.id} — {p.product_name}</option>
                ))}
              </select>
            </div>
            <div className="ml-auto">
              <p className="text-[10px] text-gray-400 font-medium">
                {exportProduct === 'all'
                  ? `${products.length} ürün seçili`
                  : `1 ürün seçili`}
                {' · '}
                {exportDateFrom} → {exportDateTo}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'AB CBAM Portalı',  desc: 'Tüm emisyon verileri XML formatında',      icon: Globe,     color: 'blue',   format: 'XML', cbam: true  },
              { label: 'Excel Raporu',      desc: 'Tüm pasaport verileri .xlsx formatında',   icon: FileText,  color: 'green',  format: 'XLSX', excel: true },
              { label: 'JSON Export',       desc: 'Makine okunabilir ham veri',               icon: Database,  color: 'purple', format: 'JSON' },
            ].map((exp, i) => {
              const Icon = exp.icon;
              const colorMap = {
                blue:   { bg: 'bg-blue-100',   icon: 'text-blue-600'   },
                green:  { bg: 'bg-green-100',  icon: 'text-green-600'  },
                purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
              }[exp.color as 'blue' | 'green' | 'purple'];
              return (
                <button
                  key={i}
                  onClick={() => (exp as any).cbam ? setShowCbamInfo(true) : (exp as any).excel ? setShowExcelInfo(true) : setShowJsonInfo(true)}
                  className="flex flex-col items-start p-5 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-2xl transition-all group text-left"
                >
                  <div className={`p-3 rounded-xl mb-3 ${colorMap.bg}`}>
                    <Icon size={20} className={colorMap.icon} />
                  </div>
                  <p className="text-sm font-black text-gray-900 group-hover:text-blue-700 transition-colors">{exp.label}</p>
                  <p className="text-xs text-gray-500 font-medium mt-1">{exp.desc}</p>
                  <span className="mt-3 text-[10px] font-black text-gray-400 bg-white px-2 py-1 rounded border border-gray-200">.{exp.format}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Eksik Veri Raporu */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-500" />
              Eksik Veri Raporu {loadingIncomplete && <Loader2 size={14} className="text-blue-600 animate-spin" />}
            </h2>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {([
                { key: 'taslak',        label: 'Taslak',        count: incompleteList.filter(p => p.status === 'Taslak').length },
                { key: 'geri-cagrildi', label: 'Geri Çağrıldı', count: incompleteList.filter(p => p.status === 'Geri Çağrıldı').length },
              ] as { key: 'taslak' | 'geri-cagrildi'; label: string; count: number }[]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setIncompleteFilter(f.key)}
                  className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors ${
                    incompleteFilter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                    incompleteFilter === f.key ? 'bg-gray-100 text-gray-700' : 'bg-gray-200 text-gray-500'
                  }`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {incompleteList.filter(p =>
              incompleteFilter === 'taslak' ? p.status === 'Taslak' : p.status === 'Geri Çağrıldı'
            ).map((p, i) => (
              <button
                key={i}
                onClick={() => setSelectedIncomplete(p)}
                className="w-full text-left p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{p.id}</span>
                    <span className="text-sm font-black text-gray-900">{p.product}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                      {p.missing.length} eksik alan
                    </span>
                    <span className="text-gray-300 group-hover:text-blue-400 transition-colors text-xs">→</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-gray-400 font-medium">v{p.version}</span>
                  <span className="text-[10px] text-gray-400 font-medium">·</span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {[...new Set(p.missing.map(m => m.section))].join(', ')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Eksik Veri Detay Modal */}
      {selectedIncomplete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedIncomplete(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{selectedIncomplete.id}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      selectedIncomplete.status === 'Taslak' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>{selectedIncomplete.status}</span>
                  </div>
                  <p className="text-sm font-black text-gray-900">{selectedIncomplete.product}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-gray-400 font-medium">v{selectedIncomplete.version}</span>
                    <span className="text-[10px] text-gray-400">·</span>
                    <span className="text-[10px] font-bold text-red-600">{selectedIncomplete.missing.length} eksik alan</span>
                  </div>
                </div>
                <button onClick={() => setSelectedIncomplete(null)} className="text-gray-400 hover:text-gray-600 font-black">✕</button>
              </div>
            </div>

            {/* Eksik alanlar — başlık bazlı gruplandırılmış */}
            <div className="p-5 space-y-1">
              {(() => {
                const sections = [...new Set(selectedIncomplete.missing.map(m => m.section))];
                return sections.map((section, si) => (
                  <div key={si}>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4 mb-1.5 first:mt-0">{section}</p>
                    {selectedIncomplete.missing.filter(m => m.section === section).map((m, mi) => (
                      <div key={mi} className="flex items-center gap-2 py-2 px-3 bg-red-50 rounded-xl border border-red-100 mb-1">
                        <XCircle size={13} className="text-red-400 shrink-0" />
                        <span className="text-xs font-bold text-gray-800">{m.field}</span>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* CBAM XML Bilgilendirme Modal */}
      {showCbamInfo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCbamInfo(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <div>
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Globe size={16} className="text-blue-600" />
                  AB CBAM Portalı — XML İçerik Gereksinimleri
                </h2>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">EU Implementing Regulation 2023/1773 · Annex I–II</p>
              </div>
              <button onClick={() => setShowCbamInfo(false)} className="text-gray-400 hover:text-gray-600 text-lg font-black">✕</button>
            </div>

            <div className="p-6 space-y-5">

              {/* Açıklama */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-blue-800 font-medium leading-relaxed">
                  CBAM kapsamında her çeyrek dönem sonunda AB Komisyonu&apos;nun CBAM Geçiş Portalı&apos;na XML formatında rapor iletilmesi zorunludur.
                  Aşağıdaki alanlar <span className="font-black">zorunlu (Z)</span> veya <span className="font-black">koşullu (K)</span> olarak işaretlenmiştir.
                </p>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'}/export/cbam-xml`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-100 shrink-0 transition-all active:scale-95"
                >
                  <Download size={14} /> XML İndir
                </a>
              </div>

              {[
                {
                  title: '1. Beyan Bilgileri (Declarant)',
                  fields: [
                    { name: 'declarantEORI',      label: 'EORI Numarası',          z: true,  note: 'Kocaer YYS belgesiyle eşleşmeli' },
                    { name: 'declarantName',       label: 'Firma Adı',              z: true,  note: '' },
                    { name: 'declarantAddress',    label: 'Firma Adresi',           z: true,  note: '' },
                    { name: 'reportingPeriod',     label: 'Raporlama Dönemi',       z: true,  note: 'Q1/Q2/Q3/Q4 + yıl' },
                  ]
                },
                {
                  title: '2. İthal Mal Bilgileri (ImportedGoods)',
                  fields: [
                    { name: 'cnCode',             label: 'CN / GTİP Kodu',         z: true,  note: 'Örn: 7216.32 (IPE profiller)' },
                    { name: 'goodsDescription',   label: 'Mal Tanımı',             z: true,  note: '' },
                    { name: 'countryOfOrigin',    label: 'Menşe Ülke',             z: true,  note: 'TR (Türkiye)' },
                    { name: 'netMass',            label: 'Net Ağırlık (tonne)',     z: true,  note: '' },
                    { name: 'customsProcedure',   label: 'Gümrük Rejimi',          z: true,  note: '4000 (serbest dolaşıma giriş)' },
                  ]
                },
                {
                  title: '3. Üretim Tesisi (ProductionInstallation)',
                  fields: [
                    { name: 'installationName',   label: 'Tesis Adı',              z: true,  note: 'Kocaer Aliağa Tesisi' },
                    { name: 'installationId',     label: 'CBAM Tesis ID',          z: false, note: 'Tesis CBAM portala kayıtlıysa' },
                    { name: 'unlocode',           label: 'UN/LOCODE',              z: true,  note: 'TR IZM (İzmir/Aliağa)' },
                    { name: 'productionRoute',    label: 'Üretim Rotası',          z: true,  note: 'EAF (Elektrik Ark Fırını)' },
                  ]
                },
                {
                  title: '4. Gömülü Emisyon (EmbeddedEmissions)',
                  fields: [
                    { name: 'specificEmbeddedEmissions', label: 'Özgül Gömülü Emisyon', z: true,  note: 'tCO₂e/tonne — A1-A3 kapsamı' },
                    { name: 'directEmissions',    label: 'Doğrudan Emisyon',       z: true,  note: 'tCO₂e/tonne — üretim süreci' },
                    { name: 'indirectEmissions',  label: 'Dolaylı Emisyon',        z: true,  note: 'tCO₂e/tonne — elektrik kaynaklı' },
                    { name: 'emissionFactor',     label: 'Emisyon Faktörü',        z: false, note: 'Kullanılan elektrik şebekesine göre' },
                  ]
                },
                {
                  title: '5. Karbon Fiyatı (CarbonPrice)',
                  fields: [
                    { name: 'carbonPricePaid',    label: 'Ödenen Karbon Fiyatı',   z: false, note: 'Türkiye ETS henüz CBAM kapsamında değil → 0' },
                    { name: 'carbonPriceCurrency',label: 'Para Birimi',             z: false, note: 'TRY' },
                    { name: 'carbonPriceInstrument', label: 'Fiyatlandırma Aracı', z: false, note: 'ETS / Karbon Vergisi' },
                    { name: 'freeAllocation',     label: 'Ücretsiz Tahsisat',      z: false, note: 'Tonne cinsinden' },
                  ]
                },
                {
                  title: '6. Doğrulama (Verification)',
                  fields: [
                    { name: 'verifierName',       label: 'Doğrulayıcı Kuruluş',   z: false, note: 'Akredite bağımsız kuruluş' },
                    { name: 'verifierAccreditation', label: 'Akreditasyon No',     z: false, note: '' },
                    { name: 'verificationDate',   label: 'Doğrulama Tarihi',       z: false, note: '' },
                  ]
                },
              ].map((section, si) => (
                <div key={si}>
                  <p className="text-[11px] font-black text-gray-700 uppercase tracking-widest mb-2">{section.title}</p>
                  <div className="space-y-1">
                    {section.fields.map((f, fi) => (
                      <div key={fi} className="flex items-start gap-3 py-2 px-3 rounded-xl hover:bg-gray-50">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${f.z ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                          {f.z ? 'Z' : 'K'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-black text-gray-800">{f.label} </span>
                          <span className="text-[10px] font-mono text-gray-400">{f.name}</span>
                          {f.note && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{f.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                  <span className="font-black">Not:</span> Türkiye&apos;nin ETS sistemi henüz AB CBAM kapsamında tanınmıyor. Dolayısıyla <span className="font-mono">carbonPricePaid = 0</span> olarak beyan edilecek. Bu durum ileride değişebilir.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Excel Raporu İçerik Modal */}
      {showExcelInfo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowExcelInfo(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <div>
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={16} className="text-green-600" />
                  Excel Raporu — Sheet Yapısı ve Kolonlar
                </h2>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">Admin panelindeki tüm veri alanları · 8 sheet</p>
              </div>
              <button onClick={() => setShowExcelInfo(false)} className="text-gray-400 hover:text-gray-600 text-lg font-black">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-green-800 font-medium leading-relaxed">
                  Her sheet ayrı bir veri grubunu temsil eder. Tarih aralığı ve ürün/batch filtresi tüm sheet&apos;lere uygulanır.
                </p>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'}/export/excel`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl shadow-md shadow-green-100 shrink-0 transition-all active:scale-95"
                >
                  <Download size={14} /> Excel İndir
                </a>
              </div>

              {[
                {
                  sheet: 'Sheet 1',
                  title: 'Pasaport Özeti',
                  columns: [
                    { name: 'Batch ID',              example: 'KCR-742' },
                    { name: 'Ürün Adı',              example: 'IPE 200 Yapısal Çelik Profil' },
                    { name: 'Kategori',              example: 'Structural Steel' },
                    { name: 'Pasaport Durumu',       example: 'Yayında' },
                    { name: 'Versiyon',              example: 'v1.2' },
                    { name: 'Veri Kaynağı',          example: 'SAP/ERP' },
                    { name: 'CO₂ (kg CO₂e/kg)',      example: '1.15' },
                    { name: 'CBAM Limiti Aşıldı mı', example: 'Hayır' },
                    { name: 'Blokzincir Mühürü',     example: '2026-03-10' },
                  ]
                },
                {
                  sheet: 'Sheet 2',
                  title: 'Onay Bekleyen Batch\'ler',
                  columns: [
                    { name: 'Batch ID',              example: 'PB-001' },
                    { name: 'Parti No',              example: 'KCR-2026-0315-B' },
                    { name: 'Ürün Tipi',             example: 'HEB 300 Geniş Başlıklı Profil' },
                    { name: 'Miktar (ton)',           example: '68.0' },
                    { name: 'Veri Kaynağı',          example: 'Manuel' },
                    { name: 'Oluşturan',             example: 'Furkan Yıldız' },
                    { name: 'Gönderilme Tarihi',     example: '2026-03-15 14:22' },
                    { name: 'CO₂ A1-A3',             example: '1.92' },
                    { name: 'CO₂ Doğrulama',         example: 'Dahili Hesaplama' },
                  ]
                },
                {
                  sheet: 'Sheet 3',
                  title: 'Sertifikalar',
                  columns: [
                    { name: 'Sertifika Adı',         example: 'ISO 9001 KYS' },
                    { name: 'Tipi',                  example: 'Firma Geneli' },
                    { name: 'Ürün / Kapsam',         example: 'Firma Geneli' },
                    { name: 'Veren Kuruluş',         example: 'TÜV NORD' },
                    { name: 'Son Geçerlilik',        example: '2026-04-15' },
                    { name: 'Kalan Gün',             example: '19' },
                    { name: 'Durum',                 example: 'Uyarı' },
                  ]
                },
                {
                  sheet: 'Sheet 4',
                  title: 'REACH / SVHC',
                  columns: [
                    { name: 'Madde Adı',             example: 'Lead (Pb)' },
                    { name: 'CAS No',                example: '7439-92-1' },
                    { name: 'Eşik (%)',              example: '0.1' },
                    { name: 'Tespit Edilen (%)',     example: '0.003' },
                    { name: 'Eşik Aşıldı mı',       example: 'Hayır' },
                    { name: 'SCIP Beyanı Gerekli mi', example: 'Hayır' },
                  ]
                },
                {
                  sheet: 'Sheet 5',
                  title: 'Tedarik Zinciri',
                  columns: [
                    { name: 'Tedarikçi Adı',        example: 'Erdemir A.Ş.' },
                    { name: 'Rolü',                  example: 'Ham Madde Tedarikçisi' },
                    { name: 'Doğrulanmış mı',        example: 'Evet' },
                    { name: 'Veri Güvenilirliği (%)', example: '97' },
                    { name: 'Doğrulama Yöntemi',     example: 'EPD Belgeli' },
                    { name: 'Son Güncelleme',        example: '2026-03-01' },
                    { name: 'Risk Seviyesi',         example: 'Düşük' },
                  ]
                },
                {
                  sheet: 'Sheet 6',
                  title: 'Lojistik Emisyon',
                  columns: [
                    { name: 'Rota No',               example: '1' },
                    { name: 'Kalkış',                example: 'Ereğli, Zonguldak' },
                    { name: 'Varış',                 example: 'Aliağa, İzmir' },
                    { name: 'Taşıma Yöntemi',        example: 'Karayolu' },
                    { name: 'Mesafe',                example: '850 km' },
                    { name: 'CO₂ (kg CO₂e/kg)',      example: '0.045' },
                  ]
                },
                {
                  sheet: 'Sheet 7',
                  title: 'Erişim Logları',
                  columns: [
                    { name: 'Kullanıcı',             example: 'inspector.mehmet@gtb.gov.tr' },
                    { name: 'Rol',                   example: 'AUTHORITY' },
                    { name: 'Aksiyon',               example: 'Pasaport PDF indirildi' },
                    { name: 'Pasaport',              example: 'KCR-742' },
                    { name: 'Zaman',                 example: '2026-03-15 14:32' },
                    { name: 'IP Adresi',             example: '195.142.x.x' },
                  ]
                },
                {
                  sheet: 'Sheet 8',
                  title: 'Versiyon Geçmişi (Audit Trail)',
                  columns: [
                    { name: 'Batch ID',              example: 'KCR-742' },
                    { name: 'Ürün',                  example: 'IPE 200' },
                    { name: 'Versiyon',              example: 'v1.2' },
                    { name: 'İşlemi Yapan',          example: 'mehmet.yilmaz@kocaer.com' },
                    { name: 'Tarih',                 example: '2026-03-10 08:42' },
                    { name: 'Değişiklik',            example: 'CO₂ değeri SAP entegrasyonu ile güncellendi' },
                  ]
                },
              ].map((s, si) => (
                <div key={si} className="border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <span className="text-[10px] font-black text-white bg-green-500 px-2 py-0.5 rounded">{s.sheet}</span>
                    <p className="text-xs font-black text-gray-800">{s.title}</p>
                    <span className="text-[10px] text-gray-400 font-medium ml-auto">{s.columns.length} kolon</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {s.columns.map((col, ci) => (
                      <div key={ci} className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs font-bold text-gray-700">{col.name}</span>
                        <span className="text-[10px] font-mono text-gray-400">{col.example}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* JSON Export İçerik Modal */}
      {showJsonInfo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowJsonInfo(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <div>
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Database size={16} className="text-purple-600" />
                  JSON Export — Şema Yapısı
                </h2>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">Makine okunabilir · CIRPASS / DPP ekosistemi uyumlu</p>
              </div>
              <button onClick={() => setShowJsonInfo(false)} className="text-gray-400 hover:text-gray-600 text-lg font-black">✕</button>
            </div>

            <div className="p-6 space-y-5">

              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-purple-800 font-medium leading-relaxed">
                  JSON export, Excel&apos;den farklı olarak <span className="font-black">hiyerarşik</span> bir yapı kullanır. Her pasaport kendi sertifika, tedarik zinciri ve emisyon verilerini içinde taşır. Tarih aralığı ve ürün/batch filtresi uygulanır.
                </p>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'}/export/json?date_from=${exportDateFrom}&date_to=${exportDateTo}${exportProduct !== 'all' ? `&product_id=${exportProduct}` : ''}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-md shadow-purple-100 shrink-0 transition-all active:scale-95"
                >
                  <Download size={14} /> JSON İndir
                </a>
              </div>

              {/* Şema */}
              <div className="bg-gray-900 rounded-2xl p-5 overflow-x-auto">
                <pre className="text-[11px] text-gray-300 font-mono leading-relaxed whitespace-pre">{`{
  "export_metadata": {
    "generated_at":   "2026-03-27T10:00:00Z",
    "generated_by":   "admin@kocaer.com",
    "date_range":     { "from": "2026-01-01", "to": "2026-03-27" },
    "product_filter": "all" | "KCR-742",
    "schema_version": "1.0"
  },

  "passports": [
    {
      "id":                      "KCR-742",
      "parti_no":                "KCR-2026-0310-A",
      "product_name":            "IPE 200 Yapısal Çelik Profil",
      "product_category":        "Structural Steel",
      "passport_status":         "Yayında",
      "version":                 "1.2",
      "blockchain_timestamp":    "2026-03-10T08:42:11Z",

      "emissions": {
        "co2_cradle_to_gate_kg": 1.15,
        "cbam_limit":            2.0,
        "cbam_compliant":        true,
        "logistics_total_co2":   0.085,
        "logistics_routes": [
          {
            "from":    "Ereğli, Zonguldak",
            "to":      "Aliağa, İzmir",
            "method":  "Karayolu",
            "dist_km": 850,
            "co2":     0.045
          }
        ]
      },

      "certificates": [
        {
          "name":      "EN 10204 3.1",
          "type":      "batch",
          "issuer":    "Kocaer QC",
          "expiry":    "2027-03-10",
          "days_left": 348,
          "status":    "Geçerli"
        }
      ],

      "reach_svhc": [
        {
          "substance":     "Lead (Pb)",
          "cas":           "7439-92-1",
          "threshold_pct": 0.1,
          "detected_pct":  0.003,
          "exceeds":       false
        }
      ],

      "supply_chain": {
        "suppliers": [
          {
            "name":       "Erdemir A.Ş.",
            "role":       "Ham Madde Tedarikçisi",
            "verified":   true,
            "accuracy":   97,
            "method":     "EPD Belgeli",
            "risk":       "Düşük"
          }
        ]
      },

      "version_history": [
        {
          "version": "1.2",
          "by":      "mehmet.yilmaz@kocaer.com",
          "at":      "2026-03-10 08:42",
          "changes": "CO₂ değeri SAP entegrasyonu ile güncellendi"
        }
      ],

      "access_logs": [
        {
          "user":      "inspector.mehmet@gtb.gov.tr",
          "role":      "AUTHORITY",
          "action":    "Pasaport PDF indirildi",
          "timestamp": "2026-03-15 14:32",
          "ip":        "195.142.x.x"
        }
      ]
    }
  ]
}`}</pre>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                  <span className="font-black">Not:</span> access_logs alanı hassas veri içerir. Dışa aktarım yalnızca ADMIN yetkisiyle yapılabilmeli, üçüncü taraflarla paylaşılmamalıdır.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
