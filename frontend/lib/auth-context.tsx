"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

interface AuthContextType {
  token: string | null;
  setAuth: (token: string) => void;
  clearAuth: () => void;
  ready: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix));

  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

function writeAuthCookie(token: string) {
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=3600; samesite=lax`;
}

function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("token") || readCookie(AUTH_COOKIE_NAME);
    if (storedToken) {
      setToken(storedToken);
      localStorage.setItem("token", storedToken);
      writeAuthCookie(storedToken);
    } else {
      clearAuthCookie();
    }
    setReady(true);
  }, []);

  const setAuth = useCallback((newToken: string) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
    writeAuthCookie(newToken);
  }, []);

  const clearAuth = useCallback(() => {
    setToken(null);
    localStorage.removeItem("token");
    clearAuthCookie();
  }, []);

  const value = useMemo(
    () => ({ token, setAuth, clearAuth, ready }),
    [clearAuth, ready, setAuth, token],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
