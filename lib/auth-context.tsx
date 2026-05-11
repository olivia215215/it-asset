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

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsDemo: (role: UserRole) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  unreadNotifications: number;
  setUnreadNotifications: (n: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const demoUsers: Record<UserRole, User> = {
  EMPLOYEE:  { id: "demo-emp",  name: "张三", email: "zhangsan@example.com",   role: "EMPLOYEE",  department: "技术部", departmentId: "dept-tech" },
  MANAGER:   { id: "demo-mgr",  name: "李四", email: "lisi@example.com",       role: "MANAGER",   department: "技术部", departmentId: "dept-tech" },
  IT_ADMIN:  { id: "demo-it",   name: "王五", email: "wangwu@example.com",     role: "IT_ADMIN",  department: "IT 部", departmentId: "dept-it" },
  EXECUTIVE: { id: "demo-exec", name: "赵六", email: "zhaoliu@example.com",    role: "EXECUTIVE", department: "管理层", departmentId: "dept-mgmt" },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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
          // Session invalid, clear token
          clearToken();
          setTokenState(null);
          setUser(null);
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

  const loginAsDemo = useCallback((role: UserRole) => {
    const demoUser = demoUsers[role];
    const fakeToken = "demo-token-" + role + "-" + Date.now();
    setToken(fakeToken);
    setTokenState(fakeToken);
    setUser(demoUser);
  }, []);

  const logout = useCallback(() => {
    // Fire and forget the logout request
    apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {
      // ignore errors
    });
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const setRole = useCallback(
    (role: UserRole) => {
      setUser((prev) => (prev ? { ...prev, role } : prev));
    },
    [],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      loading,
      login,
      loginAsDemo,
      logout,
      setRole,
      unreadNotifications,
      setUnreadNotifications,
    }),
    [user, token, loading, login, loginAsDemo, logout, setRole, unreadNotifications],
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
