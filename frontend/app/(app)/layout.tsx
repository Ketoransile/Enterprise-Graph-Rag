"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  RiBarChart2Line,
  RiBook2Line,
  RiBubbleChartLine,
  RiChat3Line,
  RiHome5Line,
  RiSettings4Line,
  RiShieldUserLine,
  RiFileListLine,
  RiGroupLine,
  RiLogoutBoxRLine,
} from "react-icons/ri";

import { useAuth } from "@/lib/auth-context";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: <RiHome5Line /> },
  { href: "/documents", label: "Documents", icon: <RiBook2Line /> },
  { href: "/chat", label: "Chat", icon: <RiChat3Line /> },
  { href: "/graph", label: "Graph", icon: <RiBubbleChartLine /> },
  { href: "/analytics", label: "Analytics", icon: <RiBarChart2Line /> },
  { href: "/settings", label: "Settings", icon: <RiSettings4Line /> },
];

const adminNav = [
  { href: "/admin/users", label: "Users", icon: <RiGroupLine /> },
  { href: "/admin/roles", label: "Roles", icon: <RiShieldUserLine /> },
  { href: "/audit-logs", label: "Audit Logs", icon: <RiFileListLine /> },
];

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { token, ready, clearAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !token) {
      router.replace("/login");
    }
  }, [ready, token, router]);

  if (!ready || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] text-slate-300">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-sm">Loading workspace…</span>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex bg-[#0a0e1a]">
      <aside className="hidden md:flex flex-col w-72 bg-[#0d1225]/80 border-r border-white/[0.04] backdrop-blur-xl">
        <div className="p-6 flex-1 flex flex-col gap-6">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <circle cx="19" cy="5" r="2"/>
                  <circle cx="5" cy="19" r="2"/>
                  <line x1="14.5" y1="10" x2="17.5" y2="6.5"/>
                  <line x1="9.5" y1="14" x2="6.5" y2="17.5"/>
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-white">GraphRAG</h1>
                <p className="text-xs text-slate-500">Document Intelligence</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 dot-pulse" />
              <span className="text-xs font-medium text-emerald-300">
                Secure workspace
              </span>
            </div>
          </div>

          {/* Main nav */}
          <nav className="space-y-1 flex-1">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-2 px-3">Main</p>
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                      : "text-slate-400 hover:bg-white/[0.03] hover:text-white border border-transparent"
                  }`}
                >
                  <span className={`text-lg ${active ? "text-indigo-400" : "text-slate-500"}`}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}

            <div className="h-px bg-white/[0.04] my-4" />

            <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-2 px-3">Admin</p>
            {adminNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                      : "text-slate-400 hover:bg-white/[0.03] hover:text-white border border-transparent"
                  }`}
                >
                  <span className={`text-lg ${active ? "text-indigo-400" : "text-slate-500"}`}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="space-y-3">
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
              <p className="text-xs font-semibold text-slate-300">Environment</p>
              <p className="text-xs text-slate-500 mt-1">
                Local dev · RBAC enforced
              </p>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all duration-200">
                  <span className="text-lg"><RiLogoutBoxRLine /></span>
                  Sign out
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Sign Out</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to securely sign out of your workspace session?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <button className="px-4 py-2 text-sm rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition">
                      Cancel
                    </button>
                  </DialogClose>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition border border-red-500/50"
                  >
                    Sign out securely
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
    </div>
  );
}
