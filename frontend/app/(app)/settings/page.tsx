"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { token, clearAuth } = useAuth();

  if (!token) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white">Authentication Required</h2>
        <p className="text-slate-400 mt-2">Please sign in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-slate-50">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account preferences.</p>
      </header>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 space-y-6">
        <div className="border-t border-slate-800 pt-6">
          <button
            onClick={clearAuth}
            className="text-sm text-red-400 hover:text-red-300 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
