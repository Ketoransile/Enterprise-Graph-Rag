"use client";

import React, { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";

import { AuthSplitLayout } from "@/components/marketing/AuthSplitLayout";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.auth.register(email, password, fullName || undefined);
      setAuth(data.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Request access"
      title="Create an account for governed document intelligence."
      description="Join a workspace where private knowledge, permissions, citations, and audit events stay connected from the first query."
      panelTitle="Create account"
      panelDescription="Use your team email. Workspace policies may require an admin invitation before access is enabled."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-white transition hover:text-teal-100">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-6 rounded-md border border-teal-300/[0.18] bg-teal-300/[0.08] px-4 py-3">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-200" />
          <div>
            <p className="text-sm font-semibold text-white">Access is governed</p>
            <p className="mt-1 text-xs leading-5 text-white/[0.54]">
              If this workspace is invite-only, your admin must provision your
              account before registration can complete.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="register-name" className="block text-sm font-medium text-white/[0.72]">
            Full name
          </label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/[0.34]" />
            <input
              id="register-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="premium-input pl-10"
              placeholder="Jane Doe"
              autoComplete="name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="register-email" className="block text-sm font-medium text-white/[0.72]">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/[0.34]" />
            <input
              id="register-email"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="premium-input pl-10"
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="register-password" className="block text-sm font-medium text-white/[0.72]">
            Password
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/[0.34]" />
            <input
              id="register-password"
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="premium-input px-10"
              placeholder="Choose a password"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-white/[0.42] transition hover:bg-white/[0.08] hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="flex items-start gap-3 rounded-md border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating account..." : "Create account"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
    </AuthSplitLayout>
  );
}
