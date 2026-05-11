"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch, setToken, clearToken, getToken } from "./api-client";

export type UserRole = "EMPLOYEE" | "MANAGER" | "IT_ADMIN" | "EXECUTIVE";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department: string;
  departmentId: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface SessionResponse {
  user: User;
}

const defaultUser: User = {
  id: "default-user-id",
  name: "张明",
  email: "zhangming@example.com",
  role: "EMPLOYEE",
  department: "技术部",
  departmentId: "dept-tech",
};

interface AuthContextType {
  user: User;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setRole: (role: UserRole) => void;
  unreadNotifications: number;
  setUnreadNotifications: (n: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(defaultUser);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Restore session on mount
  useEffect(() => {
    const storedToken = getToken();
    if (storedToken) {
      setTokenState(storedToken);
      apiFetch<SessionResponse>("/api/auth/session")
        .then((data) => {
          setUser(data.user);
        })
        .catch(() => {
          // Session invalid, use default user
          clearToken();
          setTokenState(null);
          setUser(defaultUser);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    // Fire and forget the logout request
    apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {
      // ignore errors
    });
    clearToken();
    setTokenState(null);
    setUser(defaultUser);
  }, []);

  const setRole = useCallback(
    (role: UserRole) => {
      setUser((prev) => ({ ...prev, role }));
    },
    [],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      setRole,
      unreadNotifications,
      setUnreadNotifications,
    }),
    [user, token, loading, login, logout, setRole, unreadNotifications],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
