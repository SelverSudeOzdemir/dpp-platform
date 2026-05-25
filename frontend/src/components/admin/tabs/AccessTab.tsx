import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  User,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  RefreshCw,
} from "lucide-react";
import { ACCESS_MATRIX } from "../../../constants/adminConstants";
import { RoleBadge } from "../AdminBadges";
import { apiGetAccessLogs } from "../../../lib/api";

const PAGE_SIZE = 15;

export default function AccessTab() {
  const [page, setPage] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const response = await apiGetAccessLogs({
          skip: pageNum * PAGE_SIZE,
          limit: PAGE_SIZE,
          role: roleFilter || undefined,
          action: actionFilter || undefined,
        });
        if (response && response.data) {
          const mapped = response.data.map((l: any) => ({
            id: l.id,
            user: l.user_email || "anonim",
            role: l.role || "PUBLIC",
            action: l.action || "—",
            product: l.target_id
              ? l.target_id.length > 8
                ? l.target_id.slice(0, 8) + "…"
                : l.target_id
              : "—",
            fullProductId: l.target_id || "",
            timestamp: l.date ? new Date(l.date).toLocaleString("tr-TR") : "—",
            ip: l.ip_address || "—",
          }));
          setLogs(mapped);
          setTotal(response.total || mapped.length);
        }
      } catch (err) {
        console.error("Erişim logları yüklenemedi:", err);
      } finally {
        setLoading(false);
      }
    },
    [roleFilter, actionFilter]
  );

  useEffect(() => {
    setPage(0);
    fetchLogs(0);
  }, [fetchLogs]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchLogs(newPage);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-8">
      {/* Erişim Logları */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} className="text-blue-600" />
              Erişim Logları
            </h2>
            <div className="flex items-center gap-2">
              {loading && (
                <Loader2 size={14} className="text-blue-600 animate-spin" />
              )}
              <button
                onClick={() => fetchLogs(page)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                title="Yenile"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Aksiyon ara..."
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="text-xs pl-7 pr-3 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Tüm Roller</option>
              <option value="ADMIN">Admin</option>
              <option value="ENGINEER">Mühendis</option>
              <option value="AUTHORITY">Otorite</option>
              <option value="CUSTOMER">Müşteri</option>
              <option value="SUPPLIER">Tedarikçi</option>
            </select>
            <span className="text-xs text-gray-400 font-bold ml-auto">
              {total} kayıt — Sayfa {page + 1} / {totalPages}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Kullanıcı",
                  "Rol",
                  "Aksiyon",
                  "Kaynak",
                  "Zaman",
                  "IP Adresi",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log, i) => (
                <tr
                  key={log.id || i}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <User size={12} className="text-gray-500" />
                      </div>
                      <span className="text-xs font-bold text-gray-800">
                        {log.user}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <RoleBadge role={log.role} />
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-gray-700 font-medium">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {log.product !== "—" ? (
                      <span
                        className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded"
                        title={log.fullProductId}
                      >
                        {log.product}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-gray-500 font-medium">
                      {log.timestamp}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[10px] font-mono text-gray-400">
                      {log.ip}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-xs text-gray-400 font-medium"
                  >
                    Erişim kaydı bulunamadı.
                  </td>
                </tr>
              )}
              {loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center">
                    <Loader2
                      size={20}
                      className="text-blue-500 animate-spin mx-auto"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 0}
              className={`px-3 py-1.5 text-xs font-black border rounded-lg transition-colors ${
                page === 0
                  ? "border-gray-100 text-gray-300 cursor-not-allowed"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              ← Önceki
            </button>
            <span className="text-[10px] font-bold text-gray-400 px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page + 1 >= totalPages}
              className={`px-3 py-1.5 text-xs font-black border rounded-lg transition-colors ${
                page + 1 >= totalPages
                  ? "border-gray-100 text-gray-300 cursor-not-allowed"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Sonraki →
            </button>
          </div>
        )}
      </div>

      {/* Rol & Yetki Matrisi */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Lock size={16} className="text-purple-600" />
          Rol & Yetki Matrisi
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest pb-3 pr-6">
                  Özellik
                </th>
                {[
                  "PUBLIC",
                  "CUSTOMER",
                  "SUPPLIER",
                  "ENGINEER",
                  "AUTHORITY",
                  "ADMIN",
                ].map((r) => (
                  <th key={r} className="text-center pb-3 px-4">
                    <RoleBadge role={r} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ACCESS_MATRIX.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="py-3 pr-6 text-sm font-medium text-gray-700 whitespace-nowrap">
                    {row.feature}
                  </td>
                  {row.access.map((has, j) => (
                    <td key={j} className="py-3 px-4 text-center">
                      {has ? (
                        <CheckCircle2
                          size={16}
                          className="text-green-500 mx-auto"
                        />
                      ) : (
                        <XCircle size={16} className="text-gray-200 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
