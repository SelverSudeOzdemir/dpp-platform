// frontend/src/types/auth.ts
// Tüm içeriği bununla değiştir:

export type UserRole =
  | "ADMIN"
  | "ENGINEER"
  | "AUTHORITY"
  | "CUSTOMER"
  | "SUPPLIER"
  | "PUBLIC";

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}
