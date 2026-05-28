import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import {
  Package,
  CheckCircle2,
  Clock,
  Archive,
  Zap,
  Bell,
  Flag,
  AlertTriangle,
  Activity,
  User,
  Eye,
  XCircle,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import {
  CERT_ALERTS,
  INCOMPLETE,
  CBAM_LIMIT,
  REJECTABLE_FIELDS,
} from "../../../constants/adminConstants";
import { RoleBadge } from "../AdminBadges";
import { apiGetRecentAuditLogs } from "../../../lib/api";
import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine,
} from "recharts";
import type { AdminProduct, PendingBatch } from "../../../types/admin";

interface UrgentAlertItem {
  id: string;
  type: string;
  message: string;
  severity: string;
  dpp_id?: string | null;
  product_name?: string | null;
  cert_name?: string | null;
  days_left?: number | null;
}

interface Props {
  products: AdminProduct[];
  pendingBatches: PendingBatch[];
  cbamWarnings: AdminProduct[];
  urgentAlerts: UrgentAlertItem[];
  onApprove: (id: string) => void;
  onRejectConfirm: (id: string, reason: string, fields: string[]) => void;
  setActiveTab: (tab: string) => void;
  pendingModalOpen: boolean;
  setPendingModalOpen: (open: boolean) => void;
}

interface ActivityLog {
  id: string;
  action: string;
  target_id: string;
  user_email: string;
  date: string;
  role: string;
  ip_address: string;
}

const INITIAL_LIMIT = 5;
const LOAD_MORE_LIMIT = 10;

export default function OverviewTab({
  products,
  pendingBatches,
  cbamWarnings,
  urgentAlerts,
  onApprove,
  onRejectConfirm,
  setActiveTab,
  pendingModalOpen,
  setPendingModalOpen,
}: Props) {
  const router = useRouter();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectFields, setRejectFields] = useState<string[]>([]);
  const [alertsPage, setAlertsPage] = useState(0);

  // Activity state
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesPage, setActivitiesPage] = useState(0);

  const criticalCerts = CERT_ALERTS.filter((c) => c.days_left <= 10);

  // ── Ürün kategorisi dağılımı (backend verisi) ────────────────────────────
  const CATEGORY_COLORS = ["#3b82f6","#10b981","#8b5cf6","#f59e0b","#ef4444","#06b6d4","#ec4899"];
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.product_category || "Diğer";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [products]);

  // ── Kategori bazlı ortalama CO₂ (backend verisi) ─────────────────────────
  const co2Data = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    products.forEach((p) => {
      const cat = p.product_category || "Diğer";
      if (!sums[cat]) sums[cat] = { total: 0, count: 0 };
      sums[cat].total += p.co2_cradle_to_gate_kg || 0;
      sums[cat].count += 1;
    });
    return Object.entries(sums)
      .map(([name, { total, count }]) => ({
        name: name.length > 18 ? name.slice(0, 16) + "…" : name,
        co2: parseFloat((total / count).toFixed(2)),
      }))
      .sort((a, b) => b.co2 - a.co2);
  }, [products]);

  // ── Pazar dağılımı (mock — gerçekçi Türk çelik ihracat oranları) ─────────
  const MARKET_COLORS = ["#3b82f6", "#10b981", "#f59e0b"];
  const marketData = [
    { name: "Yurt İçi",        value: 40 },
    { name: "Avrupa Birliği",  value: 38 },
    { name: "Diğer İhracat",   value: 22 },
  ];

  // ── Tüm uyarıları birleştir ──────────────────────────────────────────────
  // Backend'den gelenler (gerçek veri)
  const backendAlerts: UrgentAlertItem[] = urgentAlerts;

  // Mock: şirket geneli ISO sertifika uyarıları (DPP'ye bağlı değil)
  const mockCertAlerts: UrgentAlertItem[] = CERT_ALERTS.filter(
    (c) => c.days_left <= 30
  ).map((c) => ({
    id: `MOCK-CERT-${c.cert}`,
    type: c.days_left <= 0 ? "CERTIFICATE" : "CERT_EXPIRING",
    severity: c.days_left <= 0 ? "CRITICAL" : "WARNING",
    message:
      c.days_left <= 0
        ? "Sertifika süresi dolmuş — yenileme gerekiyor"
        : `Sertifika ${c.days_left} gün içinde geçerliliğini yitirecek`,
    cert_name: c.cert,
    product_name: c.product,
    days_left: c.days_left,
    dpp_id: null,
  }));

  // Mock: eksik alanlı DPP'ler
  const mockIncompleteAlerts: UrgentAlertItem[] = INCOMPLETE.filter(
    (p) => p.missing.length >= 3
  ).map((p) => ({
    id: `MOCK-INC-${p.id}`,
    type: "INCOMPLETE",
    severity: "WARNING",
    message: `${p.missing.length} kritik alan eksik — DPP tamamlanmayı bekliyor`,
    product_name: `${p.product} (${p.display_id || p.id})`,
    dpp_id: null,
    cert_name: null,
    days_left: null,
  }));

  const allAlerts: UrgentAlertItem[] = [
    ...backendAlerts,
    ...mockCertAlerts,
    ...mockIncompleteAlerts,
  ].sort((a, b) => {
    const order: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
  });

  const ALERT_META: Record<
    string,
    {
      icon: React.ElementType;
      label: string;
      bg: string;
      border: string;
      iconColor: string;
      badge: string;
    }
  > = {
    CBAM: {
      icon: Flag,
      label: "CBAM",
      bg: "bg-red-50",
      border: "border-red-200",
      iconColor: "text-red-600",
      badge: "bg-red-100 text-red-700",
    },
    REJECTED: {
      icon: XCircle,
      label: "Reddedildi",
      bg: "bg-red-50",
      border: "border-red-200",
      iconColor: "text-red-600",
      badge: "bg-red-100 text-red-700",
    },
    CERTIFICATE: {
      icon: ShieldAlert,
      label: "Sert. Süresi Doldu",
      bg: "bg-orange-50",
      border: "border-orange-200",
      iconColor: "text-orange-600",
      badge: "bg-orange-100 text-orange-700",
    },
    CERT_EXPIRING: {
      icon: Clock,
      label: "Sert. Yaklaşıyor",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      iconColor: "text-yellow-600",
      badge: "bg-yellow-100 text-yellow-700",
    },
    LONG_PENDING: {
      icon: Zap,
      label: "Uzun Bekleme",
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconColor: "text-amber-600",
      badge: "bg-amber-100 text-amber-700",
    },
    INCOMPLETE: {
      icon: AlertTriangle,
      label: "Eksik Alan",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      iconColor: "text-yellow-600",
      badge: "bg-yellow-100 text-yellow-700",
    },
  };

  // Fetch activities (tümünü çek, client-side sayfalama)
  useEffect(() => {
    const fetchActivities = async () => {
      setActivitiesLoading(true);
      try {
        const response = await apiGetRecentAuditLogs({ skip: 0, limit: 50 });
        if (response?.data) {
          setActivities(response.data);
        }
      } catch (err) {
        console.error("Aktiviteler yüklenemedi:", err);
      } finally {
        setActivitiesLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("tr-TR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const toggleRejectField = (key: string) =>
    setRejectFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );

  const handleRejectBatch = (id: string) => {
    if (!rejectReason.trim()) return;
    onRejectConfirm(id, rejectReason, rejectFields);
    setRejectId(null);
    setRejectReason("");
    setRejectFields([]);
  };

  return (
    <div className="space-y-8">
      {/* KPI Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          {
            label: "Toplam Pasaport",
            value: products.length,
            tab: "passports",
            icon: Package,
            border: "border-blue-500",
            text: "text-blue-700",
            iconBg: "bg-blue-50",
          },
          {
            label: "Yayında",
            value: products.filter((p) => p.passport_status === "Yayında")
              .length,
            tab: "passports",
            icon: CheckCircle2,
            border: "border-green-500",
            text: "text-green-700",
            iconBg: "bg-green-50",
          },
          {
            label: "Taslak",
            value: products.filter((p) => p.passport_status === "Taslak")
              .length,
            tab: "passports",
            icon: Clock,
            border: "border-yellow-500",
            text: "text-yellow-700",
            iconBg: "bg-yellow-50",
          },
          {
            label: "Arşivlendi",
            value: products.filter((p) => p.passport_status === "Arşivlendi")
              .length,
            tab: "passports",
            icon: Archive,
            border: "border-gray-400",
            text: "text-gray-600",
            iconBg: "bg-gray-50",
          },
          {
            label: "Onay Bekleyen",
            value: pendingBatches.length,
            tab: "__pending_modal__",
            icon: Zap,
            border: "border-amber-500",
            text: "text-amber-700",
            iconBg: "bg-amber-50",
          },
          {
            label: "Sertifika Uyarısı",
            value: criticalCerts.length,
            tab: "compliance",
            icon: Bell,
            border: "border-orange-500",
            text: "text-orange-700",
            iconBg: "bg-orange-50",
          },
          {
            label: "CBAM Uyarısı",
            value: cbamWarnings.length,
            tab: "compliance",
            icon: Flag,
            border: "border-red-500",
            text: "text-red-700",
            iconBg: "bg-red-50",
          },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <button
              key={i}
              onClick={() =>
                k.tab === "__pending_modal__"
                  ? setPendingModalOpen(true)
                  : setActiveTab(k.tab)
              }
              className={`bg-white rounded-2xl border-l-4 p-4 shadow-sm text-left transition-shadow hover:shadow-md cursor-pointer w-full ${k.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  {k.label}
                </p>
                <div className={`p-1.5 rounded-lg ${k.iconBg}`}>
                  <Icon size={14} className={k.text} />
                </div>
              </div>
              <p className={`text-3xl font-black ${k.text}`}>{k.value}</p>
            </button>
          );
        })}
      </div>

      {/* ── Ürün & Pazar Dağılımı + CO₂ Profili ── */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:divide-x lg:divide-gray-100">

          {/* SOL: Ürün Dağılımı */}
          <div className="flex flex-col">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Package size={13} className="text-blue-500" />
              Ürün Kategorisi Dağılımı
            </h3>
            {categoryData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-400 py-8">Veri yok</div>
            ) : (
              <div className="flex flex-col gap-3">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartTooltip
                      formatter={(val: number, name: string) => [`${val} DPP`, name]}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {categoryData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        <span className="text-gray-600 font-medium truncate max-w-[130px]">{d.name}</span>
                      </div>
                      <span className="font-black text-gray-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ORTA: Pazar Dağılımı (mock) */}
          <div className="flex flex-col lg:pl-6">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Eye size={13} className="text-emerald-500" />
              Pazar Dağılımı
              <span className="text-[9px] font-bold text-gray-300 normal-case tracking-normal">tahmini</span>
            </h3>
            <div className="flex flex-col gap-3">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={marketData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {marketData.map((_, i) => (
                      <Cell key={i} fill={MARKET_COLORS[i]} />
                    ))}
                  </Pie>
                  <RechartTooltip
                    formatter={(val: number, name: string) => [`%${val}`, name]}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {marketData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: MARKET_COLORS[i] }} />
                      <span className="text-gray-600 font-medium">{d.name}</span>
                    </div>
                    <span className="font-black text-gray-800">%{d.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-300 font-medium mt-1">
                AB pazarına giden DPP'ler CBAM kapsamındadır
              </p>
            </div>
          </div>

          {/* SAĞ: CO₂ Profili */}
          <div className="flex flex-col lg:pl-6">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Flag size={13} className="text-red-500" />
              Kategori CO₂ Profili
              <span className="text-[9px] font-bold text-red-400 normal-case tracking-normal">CBAM sınırı 2.0</span>
            </h3>
            {co2Data.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-400 py-8">Veri yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, co2Data.length * 38)}>
                <BarChart data={co2Data} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${v}`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <RechartTooltip
                    formatter={(val: number) => [`${val} kg CO₂/kg`, "Ort. Emisyon"]}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  <ReferenceLine x={CBAM_LIMIT} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: "CBAM", position: "right", fontSize: 9, fill: "#ef4444" }} />
                  <Bar dataKey="co2" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {co2Data.map((d, i) => (
                      <Cell key={i} fill={d.co2 > CBAM_LIMIT ? "#ef4444" : "#3b82f6"} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kritik Uyarılar */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          {/* Başlık */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              Acil Aksiyon Gerektiren Uyarılar
            </h2>
            {allAlerts.length > 0 ? (
              <span
                className={`text-[11px] font-black px-2.5 py-1 rounded-full ${
                  allAlerts.some((a) => a.severity === "CRITICAL")
                    ? "bg-red-100 text-red-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {allAlerts.length} uyarı
              </span>
            ) : (
              <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                Temiz
              </span>
            )}
          </div>

          {/* İçerik */}
          {allAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={22} className="text-green-500" />
              </div>
              <p className="text-sm font-black text-gray-700">Tüm sistemler normal</p>
              <p className="text-xs text-gray-400 font-medium">Kritik uyarı bulunmuyor</p>
            </div>
          ) : (
            <>
            <div className="space-y-2.5">
              {allAlerts.slice(alertsPage * INITIAL_LIMIT, (alertsPage + 1) * INITIAL_LIMIT).map((alert) => {
                const meta = ALERT_META[alert.type] ?? {
                  icon: AlertTriangle,
                  label: alert.type,
                  bg: "bg-gray-50",
                  border: "border-gray-200",
                  iconColor: "text-gray-500",
                  badge: "bg-gray-100 text-gray-600",
                };
                const Icon = meta.icon;
                const isCritical = alert.severity === "CRITICAL";
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${meta.bg} ${meta.border} relative overflow-hidden`}
                  >
                    {/* Sol şerit */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                        isCritical ? "bg-red-500" : "bg-orange-400"
                      }`}
                    />
                    {/* İkon */}
                    <div className="ml-2 mt-0.5 shrink-0">
                      <Icon size={15} className={meta.iconColor} />
                    </div>
                    {/* Metin */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        {alert.product_name && (
                          <p className={`text-xs font-black truncate ${isCritical ? "text-red-800" : "text-gray-800"}`}>
                            {alert.product_name}
                          </p>
                        )}
                        {alert.cert_name && (
                          <p className={`text-xs font-black truncate ${isCritical ? "text-red-800" : "text-gray-800"}`}>
                            {alert.cert_name}
                          </p>
                        )}
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className={`text-[11px] font-medium ${isCritical ? "text-red-600" : "text-gray-500"}`}>
                        {alert.message}
                        {alert.days_left !== null && alert.days_left !== undefined && alert.days_left > 0 && (
                          <span className="ml-1 font-black">• {alert.days_left} gün kaldı</span>
                        )}
                        {alert.days_left === 0 && (
                          <span className="ml-1 font-black text-red-600">• SÜRESİ DOLDU</span>
                        )}
                      </p>
                    </div>
                    {/* Görüntüle butonu */}
                    {alert.dpp_id && (
                      <button
                        onClick={() => router.push(`/dpp/${alert.dpp_id}`)}
                        className="shrink-0 flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors mt-0.5"
                      >
                        <ExternalLink size={10} />
                        Görüntüle
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {allAlerts.length > INITIAL_LIMIT && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setAlertsPage((p) => p - 1)}
                  disabled={alertsPage === 0}
                  className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <ChevronDown size={13} className="rotate-90" />
                  Önceki
                </button>
                <span className="text-[11px] text-gray-400 font-medium">
                  {alertsPage + 1} / {Math.ceil(allAlerts.length / INITIAL_LIMIT)}
                </span>
                <button
                  onClick={() => setAlertsPage((p) => p + 1)}
                  disabled={(alertsPage + 1) * INITIAL_LIMIT >= allAlerts.length}
                  className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Sonraki
                  <ChevronDown size={13} className="-rotate-90" />
                </button>
              </div>
            )}
            </>
          )}
        </div>

        {/* Son Aktiviteler — Backend'den çekilir */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Activity size={16} className="text-blue-500" />
            Son Sistem Aktiviteleri
            {!activitiesLoading && activities.length > 0 && (
              <span className="ml-auto bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                {activities.length} kayıt
              </span>
            )}
          </h2>

          {activitiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="text-blue-500 animate-spin" />
              <span className="ml-2 text-xs text-gray-400 font-medium">
                Aktiviteler yükleniyor…
              </span>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-gray-400 font-medium">
                Henüz sistem aktivitesi kaydedilmemiş.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {activities.slice(activitiesPage * INITIAL_LIMIT, (activitiesPage + 1) * INITIAL_LIMIT).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User size={12} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {log.action}
                        {log.target_id && (
                          <>
                            {" — "}
                            <span className="text-blue-600">
                              {log.target_id.length > 12
                                ? log.target_id.slice(0, 12) + "…"
                                : log.target_id}
                            </span>
                          </>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {log.user_email} • {formatDate(log.date)}
                        {log.ip_address && (
                          <>
                            {" "}
                            •{" "}
                            <span className="font-mono">{log.ip_address}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <RoleBadge role={log.role} />
                  </div>
                ))}
              </div>

              {activities.length > INITIAL_LIMIT && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setActivitiesPage((p) => p - 1)}
                    disabled={activitiesPage === 0}
                    className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <ChevronDown size={13} className="rotate-90" />
                    Önceki
                  </button>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {activitiesPage + 1} / {Math.ceil(activities.length / INITIAL_LIMIT)}
                  </span>
                  <button
                    onClick={() => setActivitiesPage((p) => p + 1)}
                    disabled={(activitiesPage + 1) * INITIAL_LIMIT >= activities.length}
                    className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Sonraki
                    <ChevronDown size={13} className="-rotate-90" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
