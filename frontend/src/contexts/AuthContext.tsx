// frontend/src/contexts/AuthContext.tsx
// Tüm içeriği bununla değiştir:

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "../types/auth";
import { apiLogout } from "../lib/api";

export type Role =
  | "PUBLIC"
  | "CUSTOMER"
  | "SUPPLIER"
  | "AUTHORITY"
  | "ADMIN"
  | "ENGINEER";

function decodeTokenRole(token: string): Role | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    const r = decoded?.role;
    const valid: Role[] = [
      "PUBLIC",
      "CUSTOMER",
      "SUPPLIER",
      "AUTHORITY",
      "ADMIN",
      "ENGINEER",
    ];
    return valid.includes(r) ? (r as Role) : null;
  } catch {
    return null;
  }
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string, userData: User) => void;
  logout: () => void;
  isLoading: boolean;
  role: Role;
  setRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<Role>("PUBLIC");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      try {
        const parsed: User = JSON.parse(storedUser);
        setUser(parsed);
        const tokenRole = decodeTokenRole(token);
        setRole(tokenRole ?? (parsed.role as Role) ?? "PUBLIC");
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("refresh_token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, refreshToken: string, userData: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    const tokenRole = decodeTokenRole(token);
    setRole(tokenRole ?? (userData.role as Role) ?? "PUBLIC");
  };

  const logout = () => {
    const refreshToken = localStorage.getItem("refresh_token") ?? undefined;
    // Backend'e bildir (hata olsa da devam et)
    apiLogout(refreshToken).catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    setRole("PUBLIC");
  };

  // Idle timeout
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
        window.location.href = "/login?reason=idle";
      }, IDLE_TIMEOUT_MS);
    };
    const events = [
      "mousemove",
      "keydown",
      "mousedown",
      "touchstart",
      "scroll",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
        role,
        setRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined)
    throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
