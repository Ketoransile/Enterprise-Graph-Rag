"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RiArrowRightUpLine,
  RiBarChartBoxLine,
  RiBook2Line,
  RiChat3Line,
  RiDatabase2Line,
  RiFileTextLine,
  RiLogoutBoxRLine,
  RiPulseLine,
  RiRefreshLine,
  RiShieldCheckLine,
  RiSparkling2Line,
  RiUploadCloud2Line,
} from "react-icons/ri";

import { PageSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { api, type AnalyticsResponse, type Document } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  roles?: string[];
}

type StatusKey = "COMPLETED" | "PROCESSING" | "PENDING" | "FAILED";

const statusOrder: StatusKey[] = ["COMPLETED", "PROCESSING", "PENDING", "FAILED"];

export default function DashboardPage() {
  const { token, clearAuth } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (!token) {
        setUser(null);
        setProfileError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setProfileError(null);
      const [docsResult, profileResult, analyticsResult] = await Promise.allSettled([
        api.documents.list(token),
        api.auth.me(token),
        api.analytics.getMetrics(token, 30),
      ]);

      if (ignore) return;

      if (docsResult.status === "fulfilled") {
        setDocuments(docsResult.value);
      } else {
        toast({
          title: "Documents unavailable",
          description: "Dashboard document metrics could not be loaded.",
          variant: "destructive",
        });
      }

      if (profileResult.status === "fulfilled") {
        setUser(profileResult.value as UserProfile);
      } else {
        setUser(null);
        setProfileError("Your account profile could not be loaded. Retry the request or sign in again if the session has expired.");
        toast({
          title: "Profile unavailable",
          description: "Your workspace profile could not be loaded.",
          variant: "destructive",
        });
      }

      if (analyticsResult.status === "fulfilled") {
        setAnalytics(analyticsResult.value);
      }

      setLoading(false);
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [retryKey, token, toast]);

  const stats = useMemo(() => {
    const byStatus = documents.reduce<Record<StatusKey, number>>(
      (acc, doc) => {
        const status = doc.processing_status as StatusKey;
        if (status in acc) acc[status] += 1;
        return acc;
      },
      { COMPLETED: 0, PROCESSING: 0, PENDING: 0, FAILED: 0 },
    );

    const bySecurity = documents.reduce<Record<string, number>>((acc, doc) => {
      acc[doc.security_level] = (acc[doc.security_level] ?? 0) + 1;
      return acc;
    }, {});

    const readyRate = documents.length
      ? Math.round((byStatus.COMPLETED / documents.length) * 100)
      : 0;
    const protectedCount =
      (bySecurity.CONFIDENTIAL ?? 0) + (bySecurity.RESTRICTED ?? 0);
    const attentionCount = byStatus.FAILED + byStatus.PROCESSING + byStatus.PENDING;
    const latestDocument = [...documents].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];

    return {
      byStatus,
      bySecurity,
      readyRate,
      protectedCount,
      attentionCount,
      latestDocument,
    };
  }, [documents]);

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-semibold text-black dark:text-white">Authentication Required</h2>
          <p className="mt-2 text-sm text-neutral-500">Please sign in to access your workspace.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return (
      <AccountUnavailable
        message={profileError}
        onRetry={() => setRetryKey((value) => value + 1)}
        onSignOut={clearAuth}
      />
    );
  }

  const firstName = user.full_name?.split(" ")[0] || user.email.split("@")[0];
  const roles = user.roles?.length ? user.roles.join(", ") : "Member";
  const overview = analytics?.overview;
  const daily = analytics?.daily ?? [];
  const recentEvaluations = analytics?.recent_evaluations ?? [];
  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const qualityScore = averageScore([
    overview?.avg_faithfulness ?? null,
    overview?.avg_relevance ?? null,
    overview?.avg_context_precision ?? null,
  ]);
  const lastSevenQueries = daily.slice(-7).reduce((sum, item) => sum + item.query_count, 0);
  const posture = getWorkspacePosture(stats.readyRate, qualityScore, stats.attentionCount);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-fade-in-up">
      <section className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px] lg:p-7">
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium ${posture.badgeClass}`}>
                <RiPulseLine className="h-4 w-4" />
                {posture.label}
              </span>
              <span className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
                {roles}
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white md:text-4xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              Your knowledge workspace has {documents.length} documents, {overview?.total_queries ?? 0} evaluated queries,
              and {formatScore(qualityScore)} average retrieval quality.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroStat label="Ready content" value={`${stats.readyRate}%`} />
              <HeroStat label="7-day queries" value={lastSevenQueries} />
              <HeroStat label="Protected docs" value={stats.protectedCount} />
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-950/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Recommended next action</p>
                <h2 className="mt-2 text-lg font-semibold text-black dark:text-white">{posture.actionTitle}</h2>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-md bg-black text-xl text-white dark:bg-white dark:text-black">
                <RiSparkling2Line />
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-500">{posture.actionDescription}</p>
            <Link
              href={posture.href as any}
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {posture.actionLabel}
              <RiArrowRightUpLine className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Documents"
          value={documents.length}
          detail={`${stats.byStatus.COMPLETED} ready, ${stats.attentionCount} need attention`}
          icon={<RiFileTextLine />}
          tone="neutral"
        />
        <MetricCard
          label="Retrieval Quality"
          value={formatScore(qualityScore)}
          detail={`${formatScore(overview?.avg_relevance ?? null)} relevance average`}
          icon={<RiShieldCheckLine />}
          tone="emerald"
          valueClass={scoreColor(qualityScore)}
        />
        <MetricCard
          label="Queries"
          value={overview?.total_queries ?? 0}
          detail={`${formatMetric(overview?.avg_latency_ms, 0, "ms")} average latency`}
          icon={<RiChat3Line />}
          tone="sky"
        />
        <MetricCard
          label="Latest Upload"
          value={stats.latestDocument ? titleCase(stats.latestDocument.processing_status) : "--"}
          detail={stats.latestDocument?.title ?? "No documents yet"}
          icon={<RiUploadCloud2Line />}
          tone="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Workspace Readiness" actionHref="/documents" actionLabel="Manage documents">
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-black dark:text-white">{stats.readyRate}% ready</span>
                <span className="text-neutral-500">{documents.length} documents</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
                {statusOrder.map((status) => (
                  <span
                    key={status}
                    className={statusTone(status)}
                    style={{
                      width: `${documents.length ? (stats.byStatus[status] / documents.length) * 100 : 0}%`,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {statusOrder.map((status) => (
                <StatusCell
                  key={status}
                  label={titleCase(status)}
                  value={stats.byStatus[status]}
                  status={status}
                />
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Quality Signal" actionHref="/analytics" actionLabel="Open analytics">
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <QualityCell label="Faithful" value={overview?.avg_faithfulness ?? null} />
              <QualityCell label="Relevant" value={overview?.avg_relevance ?? null} />
              <QualityCell label="Precise" value={overview?.avg_context_precision ?? null} />
            </div>
            <MiniBars daily={daily} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Recent Documents" actionHref="/documents" actionLabel="View library">
          {recentDocs.length === 0 ? (
            <EmptyState
              icon={<RiBook2Line />}
              title="No documents yet"
              description="Register your first document to populate the retrieval library."
            />
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
              {recentDocs.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Fast Actions">
          <div className="grid gap-3 md:grid-cols-2">
            <QuickAction
              href="/documents"
              label="Register document"
              description="Add source material to the knowledge base"
              icon={<RiUploadCloud2Line />}
            />
            <QuickAction
              href="/chat"
              label="Ask the graph"
              description="Test answers, citations, and access filtering"
              icon={<RiChat3Line />}
            />
            <QuickAction
              href="/analytics"
              label="Review quality"
              description="Inspect recent evaluation and latency trends"
              icon={<RiBarChartBoxLine />}
            />
            <QuickAction
              href="/graph"
              label="Explore entities"
              description="Inspect relationships in the knowledge graph"
              icon={<RiDatabase2Line />}
            />
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Security Mix" actionHref="/admin/roles" actionLabel="Review roles">
          <DistributionList items={stats.bySecurity} emptyLabel="No classified documents yet" />
        </Panel>

        <Panel title="Recent Evaluations" actionHref="/analytics" actionLabel="View details">
          {recentEvaluations.length === 0 ? (
            <EmptyState
              icon={<RiBarChartBoxLine />}
              title="No evaluation data"
              description="Chat activity will populate quality measurements."
            />
          ) : (
            <div className="space-y-3">
              {recentEvaluations.slice(0, 4).map((evaluation) => (
                <EvaluationRow
                  key={evaluation.id}
                  query={evaluation.query_text}
                  score={evaluation.relevance_score}
                  latency={evaluation.latency_ms}
                />
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

function AccountUnavailable({
  message,
  onRetry,
  onSignOut,
}: {
  message: string | null;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-black">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-neutral-100 text-xl text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
          <RiShieldCheckLine />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-black dark:text-white">
          Account profile unavailable
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
          {message ?? "Your session is present, but the account profile could not be loaded."}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            <RiRefreshLine className="h-4 w-4" />
            Retry
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-950"
          >
            <RiLogoutBoxRLine className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-black dark:text-white">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
  valueClass,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
  tone: "neutral" | "emerald" | "sky" | "amber";
  valueClass?: string;
}) {
  const toneClass = {
    neutral: "bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  }[tone];

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-black">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
          <p className={`mt-2 truncate text-3xl font-semibold tracking-tight ${valueClass ?? "text-black dark:text-white"}`}>
            {value}
          </p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl ${toneClass}`}>
          {icon}
        </span>
      </div>
      <p className="mt-4 truncate text-sm text-neutral-500">{detail}</p>
    </div>
  );
}

function Panel({
  title,
  children,
  actionHref,
  actionLabel,
}: {
  title: string;
  children: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4 dark:border-neutral-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
          {title}
        </h2>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref as any}
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
          >
            {actionLabel}
            <RiArrowRightUpLine className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatusCell({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: StatusKey;
}) {
  return (
    <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <span className={`mb-3 block h-1.5 w-10 rounded-full ${statusTone(status)}`} />
      <p className="text-2xl font-semibold text-black dark:text-white">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function QualityCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <p className={`text-2xl font-semibold ${scoreColor(value)}`}>{formatScore(value)}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function MiniBars({ daily }: { daily: AnalyticsResponse["daily"] }) {
  if (!daily.length) {
    return (
      <div className="rounded-md border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500 dark:border-neutral-800">
        Query trends will appear after chat activity.
      </div>
    );
  }

  const maxCount = Math.max(...daily.map((item) => item.query_count), 1);

  return (
    <div>
      <div className="flex h-28 items-end gap-1">
        {daily.map((item) => (
          <div
            key={item.date}
            className="flex-1 rounded-t bg-sky-200 transition-colors hover:bg-sky-400 dark:bg-sky-900 dark:hover:bg-sky-500"
            style={{ height: `${Math.max((item.query_count / maxCount) * 100, 3)}%` }}
            title={`${item.date}: ${item.query_count} queries`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-neutral-500">
        <span>{daily[0]?.date}</span>
        <span>{daily[daily.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  description,
  icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href as any}
      className="group flex min-h-[112px] items-start justify-between gap-4 rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-600 dark:hover:bg-neutral-950"
    >
      <div className="min-w-0">
        <p className="font-medium text-black dark:text-white">{label}</p>
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-lg text-black transition group-hover:bg-black group-hover:text-white dark:bg-neutral-900 dark:text-white dark:group-hover:bg-white dark:group-hover:text-black">
        {icon}
      </span>
    </Link>
  );
}

function DocumentRow({ doc }: { doc: Document }) {
  return (
    <Link
      href={`/documents/${doc.id}` as any}
      className="flex items-center justify-between gap-4 py-3 transition hover:bg-neutral-50 dark:hover:bg-neutral-950"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
          <RiFileTextLine className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-black dark:text-white">{doc.title}</p>
          <p className="text-xs text-neutral-500">
            {doc.file_type.toUpperCase()} - {new Date(doc.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500 dark:border-neutral-800 sm:inline-flex">
          {doc.security_level}
        </span>
        <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusBadge(doc.processing_status as StatusKey)}`}>
          {titleCase(doc.processing_status)}
        </span>
      </div>
    </Link>
  );
}

function EvaluationRow({
  query,
  score,
  latency,
}: {
  query: string;
  score: number | null;
  latency: number | null;
}) {
  return (
    <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="line-clamp-2 text-sm font-medium text-black dark:text-white">{query}</p>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className={scoreColor(score)}>Relevance {formatScore(score)}</span>
        <span className="text-neutral-500">{latency ? `${latency}ms` : "No latency"}</span>
      </div>
    </div>
  );
}

function DistributionList({
  items,
  emptyLabel,
}: {
  items: Record<string, number>;
  emptyLabel: string;
}) {
  const rows = Object.entries(items).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((sum, [, value]) => sum + value, 0);

  if (!rows.length) {
    return <p className="text-sm text-neutral-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-black dark:text-white">{label}</span>
            <span className="text-neutral-500">{value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
            <div
              className="h-full rounded-full bg-black dark:bg-white"
              style={{ width: `${total ? (value / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-neutral-200 p-8 text-center dark:border-neutral-800">
      <span className="mb-3 text-3xl text-neutral-300 dark:text-neutral-700">{icon}</span>
      <p className="font-medium text-black dark:text-white">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>
    </div>
  );
}

function getWorkspacePosture(readyRate: number, quality: number | null, attentionCount: number) {
  if (attentionCount > 0) {
    return {
      label: "Needs review",
      badgeClass:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
      actionTitle: "Review ingestion status",
      actionDescription: "Some documents are still processing, pending, or failed. Check the document list before relying on complete coverage.",
      actionLabel: "Open documents",
      href: "/documents",
    };
  }

  if (quality !== null && quality < 0.7) {
    return {
      label: "Quality watch",
      badgeClass:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300",
      actionTitle: "Inspect recent answers",
      actionDescription: "Retrieval is active, but quality scores suggest recent answers may need review or better source coverage.",
      actionLabel: "Open analytics",
      href: "/analytics",
    };
  }

  return {
    label: readyRate >= 90 ? "Workspace healthy" : "Workspace online",
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
    actionTitle: "Ask a focused question",
    actionDescription: "Your library is ready. Use chat to validate retrieval behavior against your newest documents.",
    actionLabel: "Open chat",
    href: "/chat",
  };
}

function averageScore(values: Array<number | null>) {
  const valid = values.filter((value): value is number => typeof value === "number");
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/(^|_)([a-z])/g, (_, spacer, letter) =>
    `${spacer ? " " : ""}${letter.toUpperCase()}`,
  );
}

function statusTone(status: StatusKey) {
  return {
    COMPLETED: "bg-emerald-500",
    PROCESSING: "bg-sky-500",
    PENDING: "bg-amber-500",
    FAILED: "bg-red-500",
  }[status];
}

function statusBadge(status: StatusKey) {
  return {
    COMPLETED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    PROCESSING: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    FAILED: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  }[status];
}

function formatMetric(value: number | null | undefined, decimals = 0, suffix = "") {
  if (value === null || value === undefined) return "No data";
  return `${value.toFixed(decimals)}${suffix}`;
}

function formatScore(value: number | null) {
  if (value === null || value === undefined) return "--";
  return value.toFixed(2);
}

function scoreColor(value: number | null) {
  if (value === null || value === undefined) return "text-neutral-500";
  if (value >= 0.8) return "text-emerald-600 dark:text-emerald-300";
  if (value >= 0.5) return "text-amber-600 dark:text-amber-300";
  return "text-red-600 dark:text-red-300";
}
