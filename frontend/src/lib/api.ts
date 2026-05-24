// frontend/src/lib/api.ts

import { TokenResponse, LoginRequest, User } from "../types/auth";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── 401 AUTO-LOGOUT ──────────────────────────────────────────────────────────

let _onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void): void {
  _onUnauthorized = fn;
}

// Token gerektiren tüm API çağrıları bu wrapper üzerinden geçer.
// 401 gelirse ve localStorage'da token varsa → expired token → otomatik logout.
async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401 && localStorage.getItem("token") && _onUnauthorized) {
    _onUnauthorized();
  }
  return res;
}

// ── AUTH ────────────────────────────────────────────────────────────────────
// apiLogin ve apiRefreshToken raw fetch kullanır — 401 orada = yanlış şifre/token

export async function apiLogin(data: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.detail === "string"
        ? err.detail
        : err.detail
        ? JSON.stringify(err.detail)
        : "Giriş başarısız"
    );
  }
  return res.json();
}

export async function apiGetMe(): Promise<User> {
  const res = await authFetch(`${BASE_URL}/auth/me`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Kullanıcı bilgisi alınamadı");
  return res.json();
}

export async function apiRefreshToken(
  refreshToken: string
): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error("Token yenilenemedi");
  return res.json();
}

export async function apiLogout(refreshToken?: string): Promise<void> {
  await authFetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({ refresh_token: refreshToken ?? null }),
  });
}

// ── USERS ────────────────────────────────────────────────────────────────────

export async function apiGetUsers() {
  const res = await authFetch(`${BASE_URL}/users/`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Kullanıcılar alınamadı");
  return res.json();
}

export async function apiCreateUser(data: {
  email: string;
  password: string;
  full_name?: string;
  role: string;
}) {
  const res = await authFetch(`${BASE_URL}/users/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.detail === "string"
        ? err.detail
        : err.detail
        ? JSON.stringify(err.detail)
        : "Kullanıcı oluşturulamadı"
    );
  }
  return res.json();
}

export async function apiInviteUser(data: {
  email: string;
  full_name: string;
  role: string;
  company_name?: string;
}) {
  const res = await authFetch(`${BASE_URL}/users/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.detail === "string"
        ? err.detail
        : err.detail
        ? JSON.stringify(err.detail)
        : "Kullanıcı davet edilemedi"
    );
  }
  return res.json();
}

export async function apiUpdateUserRole(userId: string, role: string) {
  const res = await authFetch(`${BASE_URL}/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error("Rol güncellenemedi");
  return res.json();
}

export async function apiUpdateUserStatus(userId: string, is_active: boolean) {
  const res = await authFetch(`${BASE_URL}/users/${userId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({ is_active }),
  });
  if (!res.ok) throw new Error("Durum güncellenemedi");
  return res.json();
}

export async function apiDeleteUser(userId: string) {
  const res = await authFetch(`${BASE_URL}/users/${userId}`, {
    method: "DELETE",
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Kullanıcı silinemedi");
}

// ── AUDIT LOGS ───────────────────────────────────────────────────────────────

export async function apiGetRecentAuditLogs(params?: {
  skip?: number;
  limit?: number;
  role?: string;
  action?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.skip !== undefined) qs.set("skip", String(params.skip));
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.role) qs.set("role", params.role);
  if (params?.action) qs.set("action", params.action);
  const res = await authFetch(`${BASE_URL}/audit-logs/recent?${qs}`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Audit loglar alınamadı");
  return res.json();
}

// ── DPP ─────────────────────────────────────────────────────────────────────

/** Dashboard istatistik kartları */
export async function apiGetDppSummaryStats(): Promise<{
  total: number;
  published: number;
  draft: number;
  pending_approval: number;
  rejected: number;
  archived: number;
}> {
  const res = await authFetch(`${BASE_URL}/dpps/summary-stats`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `İstatistikler alınamadı [${res.status}]: ${
        body.detail ?? res.statusText
      }`
    );
  }
  return res.json();
}

/** DPP listesi */
export async function apiGetDpps(params?: {
  skip?: number;
  limit?: number;
  status?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.skip !== undefined) qs.set("skip", String(params.skip));
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.status) qs.set("status", params.status);
  const res = await authFetch(`${BASE_URL}/dpps/?${qs}`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("DPP listesi alınamadı");
  return res.json();
}

/** Tekil DPP detayı */
export async function apiGetDppById(dppId: string) {
  const res = await authFetch(`${BASE_URL}/dpps/${dppId}`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("DPP bulunamadı");
  return res.json();
}

/** DPP sil (soft-delete) */
export async function apiDeleteDpp(dppId: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/dpps/${dppId}`, {
    method: "DELETE",
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("DPP silinemedi");
}

/** DPP güncelle */
export async function apiUpdateDpp(
  dppId: string,
  data: {
    dpp_status?: string;
    is_active?: boolean;
    current_version?: string;
    production_route?: string;
    ocak_no?: string;
    miktar_ton?: number;
  }
) {
  const res = await authFetch(`${BASE_URL}/dpps/${dppId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("DPP güncellenemedi");
  return res.json();
}

/** Yeni DPP oluştur */
export async function apiCreateDpp(data: {
  product_type_id: string;
  gs1_serial_number: string;
  production_date: string;
  gtin?: string;
  production_route?: string;
  ocak_no?: string;
  miktar_ton?: number;
}) {
  const res = await authFetch(`${BASE_URL}/dpps/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.detail === "string"
        ? err.detail
        : err.detail
        ? JSON.stringify(err.detail)
        : "DPP oluşturulamadı"
    );
  }
  return res.json();
}

/** Mock SAP belgelerini parse edip DPP alanlarına dönüştür */
export async function apiParseDocs(docIds: string[]): Promise<{
  batchInfo: Record<string, string>;
  dppData: Record<string, string>;
  parsed_docs: string[];
  skipped_docs: string[];
}> {
  const res = await authFetch(`${BASE_URL}/integrations/documents/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({ doc_ids: docIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.detail === "string"
        ? err.detail
        : err.detail
        ? JSON.stringify(err.detail)
        : "Belgeler parse edilemedi"
    );
  }
  return res.json();
}
// ── ADMIN KPI ────────────────────────────────────────────────────────────────

export async function apiGetKpiSummary() {
  const res = await authFetch(`${BASE_URL}/admin/kpi-summary`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("KPI alınamadı");
  return res.json();
}

export async function apiGetPendingDpps() {
  const res = await authFetch(`${BASE_URL}/admin/pending`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Onay bekleyen DPP'ler alınamadı");
  return res.json();
}

export async function apiGetUrgentAlerts() {
  const res = await authFetch(`${BASE_URL}/admin/urgent-alerts`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Uyarılar alınamadı");
  return res.json();
}

export async function apiApproveDpp(dppId: string) {
  const res = await authFetch(`${BASE_URL}/admin/approve/${dppId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Onay işlemi başarısız");
  return res.json();
}

export async function apiRejectDpp(
  dppId: string,
  reason: string,
  fields: string[] = []
) {
  const res = await authFetch(`${BASE_URL}/admin/reject/${dppId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({
      status: "rejected",
      rejection_reason: reason,
      failed_fields: fields,
    }),
  });
  if (!res.ok) throw new Error("Red işlemi başarısız");
  return res.json();
}

export async function apiGetIncompleteReport() {
  const res = await authFetch(`${BASE_URL}/admin/incomplete-report`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Eksik veri raporu alınamadı");
  return res.json();
}

export async function apiGetPermissionsMatrix() {
  const res = await authFetch(`${BASE_URL}/admin/permissions-matrix`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Rol yetki matrisi alınamadı");
  return res.json();
}

// ── SERTİFİKALAR ─────────────────────────────────────────────────────────────

export async function apiGetCertifications(params?: {
  dpp_id?: string;
  cert_scope?: string;
  cert_status?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.dpp_id) qs.set("dpp_id", params.dpp_id);
  if (params?.cert_scope) qs.set("cert_scope", params.cert_scope);
  if (params?.cert_status) qs.set("cert_status", params.cert_status);
  const res = await authFetch(`${BASE_URL}/certifications/?${qs}`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Sertifikalar alınamadı");
  return res.json();
}

export async function apiGetExpiringSoon(days = 30) {
  const res = await authFetch(
    `${BASE_URL}/certifications/expiring?days=${days}`,
    {
      headers: { ...getAuthHeader() },
    }
  );
  if (!res.ok) throw new Error("Yaklaşan sertifikalar alınamadı");
  return res.json();
}

// ── COMPLIANCE ────────────────────────────────────────────────────────────────

export async function apiGetCbamStatus() {
  const res = await authFetch(`${BASE_URL}/compliance/cbam-status`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("CBAM durumu alınamadı");
  return res.json();
}

export async function apiGetReachReport(productTypeId: string) {
  const res = await authFetch(`${BASE_URL}/compliance/reach/${productTypeId}`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("REACH raporu alınamadı");
  return res.json();
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────────

export async function apiGetProducts() {
  const res = await authFetch(`${BASE_URL}/products/`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      typeof err.detail === "string"
        ? err.detail
        : err.detail
        ? JSON.stringify(err.detail)
        : "Ürünler alınamadı";
    throw new Error(msg);
  }
  return res.json();
}

export async function apiGetProductById(productId: string) {
  const res = await authFetch(`${BASE_URL}/products/${productId}`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Ürün bulunamadı");
  return res.json();
}

export async function apiGetChemicalComposition(productId: string) {
  const res = await authFetch(`${BASE_URL}/products/${productId}/chemical`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function apiGetMechanicalProperties(productId: string) {
  const res = await authFetch(`${BASE_URL}/products/${productId}/mechanical`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) return null;
  return res.json();
}

// ── CHANGELOG ─────────────────────────────────────────────────────────────────

export async function apiGetDppChangelog(dppId: string) {
  const res = await authFetch(`${BASE_URL}/dpps/${dppId}/changelog`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Changelog alınamadı");
  return res.json();
}

// ── AUDIT LOGS (genişletilmiş) ────────────────────────────────────────────────

export async function apiGetAccessLogs(params?: {
  dpp_id?: string;
  role?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.dpp_id) qs.set("dpp_id", params.dpp_id);
  if (params?.role) qs.set("role", params.role);
  const res = await authFetch(`${BASE_URL}/audit-logs/access-logs?${qs}`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Erişim logları alınamadı");
  return res.json();
}

export async function apiGetDppAuditLogs(dppId: string) {
  const res = await authFetch(`${BASE_URL}/audit-logs/dpp/${dppId}`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("DPP audit logları alınamadı");
  return res.json();
}

export async function apiChangePassword(
  currentPassword: string,
  newPassword: string
) {
  const res = await authFetch(`${BASE_URL}/users/me/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (res.ok) return;
  const err = await res.json().catch(() => ({}));
  throw new Error(
    typeof err.detail === "string"
      ? err.detail
      : err.detail
      ? JSON.stringify(err.detail)
      : "Şifre değiştirme işlemi başarısız."
  );
}

// ── INTEGRATIONS ─────────────────────────────────────────────────────────────

export async function apiSyncSap(batchNo: string): Promise<{
  batchInfo: any;
  dppData: any;
}> {
  const res = await authFetch(
    `${BASE_URL}/integrations/sap/${encodeURIComponent(batchNo)}`,
    {
      headers: { ...getAuthHeader() },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.detail === "string"
        ? err.detail
        : err.detail
        ? JSON.stringify(err.detail)
        : "SAP senkronizasyonu başarısız"
    );
  }
  return res.json();
}


// ── USERS MANAGEMENT ─────────────────────────────────────────────────────────

// ── DPP MANAGEMENT ───────────────────────────────────────────────────────────

export async function apiGetDppSummary() {
  const res = await authFetch(`${BASE_URL}/dpps/summary-stats`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Özet istatistikler alınamadı");
  return res.json();
}

export async function apiGetGlobalChangelog(skip = 0, limit = 50) {
  const res = await authFetch(
    `${BASE_URL}/dpps/admin/changelog?skip=${skip}&limit=${limit}`,
    {
      headers: { ...getAuthHeader() },
    }
  );
  if (!res.ok) throw new Error("Global changelog alınamadı");
  return res.json();
}
