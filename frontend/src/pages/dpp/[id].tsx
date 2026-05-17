// src/pages/product/[id].tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { productService, Product } from '../../Services/productService';
import Spinner from '../../components/ui/spinner';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { apiGetDppChangelog } from '../../lib/api';
// YENİ İKONLAR EKLENDİ (Globe, Mail, Info) Yasal zorunluluk alanları için
import { CheckCircle2, ShieldCheck, LockKeyhole, ChevronDown, Scale, FlaskConical, QrCode, Leaf, Calendar, Award, AlertTriangle, Recycle, Globe, Mail, Info, Download, FileText, MapPin, Factory, Flame, Box, Hash, Globe2, Milestone, Activity, GitBranch } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';


const SOURCE_CFG: Record<string, { bg: string; text: string; border: string }> = {
  'SAP/ERP': { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-100'  },
  'Excel':   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  'Manuel':  { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100'    },
};

const MOCK_VERSION_HISTORY = [
  {
    type: 'creation' as const,
    timestamp: '2024-01-15T09:42:11Z',
    operator: 'mehmet.yilmaz@kocaer.com',
    blockchain_hash: '0x3f7a9c2b8e1d4f56a0c3b7e291d5f8a4',
    groups: [
      {
        section: 'Batch Bilgileri',
        fields: [
          { field: 'Parti Numarası',       source: 'SAP/ERP' },
          { field: 'Tedarikçi Parti Kodu', source: 'SAP/ERP' },
          { field: 'Ocak / Fırın No',      source: 'SAP/ERP' },
          { field: 'Üretim Tarihi',        source: 'SAP/ERP' },
          { field: 'Miktar (ton)',          source: 'SAP/ERP' },
        ],
      },
      {
        section: 'Kimyasal & Mekanik',
        fields: [
          { field: 'C (Karbon) %',      source: 'SAP/ERP' },
          { field: 'Mn (Manganez) %',   source: 'SAP/ERP' },
          { field: 'Si (Silisyum) %',   source: 'SAP/ERP' },
          { field: 'P (Fosfor) %',      source: 'SAP/ERP' },
          { field: 'S (Kükürt) %',      source: 'SAP/ERP' },
          { field: 'N (Azot) %',        source: 'SAP/ERP' },
          { field: 'Akma Dayanımı',     source: 'SAP/ERP' },
          { field: 'Çekme Dayanımı',    source: 'SAP/ERP' },
          { field: 'Uzama Oranı',       source: 'SAP/ERP' },
          { field: 'Darbe Enerjisi',    source: 'Excel'   },
          { field: 'Test Sıcaklığı',    source: 'Excel'   },
        ],
      },
      {
        section: 'Tedarik Zinciri',
        fields: [
          { field: 'Tedarikçi Adı',      source: 'Excel'  },
          { field: 'Tedarikçi Lokasyon', source: 'Excel'  },
          { field: 'Menşei Ülke',        source: 'Excel'  },
          { field: 'Malzeme',            source: 'Excel'  },
          { field: 'Tedarik Tarihi',     source: 'Manuel' },
          { field: 'Miktar & Birim',     source: 'Manuel' },
        ],
      },
      {
        section: 'Sürdürülebilirlik',
        fields: [
          { field: 'CO₂ A1-A3',                  source: 'SAP/ERP' },
          { field: 'CO₂ A3 (Sadece Üretim)',      source: 'SAP/ERP' },
          { field: 'Geri Dönüştürülmüş İçerik',  source: 'SAP/ERP' },
          { field: 'Geri Dönüştürülebilirlik',   source: 'SAP/ERP' },
          { field: 'Doğrulama Durumu',            source: 'Manuel'  },
          { field: 'SVHC Beyanı',                 source: 'Manuel'  },
          { field: 'İmha / Geri Dönüşüm Talimatı', source: 'Manuel' },
        ],
      },
      {
        section: 'Sertifikalar',
        fields: [
          { field: 'EPD Belge No',          source: 'Manuel' },
          { field: 'EPD Geçerlilik Tarihi', source: 'Manuel' },
          { field: 'EN 10204 Sertifika No', source: 'Manuel' },
          { field: 'Sertifika Tipi',        source: 'Manuel' },
          { field: 'Veren Kuruluş',         source: 'Manuel' },
        ],
      },
    ],
  },
  {
    type: 'update' as const,
    timestamp: '2024-02-20T14:22:33Z',
    operator: 'admin@kocaer.com',
    blockchain_hash: '0x8b2ce1a47f93d0b5c6e428a1f157c392',
    groups: [
      {
        section: 'Sürdürülebilirlik',
        fields: [
          { field: 'CO₂ A1-A3',        source: 'SAP/ERP' },
          { field: 'Doğrulama Durumu', source: 'Manuel'  },
        ],
      },
      {
        section: 'Sertifikalar',
        fields: [
          { field: 'CE Marking Sertifika No', source: 'Manuel' },
          { field: 'Geçerlilik Tarihi',        source: 'Manuel' },
        ],
      },
    ],
  },
  {
    type: 'update' as const,
    timestamp: '2024-04-03T11:05:47Z',
    operator: 'mehmet.yilmaz@kocaer.com',
    blockchain_hash: '0xc94a3e017b28f6d5e1902c7a84b3d610',
    groups: [
      {
        section: 'Sürdürülebilirlik',
        fields: [
          { field: 'EPD Belge No',          source: 'Manuel' },
          { field: 'EPD Geçerlilik Tarihi', source: 'Manuel' },
        ],
      },
      {
        section: 'Tedarik Zinciri',
        fields: [
          { field: 'Tedarikçi Adı',  source: 'Excel' },
          { field: 'Menşei Ülke',    source: 'Excel' },
          { field: 'Tedarik Tarihi', source: 'Manuel' },
        ],
      },
    ],
  },
];

export default function ProductPassportDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTechnicalOpen, setIsTechnicalOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [versionHistory, setVersionHistory] = useState<any[]>(MOCK_VERSION_HISTORY);

  // 1. ÖNCE ROLÜ (KİMLİĞİ) SİSTEMDEN ÇEKİYORUZ
  const { role } = useAuth();

  // 2. ROL BAZLI YETKİ KALKANLARı — final karar tablosuna göre
  const isPublic = role === 'PUBLIC';
  const canViewTechnical = ['CUSTOMER', 'AUTHORITY', 'ADMIN'].includes(role);             // kimyasal kompozisyon + mekanik test rakamları (SUPPLIER gizli — Kocaer iç verisi)
  const canDownloadTestReports = ['ADMIN'].includes(role);                                      // test raporu PDF indirme — AUTHORITY göremez (ticari sır; CE belgesi yeterli)
  const canViewSupplyChain = ['AUTHORITY', 'ADMIN'].includes(role);                         // tam tedarik zinciri (SUPPLIER gizli — rekabetçi istihbarat)
  const canViewOwnStage = role === 'SUPPLIER';                                           // SUPPLIER sadece kendi katkısını görür
  const canViewBatchNumber = ['SUPPLIER', 'AUTHORITY', 'ADMIN'].includes(role);             // iç parti takip no
  const canViewFullAddress = ['CUSTOMER', 'SUPPLIER', 'AUTHORITY', 'ADMIN'].includes(role); // üretici & tesis adresi
  const canViewGlnCode = ['SUPPLIER', 'AUTHORITY', 'ADMIN'].includes(role);             // küresel lokasyon no
  const canViewTaxId = ['AUTHORITY', 'ADMIN'].includes(role);                         // vergi no (hassas)
  const canViewVersion = ['AUTHORITY', 'ADMIN'].includes(role);                         // pasaport versiyonu
  const canViewLifecycle = ['AUTHORITY', 'ADMIN'].includes(role);                         // yaşam döngüsü olayları
  const canViewComplianceDetail = ['AUTHORITY', 'ADMIN'].includes(role);                        // ESPR/CBAM zorunlu uyumluluk alanları (denetim)
  const chemicalData = [
    { name: 'Fe (Demir)', value: 98.50, color: '#e2e8f0' }, // Büyük kütle açık gri
    { name: 'Mn (Manganez)', value: 0.80, color: '#3b82f6' }, // Mavi
    { name: 'C (Karbon)', value: 0.25, color: '#ef4444' }, // Kırmızı
    { name: 'Si (Silisyum)', value: 0.20, color: '#eab308' }, // Sarı
    { name: 'P (Fosfor)', value: 0.05, color: '#f97316' }, // Turuncu
    { name: 'S (Kükürt)', value: 0.04, color: '#8b5cf6' }, // Mor
  ];

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      setLoading(true);
      const data = await productService.getProductById(id as string);

      // EKSİK YASAL VERİLERİ (Mock Data) İÇİNE EKLEDİM
      setProduct({
        product_category: 'Structural Steel', // YASAL ZORUNLULUK 1
        production_date: '2024-01-15',
        dismantling_difficulty: 'Easy',
        hazardous_materials: false,
        disposal_instructions: 'Genel çöpe ATMAYIN. Ürün ömrünü tamamladığında yetkili çelik geri dönüşüm tesislerine teslim ediniz.', // YASAL ZORUNLULUK 3
        // ESPR / CBAM zorunlu alanlar
        svhc_free: true,                                    // ESPR Madde 7(5) — SVHC beyanı
        co2_a1a3: '1.85',                                   // CBAM Yönetmeliği 2023/956 — A1-A3 gömülü emisyon
        co2_verification: 'Üçüncü Taraf Doğrulamalı',      // CBAM Madde 4 — doğrulama yöntemi
        production_route: 'EAF (Elektrik Ark Ocağı)',       // CBAM — çelik üretim rotası zorunlu
        en10204_cert_no: '3.1-20240115-001',
        en10204_tip: '3.1',
        test_standard: 'EN 10025-2:2019',
        // EPD
        epd_no: 'EPD-TR-2024-017-EN',
        epd_valid_until: '2027-02-01',
        epd_url: 'https://dpp.kocaersteel.com/docs/epd/IPE100_EPD.pdf',
        epd_standard: 'EN 15804+A2',
        // HS Code
        hs_code: '7216.32',
        // Tedarikçi parti kodu
        tedarikci_parti_kodu: 'ERD-2024-B001',
        // Darbe enerjisi
        impact_energy_j: '47',
        impact_temp_c: '20',
        impact_standard: 'EN 10025-2',
        ...data,
        manufacturer: {
          name: 'Kocaer Çelik San. ve Tic. A.Ş.',
          city: 'Aliağa',
          country: 'Turkey',
          website: 'https://www.kocaersteel.com',     // YASAL ZORUNLULUK 2
          dpp_support_email: 'dpp@kocaersteel.com',   // YASAL ZORUNLULUK 2
          ...data?.manufacturer
        },
        facility: {
          name: 'Aliağa Steel Works',
          ...data?.facility
        },
        supply_chain: data?.supply_chain && data.supply_chain.length > 0 ? data.supply_chain : [
          {
            sequence_number: 1,
            stage_name: 'Raw Material Sourcing',
            stage_date: '2023-12-20',
            traceability_id: 'uuid-98a7f-erd-2023',
            organization: { name: 'Erdemir', role: 'Iron Ore Supplier', location_text: 'Ereğli, Zonguldak', country_code: 'TR' },
            material: { name: 'Steel Billet', quantity: '25.000', unit: 'tonnes', origin_country: 'Turkey' },
            process: { name: 'Melting' }
          },
          {
            sequence_number: 2,
            stage_name: 'Manufacturing & Profiling',
            stage_date: '2024-01-10',
            traceability_id: 'uuid-kcr-ipe-2024',
            organization: { name: 'Kocaer Çelik', role: 'Manufacturer', location_text: 'Aliağa, İzmir', country_code: 'TR' },
            material: { name: 'Structural Steel (IPE 100)', quantity: '1', unit: 'batch', origin_country: 'Turkey' },
            process: { name: 'Hot Rolling' }
          }
        ],
        certifications: data?.certifications && data.certifications.length > 0 ? data.certifications : [
          { cert_type: 'CE Marking', issuer: 'TSE', expiry_date: '2027-01-10' },
          { cert_type: 'ISO 9001', issuer: 'TÜV NORD', expiry_date: '2026-05-20' }
        ],
      });
      
      try {
        const changelog = await apiGetDppChangelog(id as string);
        if (changelog && changelog.length > 0) {
          const mappedHistory = changelog.map((c: any) => ({
            type: c.change_type === 'create' ? 'creation' : 'update',
            timestamp: c.changed_at || new Date().toISOString(),
            operator: c.changed_by || 'mehmet.yilmaz@kocaer.com',
            blockchain_hash: c.tx_hash || '0x3f7a9c2b8e1d4f56a0c3b7e291d5f8a4',
            groups: [
              {
                section: 'Güncellenen Değerler',
                fields: Object.keys(c.changed_fields || {}).map((k: string) => ({
                  field: k,
                  source: 'SAP/ERP',
                })),
              }
            ]
          }));
          setVersionHistory(mappedHistory);
        }
      } catch (err) {
        console.error("Versiyon geçmişi alınamadı, mock kullanılacak:", err);
      }

      setLoading(false);
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50">
        <Spinner size="lg" className="text-blue-600 mb-4" />
        <p className="text-gray-500 font-bold animate-pulse">Pasaport verileri blokzincir'den doğrulanıyor...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50">
        <h1 className="text-3xl font-black text-red-600 mb-2">Pasaport Bulunamadı</h1>
        <p className="text-gray-500 font-medium mb-8">Aradığınız ürün ID'sine ait bir pasaport kaydı sistemde yok.</p>
        <Button onClick={() => router.push('/')}>Dashboard'a Dön</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {!isPublic && (
          <button
            onClick={() => router.push(role === 'ADMIN' ? '/' : '/my-dpps')}
            className="mb-6 text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center gap-2 transition-colors"
          >
            ← {role === 'ADMIN' ? "Dashboard'a Dön" : 'DPP Listem\'e Dön'}
          </button>
        )}

        {/* 1. HERO ALANI */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-200 relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-[11px] font-black tracking-widest border border-green-200 w-max">
                <CheckCircle2 size={14} className="text-green-600" />
                {product.status?.toUpperCase() || 'AKTİF'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-black tracking-widest border border-blue-200 w-max">
                <ShieldCheck size={14} className="text-blue-600" />
                CIRPASS ONAYLI
              </span>
            </div>
            {isPublic ? (
              <button
                onClick={() => router.push(`/login?returnUrl=/dpp/${id}`)}
                className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-200 group"
              >
                <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors shrink-0">
                  <LockKeyhole size={15} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black leading-none">Giriş Yap</p>
                  <p className="text-[10px] font-medium opacity-80 mt-0.5">Tam erişim için</p>
                </div>
              </button>
            ) : (
              <div className="text-right bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                <span className="block text-[10px] text-blue-500 font-bold uppercase tracking-wider">Yetki</span>
                <span className="block text-sm font-black text-blue-800">{role}</span>
              </div>
            )}
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight mb-2">
              {product.product_name || 'İsimsiz Ürün'}
            </h1>
            {/* EKSİK 1 TAMAMLANDI: Kategori (Yasal Zorunluluk) */}
            <p className="text-lg font-medium text-gray-500 mb-5">{product.product_category}</p>

            <div className="flex flex-col gap-2 items-start">
              <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-400 uppercase text-xs">GTIN:</span>
                <span className="font-mono font-bold text-gray-900">{product.gtin || '8691234567890'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <span className="font-bold text-gray-400 uppercase text-xs">Parti:</span>
                <span className="font-mono font-bold text-gray-900">{product.id}</span>
              </div>
              {canViewBatchNumber && product.batch_number && (
                <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  <span className="font-bold text-gray-400 uppercase text-xs">Batch:</span>
                  <span className="font-mono font-bold text-gray-900">{product.batch_number}</span>
                </div>
              )}
              {product.valid_until && (
                <div className="flex items-center gap-2 text-sm bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                  <span className="font-bold text-green-500 uppercase text-xs">Geçerlilik:</span>
                  <span className="font-mono font-bold text-green-800">{product.valid_until}</span>
                </div>
              )}
              {product.hs_code && (
                <div className="flex items-center gap-2 text-sm bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  <span className="font-bold text-amber-600 uppercase text-xs">HS:</span>
                  <span className="font-mono font-bold text-amber-800">{product.hs_code}</span>
                  <span className="text-[9px] font-black bg-amber-200 text-amber-800 px-1 py-0.5 rounded">GTİP</span>
                </div>
              )}
              {canViewVersion && product.version && (
                <div className="flex items-center gap-2 text-sm bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
                  <GitBranch size={12} className="text-purple-400" />
                  <span className="font-bold text-purple-400 uppercase text-xs">v{product.version}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ANA IZGARA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* SOL KOLON */}
          <div className="lg:col-span-2 space-y-8">

            {/* 2. ÜRETİCİ BİLGİLERİ */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Factory size={16} className="text-blue-600" />
                Üretim Bilgileri
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-start gap-4 mb-3">
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100"><Factory size={20} className="text-gray-600" /></div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold mb-0.5">Üretici Firma</p>
                      <p className="text-sm font-black text-gray-900">{product.manufacturer?.name || 'Kocaer Çelik'}</p>
                      <p className="text-xs text-gray-500 mt-1">{product.manufacturer?.city}, {product.manufacturer?.country}</p>
                    </div>
                  </div>
                  {/* EKSİK 2 TAMAMLANDI: İletişim Noktası (Yasal Zorunluluk) */}
                  <div className="ml-14 space-y-2 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                      <Globe size={14} />
                      <a href={product.manufacturer?.website} target="_blank" rel="noreferrer" className="hover:underline">
                        {product.manufacturer?.website?.replace('https://', '')}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                      <Mail size={14} />
                      <a href={`mailto:${product.manufacturer?.dpp_support_email}`} className="hover:underline">
                        {product.manufacturer?.dpp_support_email}
                      </a>
                    </div>
                    {canViewFullAddress && product.manufacturer?.address && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <MapPin size={14} />
                        {product.manufacturer.address}
                      </div>
                    )}
                    {canViewTaxId && product.manufacturer?.tax_id && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <Hash size={14} />
                        Vergi No: <span className="font-mono">{product.manufacturer.tax_id}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100"><Calendar size={20} className="text-gray-600" /></div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold mb-0.5">Üretim Tarihi & Tesis</p>
                    <p className="text-sm font-black text-gray-900">{product.production_date}</p>
                    <p className="text-xs text-gray-500 mt-1">{product.facility?.name}</p>
                    {canViewGlnCode && product.facility?.gln_code && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">GLN: {product.facility.gln_code}</p>
                    )}
                    {canViewFullAddress && product.facility?.address && (
                      <p className="text-xs text-gray-400 mt-1">{product.facility.address}</p>
                    )}
                    {canViewComplianceDetail && product.production_route && (
                      <p className="text-xs text-orange-600 font-bold mt-2 flex items-center gap-1">
                        <Flame size={12} /> {product.production_route}
                        <span className="ml-1 text-[10px] font-black bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">CBAM</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. BOYUTSAL VE TEMEL ÖZELLİKLER */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Scale size={16} className="text-blue-600" />
                Temel Özellikler
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Çelik Kalitesi</p>
                  <p className="text-lg font-black text-blue-700">{product.steel_grade}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Standart</p>
                  <p className="text-sm font-black text-gray-900">{product.material_standard}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Metre Ağırlığı</p>
                  <p className="text-lg font-black text-gray-900">{product.weight_per_meter_kg} <span className="text-xs text-gray-500">kg/m</span></p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Ebatlar</p>
                  <p className="text-sm font-black text-gray-900">100x55 <span className="text-xs text-gray-500">mm</span></p>
                </div>
              </div>
            </div>

            {/* 4. SERTİFİKALAR */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Award size={16} className="text-yellow-500" />
                Sertifikalar ve Uyumluluk
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* EN 10204 Test Sertifikası — AUTHORITY/ADMIN denetim referansı (zorunlu) */}
                {canViewComplianceDetail && product.en10204_cert_no && (
                  <div className="flex items-start justify-between p-4 border border-blue-200 rounded-2xl bg-blue-50/40 md:col-span-2">
                    <div>
                      <p className="font-bold text-gray-900 flex items-center gap-2">
                        EN 10204 Test Sertifikası
                        <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded">ESPR</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Tip <span className="font-black text-blue-700">{product.en10204_tip}</span>
                        {' '}— No: <span className="font-mono font-bold">{product.en10204_cert_no}</span>
                      </p>
                      {product.test_standard && (
                        <p className="text-xs text-gray-400 mt-0.5">Standart: {product.test_standard}</p>
                      )}
                    </div>
                    <CheckCircle2 size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  </div>
                )}
                {product.certifications?.map((cert: any, index: number) => (
                  <div key={index} className="flex items-start justify-between p-4 border border-gray-100 rounded-2xl hover:border-blue-200 transition-colors group">
                    <div>
                      <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{cert.cert_type}</p>
                      <p className="text-xs text-gray-500 mt-1">{cert.issuer} • Geçerlilik: {cert.expiry_date}</p>
                      {canViewTechnical && cert.cert_number && (
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">Belge No: {cert.cert_number}</p>
                      )}
                      {canViewTechnical && cert.issue_date && (
                        <p className="text-xs text-gray-400 mt-0.5">Veriliş: {cert.issue_date}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-blue-600" />
                      </div>
                      {canViewTechnical && cert.document_url && (
                        <a
                          href={cert.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Download size={11} /> PDF
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. MÜHENDİSLİK VERİLERİ ACCORDION (Sadece Yetkililer!) */}
            {canViewTechnical && (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden transition-all">
                <button onClick={() => setIsTechnicalOpen(!isTechnicalOpen)} className="w-full p-6 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors outline-none">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100"><FlaskConical size={24} className="text-blue-600" /></div>
                    <div className="text-left">
                      <h3 className="text-lg font-black text-gray-900">Mühendislik & Laboratuvar Raporları</h3>
                      <p className="text-xs text-gray-500 font-bold mt-0.5">Mekanik dayanım testleri ve kimyasal alaşım oranları</p>
                    </div>
                  </div>
                  <div className={`p-2 rounded-full bg-gray-100 transition-transform duration-300 ${isTechnicalOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} className="text-gray-500" />
                  </div>
                </button>
                {isTechnicalOpen && (
                  <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                      {/* SOL TARAF: KİMYASAL KOMPOZİSYON (PASTA GRAFİK) */}
                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <FlaskConical size={14} />
                          Kimyasal Kompozisyon (Alaşımlar)
                        </h4>

                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chemicalData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60} // Ortası boş (Donut) görünümü için
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                              >
                                {chemicalData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number) => [`%${value.toFixed(2)}`, 'Oran']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              />
                              <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Alaşımların liste hali (Özet) */}
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {chemicalData.filter(d => d.name !== 'Fe (Demir)').map((item, idx) => (
                            <div key={idx} className="bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                              <span className="block text-[10px] text-gray-500 font-bold">{item.name.split(' ')[0]}</span>
                              <span className="block text-xs font-black text-gray-900">%{(item.value).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SAĞ TARAF: DİĞER ADIMLAR İÇİN YER TUTUCU */}
                      <div className="flex flex-col gap-6">

                        {/* 1. Mekanik Özellikler */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Scale size={14} />
                            Mekanik Özellikler (Dayanım)
                          </h4>

                          <ul className="space-y-3">
                            {/* Akma Dayanımı */}
                            <li className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-gray-600 font-bold text-xs">Akma Dayanımı (Yield)</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded font-black tracking-wider">MİN: 275</span>
                                <span className="font-black text-blue-700 text-sm">285 <span className="text-[10px] text-gray-400">MPa</span></span>
                              </div>
                            </li>

                            {/* Çekme Dayanımı */}
                            <li className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-gray-600 font-bold text-xs">Çekme Dayanımı (Tensile)</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded font-black tracking-wider">MİN: 410</span>
                                <span className="font-black text-blue-700 text-sm">450 <span className="text-[10px] text-gray-400">MPa</span></span>
                              </div>
                            </li>

                            {/* Uzama */}
                            <li className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-gray-600 font-bold text-xs">Uzama Oranı (Elongation)</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded font-black tracking-wider">MİN: %23</span>
                                <span className="font-black text-blue-700 text-sm">%25</span>
                              </div>
                            </li>
                            {/* Darbe Enerjisi — EN 10025-2 zorunlu */}
                            {product.impact_energy_j && (
                              <li className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <span className="text-gray-600 font-bold text-xs">Darbe Enerjisi (Charpy)</span>
                                  <span className="block text-[10px] text-gray-400 mt-0.5">{product.impact_temp_c}°C — {product.impact_standard}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded font-black tracking-wider">MİN: 27 J</span>
                                  <span className="font-black text-blue-700 text-sm">{product.impact_energy_j} <span className="text-[10px] text-gray-400">J</span></span>
                                </div>
                              </li>
                            )}
                          </ul>
                        </div>

                        {/* 2. Laboratuvar ve Test Raporları (PDF İndirme) */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex-1">
                          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FileText size={14} />
                            Resmi Test Raporları
                          </h4>

                          {canDownloadTestReports ? (
                            <div className="space-y-3">
                              <button className="w-full flex items-center justify-between p-3 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl transition-colors group">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600 group-hover:scale-110 transition-transform"><FileText size={16} /></div>
                                  <div className="text-left">
                                    <p className="text-xs font-black text-gray-900">Mekanik Özellikler Testi</p>
                                    <p className="text-[10px] font-bold text-gray-500">EN 10025-2 Standardı</p>
                                  </div>
                                </div>
                                <Download size={16} className="text-blue-500 group-hover:translate-y-0.5 transition-transform" />
                              </button>

                              <button className="w-full flex items-center justify-between p-3 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl transition-colors group">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600 group-hover:scale-110 transition-transform"><FileText size={16} /></div>
                                  <div className="text-left">
                                    <p className="text-xs font-black text-gray-900">Kimyasal Bileşim Analizi</p>
                                    <p className="text-[10px] font-bold text-gray-500">Spektrometre Raporu</p>
                                  </div>
                                </div>
                                <Download size={16} className="text-blue-500 group-hover:translate-y-0.5 transition-transform" />
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                              <p className="text-xs text-gray-400 font-bold">Bu belgeler ticari sır kapsamındadır.</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">CE sertifikası uyumluluk doğrulaması için yeterlidir.</p>
                            </div>
                          )}
                        </div>

                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. TEDARİK ZİNCİRİ (Sadece Yetkili Roller!) */}
            {canViewSupplyChain && product.supply_chain && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                  <Milestone size={120} className="text-blue-900" />
                </div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-2 relative z-10 border-b border-gray-100 pb-4">
                  <Milestone size={20} className="text-blue-600" />
                  Tedarik Zinciri ve İzlenebilirlik Raporu
                </h3>
                <div className="relative border-l-2 border-gray-100 ml-4 md:ml-6 space-y-10 mt-6">
                  {product.supply_chain.map((stage: any, index: number) => (
                    <div key={index} className="relative pl-8 md:pl-10 group">
                      <div className="absolute -left-[21px] top-1 bg-white border-4 border-gray-200 w-10 h-10 rounded-full flex items-center justify-center group-hover:border-blue-500 group-hover:bg-blue-50 transition-colors z-10 shadow-sm">
                        {stage.sequence_number === 1 ? <Flame size={16} className="text-gray-500 group-hover:text-orange-600" /> : <Factory size={16} className="text-gray-500 group-hover:text-green-600" />}
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-md tracking-widest uppercase">
                              ADIM {stage.sequence_number}
                            </span>
                            <span className="font-bold text-gray-900 text-sm">{stage.stage_name}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                            <Calendar size={12} /> {stage.stage_date}
                          </span>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3 flex items-center gap-1.5"><MapPin size={12} /> Organizasyon</p>
                            <p className="text-base font-black text-gray-900">{stage.organization.name}</p>
                            <p className="text-xs font-bold text-blue-600 mt-0.5">{stage.organization.role}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 font-medium">
                              <Globe2 size={12} /> {stage.organization.location_text} ({stage.organization.country_code})
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3 flex items-center gap-1.5"><Box size={12} /> Malzeme & İşlem</p>
                            <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              {stage.process.name} <span className="text-gray-300">→</span> {stage.material.name}
                            </p>
                            <div className="flex gap-4 mt-2">
                              <div className="bg-gray-50 px-3 py-1.5 rounded border border-gray-100">
                                <span className="block text-[10px] text-gray-500 font-bold uppercase">Miktar</span>
                                <span className="text-xs font-black text-gray-900">{stage.material.quantity} {stage.material.unit}</span>
                              </div>
                              <div className="bg-gray-50 px-3 py-1.5 rounded border border-gray-100">
                                <span className="block text-[10px] text-gray-500 font-bold uppercase">Menşei</span>
                                <span className="text-xs font-black text-gray-900">{stage.material.origin_country}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-1.5">
                          <div className="flex items-center gap-2">
                            <Hash size={12} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Traceability ID:</span>
                            <span className="text-[11px] font-mono text-slate-700 font-bold">{stage.traceability_id}</span>
                          </div>
                          {stage.sequence_number === 1 && product.tedarikci_parti_kodu && (
                            <div className="flex items-center gap-2">
                              <Hash size={12} className="text-orange-400" />
                              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Tedarikçi Parti Kodu:</span>
                              <span className="text-[11px] font-mono text-orange-700 font-bold">{product.tedarikci_parti_kodu}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* 6b. SUPPLIER'IN KATKISI — sadece SUPPLIER (tam zincir gizli) */}
            {canViewOwnStage && product.supply_chain && (
              <div className="bg-white p-6 rounded-3xl border border-orange-200 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-4">
                  <Milestone size={18} className="text-orange-500" />
                  Bu Ürüne Katkınız
                </h3>
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1">Tedarik Ettiğiniz Aşama</p>
                  <p className="text-sm font-black text-gray-900">{product.supply_chain[0]?.stage_name}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600 font-medium">
                    <span>📦 {product.supply_chain[0]?.material?.name} — {product.supply_chain[0]?.material?.quantity} {product.supply_chain[0]?.material?.unit}</span>
                    <span>🗓 {product.supply_chain[0]?.stage_date}</span>
                    <span>🌍 {product.supply_chain[0]?.material?.origin_country}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-medium mt-3 text-center">
                  Tedarik zincirinin tamamı gizlidir. Yalnızca kendi katkınız görüntülenmektedir.
                </p>
              </div>
            )}

            {/* 7. YAŞAM DÖNGÜSÜ OLAYLARI — sadece AUTHORITY & ADMIN */}
            {canViewLifecycle && product.lifecycle_events && product.lifecycle_events.length > 0 && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-2 border-b border-gray-100 pb-4">
                  <Activity size={20} className="text-purple-600" />
                  Yaşam Döngüsü Olayları
                </h3>
                <div className="relative border-l-2 border-gray-100 ml-4 space-y-6">
                  {product.lifecycle_events.map((event: any, index: number) => (
                    <div key={index} className="relative pl-8">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-purple-300 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 block" />
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{event.event_type}</span>
                          <span className="text-[10px] text-gray-400 font-bold">{event.event_date}</span>
                        </div>
                        {event.description && (
                          <p className="text-sm font-bold text-gray-800 mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400 font-medium">
                          {event.performed_by && <span>→ {event.performed_by}</span>}
                          {event.location && <span>📍 {event.location}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* SAĞ KOLON */}
          <div className="space-y-8">

            {/* SÜRDÜRÜLEBİLİRLİK */}
            <div className="bg-white p-6 rounded-3xl border border-green-200 shadow-sm bg-gradient-to-b from-white to-green-50/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Leaf size={64} className="text-green-600" /></div>
              <h3 className="text-lg font-black text-green-900 mb-6 flex items-center gap-2"><Leaf size={20} className="text-green-600" /> Sustainability (EPD)</h3>
              <div className="mb-5 relative z-10">
                <div className="flex justify-between text-sm mb-1.5"><span className="font-bold text-gray-700">Recycled Content</span><span className="font-black text-green-700">{product.recycled_content_pct || 35}%</span></div>
                <div className="w-full bg-green-100 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${product.recycled_content_pct || 35}%` }}></div></div>
              </div>
              <div className="mb-6 relative z-10">
                <div className="flex justify-between text-sm mb-1.5"><span className="font-bold text-gray-700">Recyclability</span><span className="font-black text-blue-700">{product.recyclability_pct || 100}%</span></div>
                <div className="w-full bg-blue-100 rounded-full h-2.5"><div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${product.recyclability_pct || 100}%` }}></div></div>
              </div>
              <div className="mt-6 p-5 bg-green-100/60 rounded-2xl border border-green-200 relative z-10">
                <p className="text-[10px] text-green-800 uppercase font-black tracking-widest mb-1">
                  CO₂ A1–A3
                  <span className="ml-1.5 text-[9px] font-black bg-green-700 text-white px-1.5 py-0.5 rounded">ESPR / CBAM</span>
                </p>
                <p className="text-2xl font-black text-green-950">
                  {product.co2_a1a3 || product.co2_cradle_to_gate_kg || '1.85'}{' '}
                  <span className="text-xs font-bold text-green-700">kg CO₂e/kg</span>
                </p>
                {product.co2_verification && (
                  <p className="text-[11px] text-green-700 font-bold mt-1.5 flex items-center gap-1">
                    <ShieldCheck size={12} /> {product.co2_verification}
                  </p>
                )}
              </div>
            </div>

            {/* EPD — ESPR ZORUNLU */}
            {canViewComplianceDetail && product.epd_no && (
              <div className="bg-white p-6 rounded-3xl border border-blue-200 shadow-sm">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileText size={14} className="text-blue-600" />
                  Çevre Ürün Beyanı (EPD)
                  <span className="ml-auto text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded">ESPR</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500">Belge Numarası</span>
                    <span className="text-xs font-mono font-black text-gray-900">{product.epd_no}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500">Standart</span>
                    <span className="text-xs font-black text-gray-900">{product.epd_standard}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500">Geçerlilik</span>
                    <span className={`text-xs font-black ${new Date(product.epd_valid_until) > new Date() ? 'text-green-700' : 'text-red-600'}`}>
                      {product.epd_valid_until}
                      {new Date(product.epd_valid_until) > new Date()
                        ? <span className="ml-1.5 text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-black">Geçerli</span>
                        : <span className="ml-1.5 text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black">Süresi Dolmuş</span>
                      }
                    </span>
                  </div>
                  {product.epd_url && (
                    <a href={product.epd_url} target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-sm font-bold text-blue-700 transition-colors mt-1">
                      <Download size={14} /> EPD Belgesini İndir
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ÖMÜR SONU */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                <Recycle size={16} className="text-gray-500" />
                Ömür Sonu İşlemleri
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div className="bg-blue-100 p-2 rounded-lg"><Recycle size={16} className="text-blue-700" /></div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold">Söküm Zorluğu</p>
                    <p className="text-sm font-black text-blue-900">{product.dismantling_difficulty === 'Easy' ? 'Kolay Sökülebilir' : product.dismantling_difficulty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50/50 rounded-xl border border-green-100">
                  <div className="bg-green-100 p-2 rounded-lg"><AlertTriangle size={16} className="text-green-700" /></div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold">Tehlikeli Madde</p>
                    <p className="text-sm font-black text-green-900">{product.hazardous_materials ? 'İçerir' : 'İçermez (Güvenli)'}</p>
                  </div>
                </div>
                {/* EKSİK 3 TAMAMLANDI: İmha ve Geri Dönüşüm Talimatı (Yasal Zorunluluk) */}
                <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[10px] text-gray-500 uppercase font-black flex items-center gap-1.5 mb-1">
                    <Info size={12} />
                    İmha / Geri Dönüşüm Talimatı
                  </p>
                  <p className="text-xs text-gray-700 font-medium leading-relaxed">
                    {product.disposal_instructions}
                  </p>
                </div>
                {/* ESPR Madde 7(5) — SVHC / REACH beyanı (zorunlu) */}
                <div className={`mt-3 p-3 rounded-xl border flex items-center gap-3 ${product.svhc_free ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                  <div className={`p-2 rounded-lg shrink-0 ${product.svhc_free ? 'bg-green-100' : 'bg-red-100'}`}>
                    <ShieldCheck size={16} className={product.svhc_free ? 'text-green-700' : 'text-red-700'} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-black">
                      SVHC / REACH — Madde 7(5)
                      <span className="ml-1.5 text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded">ESPR</span>
                    </p>
                    <p className={`text-sm font-black ${product.svhc_free ? 'text-green-800' : 'text-red-700'}`}>
                      {product.svhc_free ? 'SVHC İçermez — REACH Uyumlu' : 'Tehlikeli Madde İçeriyor'}
                    </p>
                  </div>
                </div>

                {/* Tehlikeli madde detay listesi — sadece varsa ve AUTHORITY/ADMIN */}
                {canViewComplianceDetail && product.hazardous_materials && product.hazardous_substances?.length > 0 && (
                  <div className="mt-3 border border-red-200 rounded-2xl overflow-hidden">
                    <div className="bg-red-50 px-4 py-2 flex items-center gap-2 border-b border-red-200">
                      <AlertTriangle size={13} className="text-red-600" />
                      <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">REACH Madde 33 — Tehlikeli Madde Beyanı</span>
                    </div>
                    <div className="divide-y divide-red-100">
                      {product.hazardous_substances.map((s: any, i: number) => (
                        <div key={i} className="px-4 py-3 grid grid-cols-3 gap-3 bg-white">
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Madde</p>
                            <p className="text-xs font-black text-gray-900">{s.name}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">CAS No</p>
                            <p className="text-xs font-mono font-bold text-gray-700">{s.cas_no}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Konsantrasyon</p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black text-red-700">%{s.concentration_pct}</p>
                              {s.svhc && <span className="text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded">SVHC</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* QR KOD MODÜLÜ */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><QrCode size={14} />Digital Identity</h3>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://dpp.kocaer.com/verify/${product.id}`} alt="DPP QR Code" className="w-36 h-36" /></div>
            </div>

          </div>
        </div>

        {/* VERSİYON GEÇMİŞİ & BLOKZİNCİR DENETİMİ — AUTHORITY & ADMIN */}
        {canViewVersion && (
          <div className="mt-8 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Başlık — her zaman görünür */}
            <button
              onClick={() => setIsVersionHistoryOpen(v => !v)}
              className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-xl">
                  <GitBranch size={16} className="text-purple-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black text-gray-900">Versiyon Geçmişi & Blockchain Denetimi</h3>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                    {versionHistory.length} kayıt · Son: {versionHistory[versionHistory.length - 1]?.timestamp.split('T')[0]}
                  </p>
                </div>
              </div>
              <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${isVersionHistoryOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* İçerik — kapalıyken peek, açıkken tam */}
            <div className="border-t border-gray-100">
              <div className={`relative ${!isVersionHistoryOpen ? 'max-h-52 overflow-hidden' : ''}`}>
                <div className="px-6 py-5 space-y-6">
                  {versionHistory.map((entry, i) => (
                    <div key={i} className="relative flex gap-4">
                      {/* Zaman çizelgesi çizgisi */}
                      {i < versionHistory.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-100" />
                      )}
                      {/* Nokta */}
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 ${
                        entry.type === 'creation'
                          ? 'bg-purple-50 border-purple-300'
                          : 'bg-blue-50 border-blue-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${entry.type === 'creation' ? 'bg-purple-500' : 'bg-blue-400'}`} />
                      </div>
                      {/* İçerik */}
                      <div className="flex-1 min-w-0 pb-2">
                        {/* Başlık satırı */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                            entry.type === 'creation'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}>
                            {entry.type === 'creation' ? 'DPP Oluşturuldu' : 'DPP Güncellendi'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {entry.timestamp.replace('T', ' ').replace('Z', '')}
                          </span>
                          <span className="text-[10px] text-gray-400">·</span>
                          <span className="text-[10px] text-gray-500 font-medium">{entry.operator}</span>
                        </div>
                        {/* Blockchain damgası */}
                        <div className="flex items-center gap-1.5 mb-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 w-fit">
                          <ShieldCheck size={11} className="text-green-600 shrink-0" />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Blockchain:</span>
                          <span className="text-[10px] font-mono text-gray-600 truncate max-w-[220px]">{entry.blockchain_hash}</span>
                        </div>
                        {/* Per-field kaynak etiketleri — bölüm gruplarıyla */}
                        <div className="space-y-3">
                          {entry.groups.map((group, gi) => (
                            <div key={gi}>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                {group.section}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {group.fields.map((f, fi) => {
                                  const cfg = SOURCE_CFG[f.source] ?? SOURCE_CFG['Manuel'];
                                  return (
                                    <span
                                      key={fi}
                                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                                    >
                                      <span className="font-black">{f.source}</span>
                                      <span className="opacity-30 mx-0.5">·</span>
                                      <span className="font-medium">{f.field}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gradient + Genişlet butonu — sadece kapalıyken */}
                {!isVersionHistoryOpen && (
                  <>
                    <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 inset-x-0 flex justify-center">
                      <button
                        onClick={() => setIsVersionHistoryOpen(true)}
                        className="text-xs font-black text-purple-600 hover:text-purple-800 transition-colors bg-white px-5 py-1.5 rounded-full border border-purple-200 shadow-sm"
                      >
                        Genişlet
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Daralt butonu — sadece açıkken */}
              {isVersionHistoryOpen && (
                <div className="flex justify-center py-4 border-t border-gray-100">
                  <button
                    onClick={() => setIsVersionHistoryOpen(false)}
                    className="text-xs font-black text-gray-400 hover:text-gray-600 transition-colors px-5 py-1.5 rounded-full border border-gray-200"
                  >
                    Daralt
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}