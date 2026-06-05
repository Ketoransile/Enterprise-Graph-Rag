import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { BrandMark } from "@/components/marketing/BrandMark";

interface AuthSplitLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  panelTitle: string;
  panelDescription: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

const benefits = [
  "Cited answers from approved source passages",
  "Role-aware retrieval before context reaches the model",
  "Audit trails across queries, uploads, and access checks",
];

export function AuthSplitLayout({
  eyebrow,
  title,
  description,
  panelTitle,
  panelDescription,
  children,
  footer,
}: AuthSplitLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070d] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#05070d_0%,#090b10_48%,#05070d_100%)]" />
      <div className="premium-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(90%_90%_at_50%_0%,rgba(20,184,166,0.18),rgba(5,7,13,0)_72%)]" />

      <Link
        href="/"
        className="absolute right-5 top-6 z-20 inline-flex h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-sm font-medium text-white/70 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white sm:right-6 lg:right-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>

      <main className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl gap-8 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_1px_minmax(420px,0.78fr)] lg:items-center lg:px-8">
        <section className="flex min-h-[420px] flex-col justify-between py-4 lg:min-h-[680px] lg:py-12">
          <div className="flex items-center justify-start gap-4 pr-24">
            <BrandMark />
          </div>

          <div className="max-w-2xl py-14 lg:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-200/80">
              {eyebrow}
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/[0.64] sm:text-lg">
              {description}
            </p>

            <div className="mt-8 grid max-w-xl gap-3">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 text-sm text-white/[0.72]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <AuthVisual />
        </section>

        <div className="hidden h-[min(76vh,720px)] w-px bg-gradient-to-b from-transparent via-white/[0.16] to-transparent lg:block" />

        <section className="flex items-center justify-center pb-8 lg:pb-0">
          <div className="w-full max-w-[460px]">
            <div className="rounded-lg border border-white/[0.12] bg-white/[0.055] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-8">
              <div className="mb-7">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {panelTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/[0.56]">
                  {panelDescription}
                </p>
              </div>
              {children}
            </div>
            <div className="mt-6 text-center text-sm text-white/50">{footer}</div>
          </div>
        </section>
      </main>
    </div>
  );
}

function AuthVisual() {
  return (
    <div className="hidden max-w-xl rounded-lg border border-white/10 bg-black/[0.24] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.28)] lg:block">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/[0.38]">
            Workspace posture
          </p>
          <p className="mt-1 text-sm font-semibold text-white">Secure retrieval online</p>
        </div>
        <span className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
          Healthy
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <VisualMetric icon={<FileText className="h-4 w-4" />} label="Documents" value="1,284" />
        <VisualMetric icon={<Database className="h-4 w-4" />} label="Entities" value="9.7k" />
        <VisualMetric icon={<ShieldCheck className="h-4 w-4" />} label="Access pass" value="99.2%" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.78fr]">
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-white/[0.56]">
            <LockKeyhole className="h-3.5 w-3.5 text-teal-200" />
            Pre-LLM checks
          </div>
          <div className="space-y-2">
            {["Role match", "Sensitivity filter", "Source lineage"].map((item) => (
              <div key={item} className="flex items-center justify-between text-xs">
                <span className="text-white/[0.64]">{item}</span>
                <span className="text-emerald-200">Passed</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
          <p className="text-xs font-medium text-white/[0.56]">Answer quality</p>
          <div className="mt-4 flex h-20 items-end gap-1.5">
            {[38, 54, 42, 68, 74, 61, 88].map((height, index) => (
              <span
                key={`${height}-${index}`}
                className="flex-1 rounded-sm bg-gradient-to-t from-teal-400/[0.55] to-white/80"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-white text-black">
        {icon}
      </div>
      <p className="text-xs text-white/[0.44]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
