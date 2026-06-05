"use client";

import React, { Suspense, useEffect, type FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";

import { AuthSplitLayout } from "@/components/marketing/AuthSplitLayout";
import { api } from "@/lib/api-client";
import { AUTH_REDIRECT_PARAM, getSafeRedirectPath } from "@/lib/auth-cookie";
import { useAuth } from "@/lib/auth-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, setAuth, token } = useAuth();
  const oauthStatus = searchParams.get("oauth");
  const queryError = searchParams.get("error");
  const nextPath = getSafeRedirectPath(searchParams.get(AUTH_REDIRECT_PARAM));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (ready && token && oauthStatus !== "success") {
      router.replace(nextPath as any);
      return;
    }

    if (oauthStatus === "success") {
      let ignore = false;

      async function completeGoogleLogin() {
        setError(null);
        setLoading(true);
        try {
          const data = await api.auth.googleComplete();
          if (ignore) return;
          setAuth(data.access_token);
          router.replace(nextPath as any);
        } catch {
          if (!ignore) {
            setError("Google sign-in could not be completed. Please try again.");
            router.replace("/login");
          }
        } finally {
          if (!ignore) setLoading(false);
        }
      }

      completeGoogleLogin();
      return () => {
        ignore = true;
      };
    }

    if (queryError) {
      setError(queryError);
      router.replace("/login");
    }
  }, [nextPath, oauthStatus, queryError, ready, router, setAuth, token]);

  const handleGoogle = async () => {
    try {
      const { auth_url } = await api.auth.googleStart();
      window.location.href = auth_url;
    } catch {
      setError("Google SSO is not configured for this workspace.");
    }
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.auth.login(email, password);
      setAuth(data.access_token);
      router.replace(nextPath as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      eyebrow="Welcome back"
      title="Secure access to your knowledge workspace."
      description="Sign in to query governed documents, inspect citations, and keep retrieval decisions auditable across your team."
      panelTitle="Sign in"
      panelDescription="Use your workspace credentials or continue with Google if SSO is enabled."
      footer={
        <>
          New to GraphRAG?{" "}
          <Link href="/register" className="font-medium text-white transition hover:text-teal-100">
            Request access
          </Link>
        </>
      }
    >
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-md border border-white/[0.12] bg-white/[0.045] px-4 text-sm font-semibold text-white transition hover:border-white/[0.22] hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/[0.36]">
          or email
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="login-email" className="block text-sm font-medium text-white/[0.72]">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/[0.34]" />
            <input
              id="login-email"
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
          <label htmlFor="login-password" className="block text-sm font-medium text-white/[0.72]">
            Password
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/[0.34]" />
            <input
              id="login-password"
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="premium-input px-10"
              placeholder="Enter your password"
              autoComplete="current-password"
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
          {loading ? "Signing in..." : "Sign in"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
    </AuthSplitLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <AuthSplitLayout
      eyebrow="Welcome back"
      title="Secure access to your knowledge workspace."
      description="Preparing the sign-in flow for your governed retrieval workspace."
      panelTitle="Sign in"
      panelDescription="Loading authentication options."
      footer={<span>Loading...</span>}
    >
      <div className="space-y-5">
        <div className="h-12 rounded-md border border-white/10 bg-white/[0.045]" />
        <div className="h-px bg-white/10" />
        <div className="space-y-2">
          <div className="h-4 w-28 rounded-sm bg-white/10" />
          <div className="h-12 rounded-md border border-white/10 bg-white/[0.045]" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 rounded-sm bg-white/10" />
          <div className="h-12 rounded-md border border-white/10 bg-white/[0.045]" />
        </div>
        <div className="h-12 rounded-md bg-white" />
      </div>
    </AuthSplitLayout>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.05-3.71 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1A6.64 6.64 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}
