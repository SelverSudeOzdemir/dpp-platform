// frontend/src/lib/api.ts

import { TokenResponse, LoginRequest, User } from "../types/auth";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── AUTH ────────────────────────────────────────────────────────────────────

export async function apiLogin(data: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Giriş başarısız");
  }
  return res.json();
}

export async function apiGetMe(): Promise<User> {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Kullanıcı bilgisi alınamadı");
  return res.json();
}

export async function apiRefreshToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error("Token yenilenemedi");
  return res.json();
}

export async function apiLogout(refreshToken?: string): Promise<void> {
  await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({ refresh_token: refreshToken ?? null }),
  });
}

// ── USERS ────────────────────────────────────────────────────────────────────

export async function apiGetUsers() {
  const res = await fetch(`${BASE_URL}/users/`, { headers: { ...getAuthHeader() } });
  if (!res.ok) throw new Error("Kullanıcılar alınamadı");
  return res.json();
}

export async function apiCreateUser(data: {
  email: string; password: string; full_name?: string; role: string;
}) {
  const res = await fetch(`${BASE_URL}/users/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Kullanıcı oluşturulamadı");
  }
  return res.json();
}

export async function apiUpdateUserRole(userId: string, role: string) {
  const res = await fetch(`${BASE_URL}/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error("Rol güncellenemedi");
  return res.json();
}

export async function apiUpdateUserStatus(userId: string, is_active: boolean) {
  const res = await fetch(`${BASE_URL}/users/${userId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({ is_active }),
  });
  if (!res.ok) throw new Error("Durum güncellenemedi");
  return res.json();
}

export async function apiDeleteUser(userId: string) {
  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    method: "DELETE",
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Kullanıcı silinemedi");
}

// ── AUDIT LOGS ───────────────────────────────────────────────────────────────

export async function apiGetRecentAuditLogs(limit = 10) {
  const res = await fetch(`${BASE_URL}/audit-logs/recent?limit=${limit}`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Audit loglar alınamadı");
  return res.json();
}

// ── DPP ─────────────────────────────────────────────────────────────────────

/** Dashboard istatistik kartları */
export async function apiGetDppSummaryStats(): Promise<{
  total: number; published: number; draft: number;
  pending_approval: number; rejected: number; archived: number;
}> {
  const res = await fetch(`${BASE_URL}/dpps/summary-stats`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`İstatistikler alınamadı [${res.status}]: ${body.detail ?? res.statusText}`);
  }
  return res.json();
}

/** DPP listesi */
export async function apiGetDpps(params?: {
  skip?: number; limit?: number; status?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.skip !== undefined) qs.set("skip", String(params.skip));
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.status) qs.set("status", params.status);
  const res = await fetch(`${BASE_URL}/dpps/?${qs}`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("DPP listesi alınamadı");
  return res.json();
}

/** Tekil DPP detayı */
export async function apiGetDppById(dppId: string) {
  const res = await fetch(`${BASE_URL}/dpps/${dppId}`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("DPP bulunamadı");
  return res.json();
}

/** DPP sil (soft-delete) */
export async function apiDeleteDpp(dppId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/dpps/${dppId}`, {
    method: "DELETE",
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("DPP silinemedi");
}

/** DPP güncelle */
export async function apiUpdateDpp(dppId: string, data: {
  dpp_status?: string; is_active?: boolean; current_version?: string;
}) {
  const res = await fetch(`${BASE_URL}/dpps/${dppId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("DPP güncellenemedi");
  return res.json();
}

/** Yeni DPP oluştur */
export async function apiCreateDpp(data: {
  product_type_id: string; gs1_serial_number: string;
  production_date: string; gtin?: string;
}) {
  const res = await fetch(`${BASE_URL}/dpps/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "DPP oluşturulamadı");
  }
  return res.json();
}

// ── Geriye dönük uyumluluk ───────────────────────────────────────────────────

export async function fetchDPP(publicId: string) {
  return apiGetDppById(publicId);
}

export async function fetchProducts() {
  return apiGetDpps({ limit: 100 });
}