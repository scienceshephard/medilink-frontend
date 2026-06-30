"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, tokenStore } from "./api";
import type { LoginRequest, Role, Token } from "./types";

interface AuthState {
  role: Role | null;
  token: string | null;
  ready: boolean;
  login: (payload: LoginRequest) => Promise<Token>;
  setSession: (token: Token) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(tokenStore.get());
    setRole((tokenStore.getRole() as Role) || null);
    setReady(true);
  }, []);

  const setSession = useCallback((t: Token) => {
    tokenStore.set(t.access_token, t.role);
    setToken(t.access_token);
    setRole(t.role);
  }, []);

  const login = useCallback(
    async (payload: LoginRequest) => {
      const t = await api.auth.login(payload);
      setSession(t);
      return t;
    },
    [setSession],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setRole(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ role, token, ready, login, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function homeForRole(role: Role | null): string {
  switch (role) {
    case "doctor":
      return "/doctor-portal";
    case "admin":
      return "/admin";
    default:
      return "/dashboard";
  }
}
