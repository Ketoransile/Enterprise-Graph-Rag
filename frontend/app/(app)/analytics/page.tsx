"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiChat3Line,
  RiCheckboxCircleLine,
  RiDatabase2Line,
  RiFileChartLine,
  RiShieldCheckLine,
  RiTimerLine,
} from "react-icons/ri";

import { PageSkeleton } from "@/components/ui/skeleton";
import { api, type AnalyticsResponse, type DailyMetric } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

const PAGE_SIZE = 10;

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return value.toFixed(2);
}

function formatNumber(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined) return "--";
  return `${new Intl.NumberFormat().format(value)}${suffix}`;
}

function formatLatency(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return `${Math.round(value)}ms`;
}

function scoreTone(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "text-neutral-500";
  }
  if (value >= 0.8) {
    return "text-emerald-600 dark:text-emerald-300";
  }
  if (value >= 0.5) {
    return "text-amber-600 dark:text-amber-300";
  }
  return "text-red-600 dark:text-red-300";
}

function scoreBadgeTone(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400";
  }
  if (value >= 0.8) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (value >= 0.5) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  }
  return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
}

function trendDelta(daily: DailyMetric[], field: keyof DailyMetric) {
  const values = daily
    .map((item) => item[field])
    .filter((value): value is number => typeof value === "number");
  if (values.length < 2) return null;
  return values[values.length - 1] - values[0];
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let ignore = false;

    async function fetchMetrics() {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await api.analytics.getMetrics(token, 30);
        if (!ignore) {
          setData(result);
          setPage(1);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load analytics");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchMetrics();
    return () => {
      ignore = true;
    };
  }, [token]);

  const overview = data?.overview;
  const daily = useMemo(() => data?.daily ?? [], [data?.daily]);
  const recent = useMemo(() => data?.recent_evaluations ?? [], [data?.recent_evaluations]);
  const pageCount = Math.max(Math.ceil(recent.length / PAGE_SIZE), 1);
  const startIndex = recent.length ? (page - 1) * PAGE_SIZE : 0;
  const endIndex = Math.min(startIndex + PAGE_SIZE, recent.length);
  const paginatedRecent = recent.slice(startIndex, endIndex);

  const summary = useMemo(() => {
    const totalPeriodQueries = daily.reduce((sum, item) => sum + item.query_count, 0);
    const activeDays = daily.filter((item) => item.query_count > 0).length;
    const bestDay = daily.reduce<DailyMetric | null>(
      (best, item) => (!best || item.query_count > best.query_count ? item : best),
      null,
    );
    const faithfulnessDelta = trendDelta(daily, "avg_faithfulness");
    const relevanceDelta = trendDelta(daily, "avg_relevance");

    return {
      totalPeriodQueries,
      activeDays,
      bestDay,
      faithfulnessDelta,
      relevanceDelta,
    };
  }, [daily]);

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-semibold text-black dark:text-white">Authentication Required</h2>
          <p className="mt-2 text-sm text-neutral-500">Please sign in to view analytics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-fade-in-up">
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-5 dark:border-neutral-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black dark:text-white">
            Analytics
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Monitor retrieval quality, response speed, and evaluation activity across the workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md border border-neutral-200 px-2.5 py-1 font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
            Last 30 days
          </span>
          <span className="rounded-md border border-neutral-200 px-2.5 py-1 font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
            {recent.length} recent evaluations
          </span>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Documents"
          value={overview?.total_documents ?? 0}
          detail="Indexed content available to retrieval"
          icon={<RiDatabase2Line />}
          tone="neutral"
        />
        <MetricCard
          label="Total Queries"
          value={overview?.total_queries ?? 0}
          detail={`${formatNumber(summary.totalPeriodQueries)} in the current window`}
          icon={<RiChat3Line />}
          tone="sky"
        />
        <MetricCard
          label="Quality Index"
          value={formatScore(overview?.avg_relevance)}
          detail={`${formatScore(overview?.avg_faithfulness)} faithfulness average`}
          icon={<RiShieldCheckLine />}
          tone="emerald"
          valueClass={scoreTone(overview?.avg_relevance)}
        />
        <MetricCard
          label="Average Latency"
          value={formatLatency(overview?.avg_latency_ms)}
          detail="Mean answer generation time"
          icon={<RiTimerLine />}
          tone="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel title="Query Volume" subtitle="Daily evaluated questions in the selected window.">
          <DailyVolumeChart daily={daily} />
        </Panel>

        <Panel title="Activity Snapshot" subtitle="A compact read on usage concentration.">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <SnapshotCell
              label="Active days"
              value={`${summary.activeDays}/${daily.length || 30}`}
              description="Days with evaluated traffic"
            />
            <SnapshotCell
              label="Peak day"
              value={summary.bestDay?.query_count ?? 0}
              description={summary.bestDay?.date ?? "No activity yet"}
            />
            <SnapshotCell
              label="Recent sample"
              value={recent.length}
              description="Evaluations available in table"
            />
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <QualityPanel
          label="Faithfulness"
          value={overview?.avg_faithfulness ?? null}
          delta={summary.faithfulnessDelta}
          description="How well answers stay grounded in retrieved context."
        />
        <QualityPanel
          label="Relevance"
          value={overview?.avg_relevance ?? null}
          delta={summary.relevanceDelta}
          description="How closely answers match the user's intent."
        />
        <QualityPanel
          label="Context Precision"
          value={overview?.avg_context_precision ?? null}
          delta={null}
          description="How much retrieved context is useful after filtering."
        />
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
        <div className="flex flex-col gap-3 border-b border-neutral-100 p-5 dark:border-neutral-900 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
              Recent Evaluations
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Showing {recent.length ? startIndex + 1 : 0}-{endIndex} of {recent.length}. Ten rows per page.
            </p>
          </div>
          {recent.length > PAGE_SIZE ? (
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={(nextPage) => setPage(Math.min(Math.max(nextPage, 1), pageCount))}
            />
          ) : null}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={<RiFileChartLine />}
            title="No evaluation data yet"
            description="Chat activity will populate quality, latency, and retrieval metrics here."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-neutral-100 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-900 dark:bg-neutral-950/70">
                  <tr>
                    <th className="px-5 py-3 font-medium">Query</th>
                    <th className="px-4 py-3 text-center font-medium">Faith.</th>
                    <th className="px-4 py-3 text-center font-medium">Relev.</th>
                    <th className="px-4 py-3 text-center font-medium">Prec.</th>
                    <th className="px-4 py-3 text-center font-medium">Latency</th>
                    <th className="px-4 py-3 text-center font-medium">Chunks</th>
                    <th className="px-5 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                  {paginatedRecent.map((evaluation) => (
                    <tr
                      key={evaluation.id}
                      className="transition hover:bg-neutral-50 dark:hover:bg-neutral-950"
                    >
                      <td className="max-w-md px-5 py-4">
                        <p className="line-clamp-2 font-medium leading-5 text-black dark:text-white">
                          {evaluation.query_text || "Untitled query"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <ScoreBadge score={evaluation.faithfulness_score} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <ScoreBadge score={evaluation.relevance_score} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <ScoreBadge score={evaluation.context_precision_score} />
                      </td>
                      <td className="px-4 py-4 text-center text-neutral-600 dark:text-neutral-300">
                        {formatLatency(evaluation.latency_ms)}
                      </td>
                      <td className="px-4 py-4 text-center text-neutral-600 dark:text-neutral-300">
                        {evaluation.num_chunks_after_rbac ?? "--"}/{evaluation.num_chunks_retrieved ?? "--"}
                      </td>
                      <td className="px-5 py-4 text-xs text-neutral-500">
                        {evaluation.created_at ? new Date(evaluation.created_at).toLocaleString() : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recent.length > PAGE_SIZE ? (
              <div className="border-t border-neutral-100 p-4 dark:border-neutral-900">
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  onPageChange={(nextPage) => setPage(Math.min(Math.max(nextPage, 1), pageCount))}
                />
              </div>
            ) : null}
          </>
        )}
      </section>
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
      <p className="mt-4 text-sm text-neutral-500">{detail}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
      <div className="border-b border-neutral-100 px-5 py-4 dark:border-neutral-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
          {title}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DailyVolumeChart({ daily }: { daily: DailyMetric[] }) {
  if (!daily.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-neutral-200 text-center text-sm text-neutral-500 dark:border-neutral-800">
        Query trends will appear after evaluated chat activity.
      </div>
    );
  }

  const maxCount = Math.max(...daily.map((item) => item.query_count), 1);

  return (
    <div>
      <div className="flex h-64 items-end gap-1.5">
        {daily.map((item) => (
          <div key={item.date} className="group relative flex flex-1 items-end">
            <div
              className="w-full rounded-t bg-sky-200 transition-colors group-hover:bg-sky-400 dark:bg-sky-900 dark:group-hover:bg-sky-500"
              style={{ height: `${Math.max((item.query_count / maxCount) * 100, 3)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 shadow-sm group-hover:block dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
              {item.date}: {item.query_count}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs text-neutral-500">
        <span>{daily[0]?.date}</span>
        <span>{daily[daily.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function SnapshotCell({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-black dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>
    </div>
  );
}

function QualityPanel({
  label,
  value,
  delta,
  description,
}: {
  label: string;
  value: number | null;
  delta: number | null;
  description: string;
}) {
  const percent = value === null || value === undefined ? 0 : Math.max(Math.min(value * 100, 100), 0);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-black">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
          <p className={`mt-2 text-3xl font-semibold tracking-tight ${scoreTone(value)}`}>
            {formatScore(value)}
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-100 text-xl text-black dark:bg-neutral-900 dark:text-white">
          <RiCheckboxCircleLine />
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
        <div
          className="h-full rounded-full bg-black dark:bg-white"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <p className="text-neutral-500">{description}</p>
        <span className="shrink-0 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
          {delta === null ? "No trend" : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  return (
    <span className={`inline-flex min-w-12 justify-center rounded-md border px-2 py-1 text-xs font-semibold ${scoreBadgeTone(score)}`}>
      {formatScore(score)}
    </span>
  );
}

function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white"
      >
        <RiArrowLeftSLine className="h-4 w-4" />
        Previous
      </button>
      {pages.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPageChange(item)}
          className={`h-9 min-w-9 rounded-md border px-3 text-sm font-medium transition ${
            item === page
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-black"
              : "border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-black dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white"
          }`}
        >
          {item}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white"
      >
        Next
        <RiArrowRightSLine className="h-4 w-4" />
      </button>
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
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <span className="mb-3 text-3xl text-neutral-300 dark:text-neutral-700">{icon}</span>
      <p className="font-medium text-black dark:text-white">{title}</p>
      <p className="mt-1 max-w-md text-sm text-neutral-500">{description}</p>
    </div>
  );
}
