// src/pages/supply-chain/index.tsx
import { useState, useMemo, Fragment } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import {
  supplierVerifications,
  supplyChainKPIs,
  monthlyCO2Trend,
  transportDistribution,
  SupplierVerification,
} from '../../constants/supplyChainData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  ShieldCheck, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Clock, XCircle, Search, ArrowRight, Truck,
  Factory, FileCheck, BarChart3, Activity, Eye, ChevronDown,
  Leaf, Globe, Award,
} from 'lucide-react';

/* ── Yardımcı Fonksiyonlar ────────────────────────────────────────────────── */

function scoreBg(score: number) {
  if (score >= 90) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 75) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function statusBadge(status: SupplierVerification['status']) {
  const map = {
    'Doğrulanmış': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Beklemede': 'bg-amber-100 text-amber-800 border-amber-300',
    'İncelemede': 'bg-blue-100 text-blue-800 border-blue-300',
    'Reddedilmiş': 'bg-red-100 text-red-800 border-red-300',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

function riskBadge(risk: SupplierVerification['riskLevel']) {
  const map = {
    'Düşük': 'bg-emerald-100 text-emerald-800',
    'Orta': 'bg-amber-100 text-amber-800',
    'Yüksek': 'bg-red-100 text-red-800',
  };
  return map[risk] || 'bg-gray-100 text-gray-700';
}

function trendIcon(trend: 'up' | 'down' | 'stable') {
  if (trend === 'up') return <TrendingUp size={14} className="text-emerald-500" />;
  if (trend === 'down') return <TrendingDown size={14} className="text-red-500" />;
  return <Minus size={14} className="text-gray-400" />;
}

function ProgressBar({ value, max = 100, color = 'bg-emerald-500' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── CUSTOM TOOLTIP ───────────────────────────────────────────────────────── */

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg px-4 py-3">
      <p className="text-xs font-bold text-gray-500 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold text-gray-900">{p.value.toLocaleString('tr-TR')} kg</span>
        </div>
      ))}
    </div>
  );
}

/* ── ANA SAYFA ────────────────────────────────────────────────────────────── */

export default function SupplyChainDashboard() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const kpi = supplyChainKPIs;

  const filtered = useMemo(() => {
    return supplierVerifications.filter((s) => {
      const matchSearch =
        !search ||
        s.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase()) ||
        s.location.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || s.status === statusFilter;
      const matchRisk = !riskFilter || s.riskLevel === riskFilter;
      return matchSearch && matchStatus && matchRisk;
    });
  }, [search, statusFilter, riskFilter]);

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'ENGINEER']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-200">
                  <ShieldCheck size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                    Veri Güvenilirliği & Doğrulama
                  </h1>
                  <p className="text-sm text-gray-500 font-medium">
                    Tedarik Zinciri Performans Merkezi — Kocaer Çelik
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/supply-chain/logistics')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:shadow-blue-200"
            >
              <Truck size={16} />
              Lojistik Emisyon Rotaları
              <ArrowRight size={14} />
            </button>
          </div>

          {/* ── KPI Summary Cards ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: 'Doğrulama Skoru',
                value: `%${kpi.avgVerificationScore.toFixed(1)}`,
                sub: `${kpi.verifiedSuppliers}/${kpi.totalSuppliers} tedarikçi doğrulanmış`,
                icon: <ShieldCheck size={20} />,
                gradient: 'from-emerald-500 to-teal-600',
                shadow: 'shadow-emerald-200',
              },
              {
                label: 'Veri Bütünlüğü',
                value: `%${kpi.dataCompleteness.toFixed(1)}`,
                sub: 'Ortalama veri tamamlanma oranı',
                icon: <FileCheck size={20} />,
                gradient: 'from-blue-500 to-indigo-600',
                shadow: 'shadow-blue-200',
              },
              {
                label: 'Uyumluluk Oranı',
                value: `%${kpi.complianceRate.toFixed(1)}`,
                sub: 'CBAM / REACH uyumlu tedarikçi',
                icon: <Award size={20} />,
                gradient: 'from-violet-500 to-purple-600',
                shadow: 'shadow-violet-200',
              },
              {
                label: 'Toplam CO₂ Emisyonu',
                value: `${(kpi.totalCO2_kg / 1000).toFixed(1)}t`,
                sub: `${kpi.totalRoutes} aktif rota üzerinden`,
                icon: <Leaf size={20} />,
                gradient: 'from-amber-500 to-orange-600',
                shadow: 'shadow-amber-200',
              },
            ].map((card, i) => (
              <div
                key={i}
                className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 bg-gradient-to-br ${card.gradient} rounded-xl shadow-md ${card.shadow} text-white`}>
                    {card.icon}
                  </div>
                </div>
                <p className="text-2xl font-black text-gray-900 mb-1">{card.value}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
                <p className="text-xs text-gray-500">{card.sub}</p>
                <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-5 bg-gradient-to-br ${card.gradient}`} />
              </div>
            ))}
          </div>

          {/* ── Charts Row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            {/* Aylık CO₂ Trend */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={16} className="text-emerald-600" />
                <h3 className="text-sm font-black text-gray-900">Aylık CO₂ Emisyon Trendi</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">Taşıma tipine göre aylık karbon salınımı (kg)</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyCO2Trend} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                  />
                  <Bar dataKey="karayolu" name="Karayolu" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="denizyolu" name="Denizyolu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="demiryolu" name="Demiryolu" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Taşıma Tipi Dağılımı Pie */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <Globe size={16} className="text-blue-600" />
                <h3 className="text-sm font-black text-gray-900">Taşıma Dağılımı</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">Rota yüzdeleri ve CO₂ payları</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={transportDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="value"
                    stroke="none"
                  >
                    {transportDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, props: any) => [
                      `%${value} rota — %${props.payload.co2Share} CO₂`,
                      props.payload.name,
                    ]}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e5e7eb' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {transportDistribution.map((t) => (
                  <div key={t.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="text-gray-600">{t.name}</span>
                    <span className="font-bold text-gray-900 ml-auto">%{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Secondary Charts ────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Doğrulama Skoru Dağılımı */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-violet-600" />
                <h3 className="text-sm font-black text-gray-900">Tedarikçi Doğrulama Skorları</h3>
              </div>
              <div className="space-y-3">
                {supplierVerifications.slice(0, 6).map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium w-32 truncate">{s.supplierName.split(' ')[0]}</span>
                    <div className="flex-1">
                      <ProgressBar
                        value={s.verificationScore}
                        color={
                          s.verificationScore >= 90
                            ? 'bg-emerald-500'
                            : s.verificationScore >= 75
                            ? 'bg-blue-500'
                            : s.verificationScore >= 60
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }
                      />
                    </div>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${scoreBg(s.verificationScore)}`}>
                      {s.verificationScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Toplam Trend Line */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-emerald-600" />
                <h3 className="text-sm font-black text-gray-900">Toplam CO₂ Trendi</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">6 aylık toplam emisyon seyri</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyCO2Trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="toplam" name="Toplam CO₂" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Tedarikçi Tablosu ───────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Factory size={16} className="text-emerald-600" />
                  <h3 className="text-sm font-black text-gray-900">Tedarikçi Doğrulama Performansı</h3>
                  <span className="text-xs text-gray-400 font-medium">({filtered.length} kayıt)</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Tedarikçi ara..."
                      className="pl-9 pr-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white w-48"
                    />
                  </div>
                  {/* Status Filter */}
                  <div className="relative">
                    <select
                      value={statusFilter || ''}
                      onChange={(e) => setStatusFilter(e.target.value || null)}
                      className="appearance-none pl-3 pr-8 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">Tüm Durumlar</option>
                      <option value="Doğrulanmış">Doğrulanmış</option>
                      <option value="Beklemede">Beklemede</option>
                      <option value="İncelemede">İncelemede</option>
                      <option value="Reddedilmiş">Reddedilmiş</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {/* Risk Filter */}
                  <div className="relative">
                    <select
                      value={riskFilter || ''}
                      onChange={(e) => setRiskFilter(e.target.value || null)}
                      className="appearance-none pl-3 pr-8 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">Tüm Riskler</option>
                      <option value="Düşük">Düşük Risk</option>
                      <option value="Orta">Orta Risk</option>
                      <option value="Yüksek">Yüksek Risk</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-6 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Tedarikçi</th>
                    <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Kategori</th>
                    <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Doğrulama</th>
                    <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">CO₂ Skor</th>
                    <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Veri</th>
                    <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Risk</th>
                    <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Durum</th>
                    <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Trend</th>
                    <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((s) => (
                    <Fragment key={s.id}>
                      <tr
                        className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0">
                              <Factory size={14} className="text-emerald-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{s.supplierName}</p>
                              <p className="text-[11px] text-gray-400">{s.location}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-600 font-medium">{s.category}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${scoreBg(s.verificationScore)}`}>
                            {s.verificationScore}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${scoreBg(s.co2Score)}`}>
                            {s.co2Score}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-center gap-1">
                            <ProgressBar
                              value={s.dataCompleteness}
                              color={s.dataCompleteness >= 90 ? 'bg-emerald-500' : s.dataCompleteness >= 75 ? 'bg-blue-500' : 'bg-amber-500'}
                            />
                            <span className="text-[10px] text-gray-400 font-bold">%{s.dataCompleteness}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${riskBadge(s.riskLevel)}`}>
                            {s.riskLevel}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${statusBadge(s.status)}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">{trendIcon(s.trend)}</td>
                        <td className="px-4 py-4 text-center">
                          <button className="p-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                            <Eye size={14} className="text-gray-400" />
                          </button>
                        </td>
                      </tr>
                      {/* Expanded Detail */}
                      {expandedId === s.id && (
                        <tr key={`${s.id}-detail`}>
                          <td colSpan={9} className="px-6 py-4 bg-gradient-to-r from-emerald-50/50 to-teal-50/30">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Son Denetim</p>
                                <p className="text-sm font-bold text-gray-900">
                                  {new Date(s.lastAuditDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Yanıt Süresi</p>
                                <p className="text-sm font-bold text-gray-900">{s.responseTime} saat</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Sertifikalar</p>
                                <div className="flex flex-wrap gap-1">
                                  {s.certifications.map((c) => (
                                    <span key={c} className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-600">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Doğrulama Detayı</p>
                                <div className="flex gap-3">
                                  <div className="text-center">
                                    <p className="text-lg font-black text-emerald-600">{s.verificationScore}</p>
                                    <p className="text-[9px] text-gray-400 font-bold">GENEL</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-lg font-black text-blue-600">{s.co2Score}</p>
                                    <p className="text-[9px] text-gray-400 font-bold">CO₂</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-lg font-black text-violet-600">{s.dataCompleteness}</p>
                                    <p className="text-[9px] text-gray-400 font-bold">VERİ</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-400 text-sm">
                        Filtrelere uyan tedarikçi bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs text-gray-400 font-medium">
                Toplam <span className="font-bold text-gray-600">{filtered.length}</span> tedarikçi listeleniyor
              </p>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span className="text-gray-500">{kpi.verifiedSuppliers} Doğrulanmış</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-amber-500" />
                  <span className="text-gray-500">1 Beklemede</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-red-500" />
                  <span className="text-gray-500">1 Yüksek Risk</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}