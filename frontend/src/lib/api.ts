// frontend/src/lib/api.ts
// Tüm içeriği bununla değiştir:

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
  await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ refresh_token: refreshToken ?? null }),
  });
}

// ── USERS (Admin) ────────────────────────────────────────────────────────────

export async function apiGetUsers() {
  const res = await fetch(`${BASE_URL}/users/`, {
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

export async function fetchDPP(publicId: string) {
  const res = await fetch(`${BASE_URL}/dpp/${publicId}`);
  if (!res.ok) throw new Error("DPP bulunamadı");
  return res.json();
}

export async function fetchProducts() {
  const res = await fetch(`${BASE_URL}/products`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Ürünler alınamadı");
  return res.json();
}
