// src/pages/supply-chain/logistics.tsx
import dynamic from 'next/dynamic';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
function getAuthHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import {
  logisticsRoutes,
  supplyChainKPIs,
  monthlyCO2Trend,
  LogisticsRoute,
} from '../../constants/supplyChainData';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import {
  Truck, Ship, TrainFront, ArrowLeftRight, MapPin, ArrowLeft,
  Search, ChevronDown, CheckCircle2, Clock, XCircle,
  Route, Fuel, Weight, Timer, Calendar, Building2, Eye, Package,
  Leaf, TrendingDown, Shield, BarChart3, Navigation, Activity,
  Loader2, Globe2, Hash, Edit3, Sparkles, History
} from 'lucide-react';

import SupplierEvaluationModal from '../../components/supply-chain/SupplierEvaluationModal';
import SupplierScoreModal from '../../components/supply-chain/SupplierScoreModal';
import SupplierScoreHistoryModal from '../../components/supply-chain/SupplierScoreHistoryModal';
const LogisticsMap = dynamic(
  () => import('../../components/supply-chain/LogisticsMap'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-200 animate-pulse" />
            <div className="space-y-1.5">
              <div className="w-40 h-3 bg-gray-200 rounded animate-pulse" />
              <div className="w-60 h-2.5 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="h-[460px] bg-gray-50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Harita yükleniyor...
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/40 h-10 animate-pulse" />
      </div>
    ),
  }
);


/* ── Yardımcı ─────────────────────────────────────────────────────────────── */

function transportIcon(type: string) {
  const cls = 'shrink-0';
  switch (type) {
    case 'Karayolu': return <Truck size={15} className={`text-amber-600 ${cls}`} />;
    case 'Denizyolu': return <Ship size={15} className={`text-blue-600 ${cls}`} />;
    case 'Demiryolu': return <TrainFront size={15} className={`text-emerald-600 ${cls}`} />;
    case 'Multimodal': return <ArrowLeftRight size={15} className={`text-violet-600 ${cls}`} />;
    default: return <Truck size={15} className={`text-gray-400 ${cls}`} />;
  }
}

function transportBadgeColor(type: string) {
  switch (type) {
    case 'Karayolu': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Denizyolu': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Demiryolu': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Multimodal': return 'bg-violet-100 text-violet-800 border-violet-200';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'Doğrulanmış': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'Beklemede': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'İncelemede': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Reddedilmiş': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'Doğrulanmış': return <CheckCircle2 size={12} className="text-emerald-600" />;
    case 'Beklemede': return <Clock size={12} className="text-amber-600" />;
    case 'İncelemede': return <Eye size={12} className="text-blue-600" />;
    case 'Reddedilmiş': return <XCircle size={12} className="text-red-600" />;
    default: return null;
  }
}

function riskColor(risk: string) {
  switch (risk) {
    case 'Düşük': return 'bg-emerald-100 text-emerald-800';
    case 'Orta': return 'bg-amber-100 text-amber-800';
    case 'Yüksek': return 'bg-red-100 text-red-800';
    case 'Kritik': return 'bg-red-200 text-red-900';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function reliabilityColor(score: number) {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function reliabilityBg(score: number) {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 75) return 'bg-blue-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function ProgressBar({ value, max = 100, color = 'bg-emerald-500' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg px-4 py-3">
      <p className="text-xs font-bold text-gray-500 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.stroke }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold text-gray-900">{typeof p.value === 'number' ? p.value.toLocaleString('tr-TR') : p.value} kg</span>
        </div>
      ))}
    </div>
  );
}

/* ── Rota Kartı Bileşeni ──────────────────────────────────────────────────── */

function RouteCard({ route, expanded, onToggle }: { route: LogisticsRoute; expanded: boolean; onToggle: () => void }) {
  return (
    <div className={`bg-white rounded-2xl border transition-all duration-300 ${expanded ? 'border-emerald-200 shadow-md shadow-emerald-100' : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'}`}>
      {/* Main Row */}
      <div className="px-5 py-4 cursor-pointer" onClick={onToggle}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Route Info */}
          <div className="flex items-center gap-3 min-w-0 lg:w-[320px]">
            <div className={`p-2 rounded-xl border shrink-0 ${transportBadgeColor(route.transportType)}`}>
              {transportIcon(route.transportType)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{route.routeName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={10} className="text-gray-400 shrink-0" />
                <p className="text-[11px] text-gray-400 truncate">{route.originDetail} → {route.destinationDetail}</p>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-4 flex-wrap lg:flex-1">
            {/* Distance */}
            <div className="flex items-center gap-1.5">
              <Route size={12} className="text-gray-400" />
              <span className="text-xs text-gray-500">{route.distance_km.toLocaleString('tr-TR')} km</span>
            </div>
            {/* CO₂ */}
            <div className="flex items-center gap-1.5">
              <Leaf size={12} className="text-emerald-500" />
              <span className="text-xs font-bold text-gray-700">{route.estimatedCO2_kg.toLocaleString('tr-TR')} kg CO₂</span>
            </div>
            {/* Weight */}
            <div className="flex items-center gap-1.5">
              <Weight size={12} className="text-gray-400" />
              <span className="text-xs text-gray-500">{route.cargoWeight_ton}t</span>
            </div>
            {/* Duration */}
            <div className="flex items-center gap-1.5">
              <Timer size={12} className="text-gray-400" />
              <span className="text-xs text-gray-500">{route.estimatedDuration_hours}s</span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Reliability */}
            <div className="flex items-center gap-1.5 min-w-[60px]">
              <Shield size={12} className={reliabilityColor(route.reliabilityScore)} />
              <span className={`text-xs font-black ${reliabilityColor(route.reliabilityScore)}`}>
                {route.reliabilityScore}
              </span>
            </div>
            {/* Status */}
            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full border ${statusColor(route.verificationStatus)}`}>
              {statusIcon(route.verificationStatus)}
              {route.verificationStatus}
            </span>
            {/* Risk */}
            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${riskColor(route.riskLevel)}`}>
              {route.riskLevel}
            </span>
            {/* Expand */}
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Kalkış</p>
              <div className="flex items-start gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-900">{route.origin}</p>
                  <p className="text-[10px] text-gray-400">{route.originDetail}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Varış</p>
              <div className="flex items-start gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-900">{route.destination}</p>
                  <p className="text-[10px] text-gray-400">{route.destinationDetail}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Yük Tipi</p>
              <div className="flex items-center gap-1.5">
                <Package size={12} className="text-gray-400" />
                <p className="text-xs font-bold text-gray-900">{route.cargoType}</p>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{route.cargoWeight_ton} ton</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Taşıyıcı</p>
              <div className="flex items-center gap-1.5">
                <Building2 size={12} className="text-gray-400" />
                <p className="text-xs font-bold text-gray-900">{route.carrier}</p>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{route.frequency}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">CO₂ / ton·km</p>
              <p className="text-lg font-black text-gray-900">{route.co2PerTon_km}</p>
              <p className="text-[10px] text-gray-400">kg CO₂ / ton·km</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Son Sevkiyat</p>
              <div className="flex items-center gap-1.5">
                <Calendar size={12} className="text-gray-400" />
                <p className="text-xs font-bold text-gray-900">
                  {new Date(route.lastShipmentDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
          {/* Reliability Progress */}
          <div className="mt-4 pt-3 border-t border-gray-50">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Güvenilirlik Skoru</p>
              <p className={`text-xs font-black ${reliabilityColor(route.reliabilityScore)}`}>{route.reliabilityScore}/100</p>
            </div>
            <ProgressBar value={route.reliabilityScore} color={reliabilityBg(route.reliabilityScore)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ANA SAYFA ────────────────────────────────────────────────────────────── */

export default function LogisticsEmissionRoutes() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [transportFilter, setTransportFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // ── Canlı backend verisi: tedarik zinciri organizasyonları ──────────────
  const [liveOrgs, setLiveOrgs] = useState<any[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState(false);

  const [evaluateOrg, setEvaluateOrg] = useState<any>(null);
  const [scoreOrg, setScoreOrg] = useState<any>(null);
  const [historyOrg, setHistoryOrg] = useState<any>(null);

  const fetchLiveOrgs = () => {
    setLiveLoading(true);
    fetch(`${BASE_URL}/supply-chain/organizations`, { headers: getAuthHeader() })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        let orgs = Array.isArray(data) ? data : [];
        // Skora göre sırala (Büyükten küçüğe, skoru olmayanlar en alta)
        orgs.sort((a, b) => {
          const scoreA = a.latest_trust_score !== null && a.latest_trust_score !== undefined ? Number(a.latest_trust_score) : -1;
          const scoreB = b.latest_trust_score !== null && b.latest_trust_score !== undefined ? Number(b.latest_trust_score) : -1;
          return scoreB - scoreA;
        });
        setLiveOrgs(orgs);
      })
      .catch(() => setLiveError(true))
      .finally(() => setLiveLoading(false));
  };

  useEffect(() => {
    fetchLiveOrgs();
  }, []);

  const kpi = supplyChainKPIs;

  const filtered = useMemo(() => {
    return logisticsRoutes.filter((r) => {
      const matchSearch =
        !search ||
        r.routeName.toLowerCase().includes(search.toLowerCase()) ||
        r.origin.toLowerCase().includes(search.toLowerCase()) ||
        r.destination.toLowerCase().includes(search.toLowerCase()) ||
        r.carrier.toLowerCase().includes(search.toLowerCase());
      const matchTransport = !transportFilter || r.transportType === transportFilter;
      const matchStatus = !statusFilter || r.verificationStatus === statusFilter;
      return matchSearch && matchTransport && matchStatus;
    });
  }, [search, transportFilter, statusFilter]);

  const totalCO2 = filtered.reduce((sum, r) => sum + r.estimatedCO2_kg, 0);
  const totalDistance = filtered.reduce((sum, r) => sum + r.distance_km, 0);
  const avgReliability = filtered.length ? filtered.reduce((sum, r) => sum + r.reliabilityScore, 0) / filtered.length : 0;

  // CO₂ by transport type for pie chart
  const co2ByTransport = useMemo(() => {
    const map: Record<string, { name: string; value: number; color: string }> = {};
    const colors: Record<string, string> = { Karayolu: '#f59e0b', Denizyolu: '#3b82f6', Demiryolu: '#10b981', Multimodal: '#8b5cf6' };
    filtered.forEach((r) => {
      if (!map[r.transportType]) {
        map[r.transportType] = { name: r.transportType, value: 0, color: colors[r.transportType] || '#94a3b8' };
      }
      map[r.transportType].value += r.estimatedCO2_kg;
    });
    return Object.values(map);
  }, [filtered]);

  // Top 5 routes by CO₂
  const topCO2Routes = useMemo(() => {
    return [...filtered].sort((a, b) => b.estimatedCO2_kg - a.estimatedCO2_kg).slice(0, 5);
  }, [filtered]);

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'ENGINEER']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <button
                onClick={() => router.push('/supply-chain')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors mb-3"
              >
                <ArrowLeft size={14} />
                Tedarik Zinciri Dashboard
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200">
                  <Navigation size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                    Lojistik Emisyon Rotaları
                  </h1>
                  <p className="text-sm text-gray-500 font-medium">
                    Kocaer Çelik — Rota bazlı karbon ayak izi takibi
                  </p>
                </div>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Kartlar
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Tablo
              </button>
            </div>
          </div>

          {/* ── KPI Summary Cards ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Toplam CO₂', value: `${(totalCO2 / 1000).toFixed(1)}t`, icon: <Leaf size={18} />, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-200' },
              { label: 'Toplam Mesafe', value: `${(totalDistance / 1000).toFixed(1)}k km`, icon: <Route size={18} />, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-200' },
              { label: 'Ort. Güvenilirlik', value: `${avgReliability.toFixed(0)}`, icon: <Shield size={18} />, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-200' },
              { label: 'Doğrulanmış', value: `${kpi.verifiedRoutes}/${kpi.totalRoutes}`, icon: <CheckCircle2 size={18} />, gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-green-200' },
              { label: 'Aktif Rota', value: `${filtered.length}`, icon: <Truck size={18} />, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-200' },
            ].map((card, i) => (
              <div key={i} className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className={`inline-flex p-2 bg-gradient-to-br ${card.gradient} rounded-xl shadow-md ${card.shadow} text-white mb-3`}>
                  {card.icon}
                </div>
                <p className="text-xl font-black text-gray-900">{card.value}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">{card.label}</p>
                <div className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full opacity-5 bg-gradient-to-br ${card.gradient}`} />
              </div>
            ))}
          </div>


          {/* ── Lojistik Rota Haritası ─────────────────────────────── */}
          <LogisticsMap />

          {/* ── Charts Row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* CO₂ by Transport Type */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <Fuel size={16} className="text-amber-600" />
                <h3 className="text-sm font-black text-gray-900">Taşıma Tipine Göre CO₂</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">Filtrelenen rotalar bazında</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={co2ByTransport} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                    {co2ByTransport.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${Number(value).toLocaleString('tr-TR')} kg CO₂`]}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e5e7eb' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {co2ByTransport.map((t) => (
                  <div key={t.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="text-gray-600 truncate">{t.name}</span>
                    <span className="font-bold text-gray-900 ml-auto">{(t.value / 1000).toFixed(1)}t</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Routes by CO₂ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={16} className="text-red-500" />
                <h3 className="text-sm font-black text-gray-900">En Yüksek CO₂ Rotaları</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">İlk 5 rota</p>
              <div className="space-y-3">
                {topCO2Routes.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{r.routeName}</p>
                      <div className="mt-1">
                        <ProgressBar
                          value={r.estimatedCO2_kg}
                          max={topCO2Routes[0]?.estimatedCO2_kg || 1}
                          color={r.estimatedCO2_kg > 3000 ? 'bg-red-500' : r.estimatedCO2_kg > 1500 ? 'bg-amber-500' : 'bg-emerald-500'}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-black text-gray-700 shrink-0">{(r.estimatedCO2_kg / 1000).toFixed(1)}t</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Area Chart - Monthly Trend */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={16} className="text-blue-600" />
                <h3 className="text-sm font-black text-gray-900">Aylık Toplam Emisyon</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">Tüm taşıma tipleri dahil</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyCO2Trend}>
                  <defs>
                    <linearGradient id="colorToplam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="toplam" name="Toplam CO₂" stroke="#3b82f6" strokeWidth={2} fill="url(#colorToplam)" dot={{ r: 3, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Canlı DPP Tedarik Ağı ───────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden mb-8">
            {/* Header */}
            <div className="px-6 py-4 border-b border-blue-50 bg-gradient-to-r from-blue-50/60 to-indigo-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-sm shadow-blue-200">
                  <Activity size={14} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Canlı DPP Tedarik Ağı</h3>
                  <p className="text-[10px] text-gray-400 font-medium">
                    Backend'den çekilen gerçek tedarik zinciri organizasyonları
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!liveLoading && !liveError && (
                  <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    {liveOrgs.length} kayıt
                  </span>
                )}
                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-black text-green-700 uppercase tracking-wider">Canlı</span>
                </div>
              </div>
            </div>

            {/* Body */}
            {liveLoading ? (
              <div className="px-6 py-8 flex items-center justify-center gap-2 text-xs text-blue-600 font-bold">
                <Loader2 size={15} className="animate-spin" />
                Tedarik ağı verileri yükleniyor...
              </div>
            ) : liveError ? (
              <div className="px-6 py-8 text-center">
                <p className="text-xs text-red-400 font-medium">Backend bağlantısı kurulamadı — veriler gösterilemiyor.</p>
              </div>
            ) : liveOrgs.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Globe2 size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400 font-medium">Kayıtlı tedarik zinciri organizasyonu bulunamadı.</p>
                <p className="text-[10px] text-gray-300 mt-1">DPP'lere tedarik zinciri aşaması eklendiğinde burada görünecek.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50">
                      <th className="px-5 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Organizasyon</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Rol</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Konum</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Ülke</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Doğrulama</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Değerlendirme</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {liveOrgs.map((org: any, i: number) => (
                      <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shrink-0">
                              <Building2 size={12} className="text-blue-600" />
                            </div>
                            <p className="text-xs font-bold text-gray-900">{org.name || '—'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                            {org.role || 'Tedarikçi'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                            <MapPin size={11} className="text-gray-300 shrink-0" />
                            {org.location_text || org.city || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {org.country_code ? (
                            <span className="text-[11px] font-black text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-mono">
                              {org.country_code}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {org.is_verified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={10} /> Doğrulanmış
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <Clock size={10} /> Doğrulanmamış
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {org.latest_trust_score !== null && org.latest_trust_score !== undefined && (
                              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-black text-xs shadow-sm ${
                                org.latest_risk_level === 'DÜŞÜK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                org.latest_risk_level === 'ORTA' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {org.latest_trust_score}<span className="text-[9px] font-bold opacity-60">/100</span>
                              </div>
                            )}
                            <button
                              onClick={() => setEvaluateOrg(org)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-bold rounded-lg transition-colors"
                              title="Anket Doldur"
                            >
                              <Edit3 size={12} />
                              Anket
                            </button>
                            <button
                              onClick={() => setScoreOrg(org)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-sm"
                              title="Güven Skoru ve AI Raporu"
                            >
                              <Sparkles size={12} />
                              AI Skor
                            </button>
                            <button
                              onClick={() => setHistoryOrg(org)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-[10px] font-bold rounded-lg transition-colors"
                              title="Geçmiş AI Raporları"
                            >
                              <History size={12} />
                              Geçmiş
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1.5">
                    <Hash size={10} />
                    {liveOrgs.filter((o: any) => o.is_verified).length} doğrulanmış ·{' '}
                    {liveOrgs.filter((o: any) => !o.is_verified).length} doğrulanmamış ·{' '}
                    Toplam {liveOrgs.length} organizasyon
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Filters ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rota, şehir veya taşıyıcı ara..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Transport Filter */}
                <div className="relative">
                  <select
                    value={transportFilter || ''}
                    onChange={(e) => setTransportFilter(e.target.value || null)}
                    className="appearance-none pl-3 pr-8 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Tüm Taşıma Tipleri</option>
                    <option value="Karayolu">Karayolu</option>
                    <option value="Denizyolu">Denizyolu</option>
                    <option value="Demiryolu">Demiryolu</option>
                    <option value="Multimodal">Multimodal</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter || ''}
                    onChange={(e) => setStatusFilter(e.target.value || null)}
                    className="appearance-none pl-3 pr-8 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Tüm Durumlar</option>
                    <option value="Doğrulanmış">Doğrulanmış</option>
                    <option value="Beklemede">Beklemede</option>
                    <option value="İncelemede">İncelemede</option>
                    <option value="Reddedilmiş">Reddedilmiş</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {/* Status summary chips */}
                <div className="hidden lg:flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                    <CheckCircle2 size={10} /> {logisticsRoutes.filter(r => r.verificationStatus === 'Doğrulanmış').length}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                    <Clock size={10} /> {logisticsRoutes.filter(r => r.verificationStatus === 'Beklemede').length}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                    <Eye size={10} /> {logisticsRoutes.filter(r => r.verificationStatus === 'İncelemede').length}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-1 rounded-full">
                    <XCircle size={10} /> {logisticsRoutes.filter(r => r.verificationStatus === 'Reddedilmiş').length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Route List ──────────────────────────────────────────── */}
          {viewMode === 'cards' ? (
            <div className="space-y-3">
              {filtered.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  expanded={expandedId === route.id}
                  onToggle={() => setExpandedId(expandedId === route.id ? null : route.id)}
                />
              ))}
              {filtered.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                  <Truck size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">Filtrelere uyan rota bulunamadı.</p>
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th className="px-5 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Rota</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Taşıma</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-right">Mesafe</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-right">CO₂ (kg)</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Güvenilirlik</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Durum</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider text-center">Risk</th>
                      <th className="px-4 py-3 text-[11px] font-black text-gray-500 uppercase tracking-wider">Taşıyıcı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((r) => (
                      <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-xs font-bold text-gray-900">{r.routeName}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{r.originDetail} → {r.destinationDetail}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${transportBadgeColor(r.transportType)}`}>
                            {transportIcon(r.transportType)}
                            {r.transportType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 font-medium text-right">{r.distance_km.toLocaleString('tr-TR')}</td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-900 text-right">{r.estimatedCO2_kg.toLocaleString('tr-TR')}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-black ${reliabilityColor(r.reliabilityScore)}`}>{r.reliabilityScore}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full border ${statusColor(r.verificationStatus)}`}>
                            {statusIcon(r.verificationStatus)}
                            {r.verificationStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${riskColor(r.riskLevel)}`}>{r.riskLevel}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 font-medium">{r.carrier}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-400 font-medium">
                  Toplam <span className="font-bold text-gray-600">{filtered.length}</span> rota —{' '}
                  <span className="font-bold text-gray-600">{(totalCO2 / 1000).toFixed(1)}t</span> CO₂ —{' '}
                  <span className="font-bold text-gray-600">{(totalDistance / 1000).toFixed(1)}k km</span>
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
      
      {evaluateOrg && (
        <SupplierEvaluationModal 
          organizationId={evaluateOrg.id}
          organizationName={evaluateOrg.name}
          onClose={() => setEvaluateOrg(null)}
          onSuccess={() => {
            setEvaluateOrg(null);
            fetchLiveOrgs();
          }}
        />
      )}

      {scoreOrg && (
        <SupplierScoreModal 
          organizationId={scoreOrg.id}
          organizationName={scoreOrg.name}
          onClose={() => setScoreOrg(null)}
          onOpenHistory={() => setHistoryOrg(scoreOrg)}
        />
      )}

      {historyOrg && (
        <SupplierScoreHistoryModal 
          organizationId={historyOrg.id}
          organizationName={historyOrg.name}
          onClose={() => setHistoryOrg(null)}
        />
      )}
    </ProtectedRoute>
  );
}