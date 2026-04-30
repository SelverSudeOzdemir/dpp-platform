// src/types/auth.ts

export type UserRole = 'Admin' | 'Operator' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}