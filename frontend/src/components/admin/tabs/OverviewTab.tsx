import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import {
  CERT_ALERTS,
  INCOMPLETE,
  CBAM_LIMIT,
  REJECTABLE_FIELDS,
} from "../../../constants/adminConstants";
import { RoleBadge } from "../AdminBadges";
import { apiGetRecentAuditLogs } from "../../../lib/api";
import type { AdminProduct, PendingBatch } from "../../../types/admin";

interface Props {
  products: AdminProduct[];
  pendingBatches: PendingBatch[];
  cbamWarnings: AdminProduct[];
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

  // Activity state
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesExpanded, setActivitiesExpanded] = useState(false);
  const [activitiesTotal, setActivitiesTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const criticalCerts = CERT_ALERTS.filter((c) => c.days_left <= 10);

  // Fetch initial activities
  useEffect(() => {
    const fetchActivities = async () => {
      setActivitiesLoading(true);
      try {
        const response = await apiGetRecentAuditLogs({
          skip: 0,
          limit: INITIAL_LIMIT,
        });
        if (response?.data) {
          setActivities(response.data);
          setActivitiesTotal(response.total ?? response.data.length);
        }
      } catch (err) {
        console.error("Aktiviteler yüklenemedi:", err);
      } finally {
        setActivitiesLoading(false);
      }
    };
    fetchActivities();
  }, []);

  // Load more activities when expanded
  const handleToggleExpand = useCallback(async () => {
    if (!activitiesExpanded) {
      // Expanding — load more if we only have the initial set
      if (
        activities.length <= INITIAL_LIMIT &&
        activitiesTotal > INITIAL_LIMIT
      ) {
        setLoadingMore(true);
        try {
          const response = await apiGetRecentAuditLogs({ skip: 0, limit: 50 });
          if (response?.data) {
            setActivities(response.data);
            setActivitiesTotal(response.total ?? response.data.length);
          }
        } catch (err) {
          console.error("Daha fazla aktivite yüklenemedi:", err);
        } finally {
          setLoadingMore(false);
        }
      }
      setActivitiesExpanded(true);
    } else {
      setActivitiesExpanded(false);
    }
  }, [activitiesExpanded, activities.length, activitiesTotal]);

  const displayedActivities = activitiesExpanded
    ? activities
    : activities.slice(0, INITIAL_LIMIT);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kritik Uyarılar */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            Acil Aksiyon Gerektiren Uyarılar
          </h2>
          <div className="space-y-3">
            {cbamWarnings.map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100"
              >
                <Flag size={16} className="text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-black text-red-800">
                    {p.product_name}
                  </p>
                  <p className="text-xs text-red-600 font-medium">
                    CO₂: {p.co2_cradle_to_gate_kg} kg/kg — CBAM limitini (
                    {CBAM_LIMIT} kg/kg) aşıyor
                  </p>
                </div>
              </div>
            ))}
            {CERT_ALERTS.filter((c) => c.days_left <= 10).map((c, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100"
              >
                <Clock size={16} className="text-orange-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-black text-orange-800">
                    {c.product} — {c.cert}
                  </p>
                  <p className="text-xs text-orange-600 font-medium">
                    {c.days_left <= 0
                      ? "SÜRESİ DOLDU"
                      : `${c.days_left} gün kaldı`}{" "}
                    • {c.expiry}
                  </p>
                </div>
              </div>
            ))}
            {INCOMPLETE.filter((p) => p.missing.length >= 3).map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100"
              >
                <AlertTriangle
                  size={16}
                  className="text-yellow-600 mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-sm font-black text-yellow-800">
                    {p.product} ({p.display_id || p.id})
                  </p>
                  <p className="text-xs text-yellow-600 font-medium">
                    Eksik: {p.missing.map((m) => m.field).join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Son Aktiviteler — Backend'den çekilir */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Activity size={16} className="text-blue-500" />
            Son Sistem Aktiviteleri
            {!activitiesLoading && activitiesTotal > 0 && (
              <span className="ml-auto bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                {activitiesTotal} kayıt
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
                {displayedActivities.map((log) => (
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

              {/* Tümünü Gör / Daralt butonu */}
              {activitiesTotal > INITIAL_LIMIT && (
                <button
                  onClick={handleToggleExpand}
                  disabled={loadingMore}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors py-2 rounded-xl hover:bg-blue-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Yükleniyor…
                    </>
                  ) : activitiesExpanded ? (
                    <>
                      <ChevronUp size={14} />
                      Daralt
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} />
                      Tümünü Gör ({activitiesTotal} kayıt)
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
