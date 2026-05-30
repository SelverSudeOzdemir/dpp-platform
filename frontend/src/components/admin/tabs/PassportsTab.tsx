import { useState, useEffect } from "react";
import { ClipboardList, Zap, GitBranch, Shield, Eye, X, ChevronDown } from "lucide-react";
import type {
  AdminProduct,
  PendingBatch,
  PassportStatus,
} from "../../../types/admin";
import { apiGetGlobalChangelog } from "../../../lib/api";

interface Props {
  products: AdminProduct[];
  pendingBatches: PendingBatch[];
  onStatusChange: (id: string, status: PassportStatus) => void;
  setActiveTab: (tab: string) => void;
  onOpenPendingModal?: () => void;
}

export default function PassportsTab({
  products,
  pendingBatches,
  onStatusChange,
  setActiveTab,
  onOpenPendingModal,
}: Props) {
  const [search, setSearch] = useState("");
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    id: string;
    status: PassportStatus;
  } | null>(null);
  const [inspectPopup, setInspectPopup] = useState(false);
  const [changelog, setChangelog] = useState<any[]>([]);
  const [passportsPage, setPassportsPage] = useState(0);
  const [changelogPage, setChangelogPage] = useState(0);
  const PAGE_SIZE = 6;

  useEffect(() => {
    apiGetGlobalChangelog()
      .then((data) => {
        setChangelog(data.items || []);
      })
      .catch(console.error);
  }, []);

  const filteredProducts = search.trim()
    ? products.filter(
        (p) =>
          p.product_name.toLowerCase().includes(search.toLowerCase()) ||
          p.id.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const pagedProducts  = filteredProducts.slice(passportsPage * PAGE_SIZE, (passportsPage + 1) * PAGE_SIZE);
  const pagedChangelog = changelog.slice(changelogPage * PAGE_SIZE, (changelogPage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-8">
      {/* Onay Bekleyen DPP'ler Kartı */}
      {pendingBatches.length > 0 && (
        <div className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
          {/* Başlık */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50/60">
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-amber-600" />
              <h2 className="text-sm font-black text-amber-900 uppercase tracking-widest">
                Onay Bekleyen DPP'ler
              </h2>
              <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {pendingBatches.length}
              </span>
            </div>
          </div>

          {/* Liste */}
          <div className="relative">
            {/* İlk 3 — tam görünür */}
            <div className="divide-y divide-gray-50">
              {pendingBatches.slice(0, 3).map((b) => (
                <div key={b.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                    <Zap size={14} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{b.urun_tipi}</p>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {b.parti_no} • {b.gonderilme_tarihi}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-gray-700">{b.co2_a1a3} <span className="font-medium text-gray-400">kg CO₂</span></p>
                    <p className="text-[10px] text-gray-400">{b.miktar_ton} ton</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Kalanlar — bulanık */}
            {pendingBatches.length > 3 && (
              <div className="relative">
                <div className="divide-y divide-gray-50 blur-sm pointer-events-none select-none">
                  {pendingBatches.slice(3, 6).map((b) => (
                    <div key={b.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                        <Zap size={14} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{b.urun_tipi}</p>
                        <p className="text-[11px] text-gray-400 font-medium">
                          {b.parti_no} • {b.gonderilme_tarihi}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-gray-700">{b.co2_a1a3} <span className="font-medium text-gray-400">kg CO₂</span></p>
                        <p className="text-[10px] text-gray-400">{b.miktar_ton} ton</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Beyaza gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-white pointer-events-none" />
              </div>
            )}

            {/* Hepsini Gör butonu */}
            <div className="flex justify-center pb-5 pt-2">
              <button
                onClick={() => onOpenPendingModal?.()}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-md shadow-amber-200 transition-all hover:shadow-lg hover:shadow-amber-300"
              >
                <Zap size={13} />
                Hepsini Gör ({pendingBatches.length} DPP)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pasaport Tablosu */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <ClipboardList size={16} className="text-blue-600" />
            Tüm Pasaportlar
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="ID veya ürün adı ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
            />
            <span className="text-xs text-gray-400 font-bold whitespace-nowrap">
              {filteredProducts.length} kayıt
            </span>

          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "ID & Ürün",
                  "Pasaport Durumu",
                  "Versiyon",
                  "Blokzincir Mühürü",
                  "",
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
              {pagedProducts.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded block w-max mb-1">
                      {p.display_id || p.id}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {p.product_name}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {pendingStatusChange?.id === p.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">
                          {p.passport_status} →
                        </span>
                        <span className="text-xs font-black text-blue-700">
                          {pendingStatusChange.status}
                        </span>
                        <button
                          onClick={() => {
                            onStatusChange(p.id, pendingStatusChange.status);
                            setPendingStatusChange(null);
                          }}
                          className="px-2 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => setPendingStatusChange(null)}
                          className="px-2 py-1 border border-gray-200 text-gray-500 text-[10px] font-black rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <select
                        value={p.passport_status}
                        onChange={(e) => {
                          const newStatus = e.target.value as PassportStatus;
                          if (newStatus === p.passport_status) return;
                          if (
                            newStatus === "Geri Çağrıldı" ||
                            newStatus === "Arşivlendi"
                          ) {
                            setPendingStatusChange({
                              id: p.id,
                              status: newStatus,
                            });
                          } else {
                            onStatusChange(p.id, newStatus);
                          }
                        }}
                        className="text-xs font-bold border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {(
                          [
                            "Taslak",
                            "Yayında",
                            "Arşivlendi",
                            "Geri Çağrıldı",
                          ] as PassportStatus[]
                        ).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-mono font-black text-gray-700 bg-gray-100 px-2 py-1 rounded">
                      v{p.version}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {p.blockchain_timestamp ? (
                      <div className="flex items-center gap-1.5">
                        <Shield size={12} className="text-green-600" />
                        <span className="text-[10px] font-mono font-bold text-green-700">
                          {p.blockchain_timestamp.split("T")[0]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-bold italic">
                        Mühürsüz
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setInspectPopup(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      <Eye size={12} /> İncele
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pasaport Pagination */}
        {filteredProducts.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={() => setPassportsPage((p) => p - 1)}
              disabled={passportsPage === 0}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <ChevronDown size={13} className="rotate-90" /> Önceki
            </button>
            <span className="text-[11px] text-gray-400 font-medium">
              {passportsPage + 1} / {Math.ceil(filteredProducts.length / PAGE_SIZE)}
              <span className="ml-2 text-gray-300">({filteredProducts.length} kayıt)</span>
            </span>
            <button
              onClick={() => setPassportsPage((p) => p + 1)}
              disabled={(passportsPage + 1) * PAGE_SIZE >= filteredProducts.length}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Sonraki <ChevronDown size={13} className="-rotate-90" />
            </button>
          </div>
        )}
      </div>

      {/* Versiyon Geçmişi */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2">
          <GitBranch size={16} className="text-purple-600" />
          Versiyon Geçmişi (Audit Trail)
        </h2>
        <div className="relative border-l-2 border-gray-100 ml-3 space-y-5">
          {changelog.length > 0 ? (
            pagedChangelog.map((v, i) => {
              const changeTypeLabels: Record<string, string> = {
                CREATE: "DPP Oluşturuldu",
                UPDATE: "DPP Güncellendi",
                STATUS_UPDATE: "Durum Değiştirildi",
                APPROVE: "DPP Onaylandı",
                REJECT: "DPP Reddedildi",
                ARCHIVE: "DPP Arşivlendi",
                RECALL: "DPP Geri Çağrıldı",
                DRAFT: "Taslağa Alındı",
                SUBMIT: "Onaya Gönderildi",
              };
              const actionLabel =
                changeTypeLabels[v.change_type] ||
                v.change_type ||
                "Değişiklik";

              // Build detail string from changed_fields
              const formatStatus = (val: any) => {
                if (!val) return "";
                const valStr = String(val).toLowerCase();
                const statusLabels: Record<string, string> = {
                  draft: "Taslak",
                  pending_approval: "Onay Bekliyor",
                  published: "Yayında",
                  rejected: "Reddedildi",
                  archived: "Arşivlendi",
                  active: "Aktif",
                  deactivated: "Deaktive Edildi",
                  registered: "Kayıtlı",
                  recalled: "Geri Çağrıldı",
                };
                return statusLabels[valStr] || val;
              };

              const fieldLabels: Record<string, string> = {
                dpp_status: "Durum",
                production_line: "Üretim Hattı",
                shift: "Vardiya",
                production_route: "Üretim Rotası",
                ocak_no: "Ocak No",
                miktar_ton: "Miktar (ton)",
                is_active: "Aktif",
              };

              const formatValue = (key: string, val: any) => {
                if (val === null || val === undefined) return "";
                if (key === "dpp_status") return formatStatus(val);
                if (key === "is_active") {
                  return val === true || String(val).toLowerCase() === "true" ? "Aktif" : "Pasif";
                }
                return String(val);
              };

              let detailParts: string[] = [];
              const oldFields = v.previous_state?.changed_fields || {};
              const newFields = v.new_state?.changed_fields || {};

              for (const [key, newVal] of Object.entries(newFields)) {
                const label = fieldLabels[key] || key;
                const oldVal = oldFields[key];
                const displayOldVal = formatValue(key, oldVal);
                const displayNewVal = formatValue(key, newVal);
                if (oldVal !== undefined && oldVal !== null) {
                  detailParts.push(`${label}: ${displayOldVal} → ${displayNewVal}`);
                } else {
                  detailParts.push(`${label}: ${displayNewVal}`);
                }
              }
              // If no changed_fields, show status transition
              if (
                detailParts.length === 0 &&
                v.previous_state?.status &&
                v.new_state?.status
              ) {
                if (v.previous_state.status !== v.new_state.status) {
                  detailParts.push(
                    `Durum: ${formatStatus(v.previous_state.status)} → ${formatStatus(v.new_state.status)}`
                  );
                }
              }
              const detailStr =
                detailParts.length > 0
                  ? detailParts.join(" | ")
                  : v.change_type === "CREATE"
                  ? "DPP oluşturuldu"
                  : "Versiyon güncellendi";

              const changeTypeColors: Record<string, string> = {
                CREATE: "bg-green-50 text-green-700",
                APPROVE: "bg-green-50 text-green-700",
                UPDATE: "bg-blue-50 text-blue-700",
                STATUS_UPDATE: "bg-amber-50 text-amber-700",
                REJECT: "bg-red-50 text-red-700",
                ARCHIVE: "bg-gray-100 text-gray-600",
                RECALL: "bg-red-50 text-red-700",
                DRAFT: "bg-gray-100 text-gray-600",
                SUBMIT: "bg-amber-50 text-amber-700",
              };
              const badgeColor =
                changeTypeColors[v.change_type] || "bg-gray-100 text-gray-600";

              // Kaynak bilgisi
              const source = v.new_state?.creation_source;

              return (
                <div key={v.id || i} className="relative pl-6">
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-purple-300 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 block" />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {v.dpp_id
                            ? v.dpp_id.length > 8
                              ? v.dpp_id.slice(0, 8) + "…"
                              : v.dpp_id
                            : "DPP"}
                        </span>
                        <span className="text-[10px] font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                          v
                          {v.version || v.new_state?.current_version || "1.0.0"}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded ${badgeColor}`}
                        >
                          {actionLabel}
                        </span>
                        {source && (
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                              source === "SAP/Excel"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {source}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold shrink-0 ml-2">
                        {v.created_at
                          ? new Date(v.created_at).toLocaleString("tr-TR")
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-800">
                      {detailStr}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-gray-400 font-medium">
                        → {v.changed_by_name || v.changed_by_email || "System"}
                      </p>
                      {v.tx_hash && (
                        <span className="text-[10px] font-mono text-gray-300">
                          {v.tx_hash.slice(0, 10)}…
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-gray-400">Henüz aktivite bulunmuyor.</p>
          )}
        </div>
        {/* Changelog Pagination */}
        {changelog.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => setChangelogPage((p) => p - 1)}
              disabled={changelogPage === 0}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <ChevronDown size={13} className="rotate-90" /> Önceki
            </button>
            <span className="text-[11px] text-gray-400 font-medium">
              {changelogPage + 1} / {Math.ceil(changelog.length / PAGE_SIZE)}
              <span className="ml-2 text-gray-300">({changelog.length} kayıt)</span>
            </span>
            <button
              onClick={() => setChangelogPage((p) => p + 1)}
              disabled={(changelogPage + 1) * PAGE_SIZE >= changelog.length}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Sonraki <ChevronDown size={13} className="-rotate-90" />
            </button>
          </div>
        )}
      </div>
      {inspectPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setInspectPopup(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Eye size={16} className="text-blue-600" />
                </div>
                <h3 className="text-base font-black text-gray-900">
                  DPP İnceleme
                </h3>
              </div>
              <button
                onClick={() => setInspectPopup(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
                <span className="text-2xl">🚧</span>
              </div>
              <p className="text-sm font-black text-gray-800 text-center">
                Geliştirme Sürecinde
              </p>
              <p className="text-xs text-gray-400 font-medium text-center">
                Bu özellik yakında kullanıma açılacak.
              </p>
            </div>
            <button
              onClick={() => setInspectPopup(false)}
              className="mt-2 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
