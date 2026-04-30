// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// JWT payload'ını decode eder (signature doğrulamaz — bu backend görevi)
// localStorage'daki role alanını doğrudan okumak yerine token'dan çekeriz
// böylece DevTools'dan role manipülasyonu engellenir
function decodeTokenRole(token: string): Role | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    const r = decoded?.role;
    const valid: Role[] = ['PUBLIC', 'CUSTOMER', 'SUPPLIER', 'AUTHORITY', 'ADMIN', 'ENGINEER'];
    return valid.includes(r) ? (r as Role) : null;
  } catch {
    return null;
  }
}
import { User } from '../types/auth';

// 1. PDF'ten gelen 4 temel rolümüzü (RBAC) sisteme tanıtıyoruz
export type Role = 'PUBLIC' | 'CUSTOMER' | 'SUPPLIER' | 'AUTHORITY' | 'ADMIN' | 'ENGINEER';

interface AuthContextType {
  // Senin eski tanımların (Kimlik Doğrulama)
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isLoading: boolean;
  
  // Yeni eklediğimiz tanımlar (Rol / Sunum Modu Yönetimi)
  role: Role;
  setRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 dakika

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // -- KİMLİK (AUTH) STATE'LERİ --
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // -- ROL (AUTHORIZATION) STATE'İ --
  // Login olmayan herkes PUBLIC'ten başlar
  const [role, setRole] = useState<Role>('PUBLIC');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      // Rolü token'dan çek — localStorage'daki role alanı manipüle edilmiş olabilir
      const tokenRole = decodeTokenRole(token);
      setRole(tokenRole ?? 'PUBLIC');
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    // Rolü token'dan çek; decode başarısız olursa userData.role'e fallback
    const tokenRole = decodeTokenRole(token);
    setRole(tokenRole ?? (userData.role as Role) ?? 'PUBLIC');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setRole('PUBLIC');
  };

  // -- IDLE TIMEOUT — 15 dakika hareketsizlik → otomatik çıkış --
  useEffect(() => {
    if (!user) return; // Giriş yapılmamışsa dinleyici kurma

    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
        window.location.href = '/login?reason=idle';
      }, IDLE_TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset(); // Sayacı başlat

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    // Sağlayıcıya hem senin Auth fonksiyonlarını hem de yeni Rol fonksiyonlarını geçiriyoruz
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading, role, setRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};