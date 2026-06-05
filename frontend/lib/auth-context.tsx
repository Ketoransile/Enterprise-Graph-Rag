"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface AuthContextType {
  token: string | null;
  setAuth: (token: string) => void;
  clearAuth: () => void;
  ready: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
    }
    setReady(true);
  }, []);

  const setAuth = useCallback((newToken: string) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
  }, []);

  const clearAuth = useCallback(() => {
    setToken(null);
    localStorage.removeItem("token");
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
