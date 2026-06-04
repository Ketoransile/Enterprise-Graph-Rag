"use client";

import React, { useEffect, useState } from "react";
import { api, type AnalyticsResponse } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

// ── Score color helper ───────────────────────────────────────────────────
function scoreColor(score: number | null): string {
  if (score === null) return "text-slate-500";
  if (score >= 0.8) return "text-emerald-400";
  if (score >= 0.5) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-slate-800";
  if (score >= 0.8) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 0.5) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function fmt(v: number | null, decimals = 2): string {
  if (v === null || v === undefined) return "—";
  return v.toFixed(decimals);
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.analytics.getMetrics(token, 30);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [token]);

  if (!token) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white">Authentication Required</h2>
        <p className="text-slate-400 mt-2">Please sign in to view analytics.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Loading analytics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
        {error}
      </div>
    );
  }

  const overview = data?.overview;
  const recent = data?.recent_evaluations ?? [];
  const daily = data?.daily ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-slate-50">Analytics</h1>
        <p className="text-slate-400 mt-1">
          RAG performance metrics, evaluation scores, and usage trends.
        </p>
      </header>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Total Documents" value={overview?.total_documents ?? 0} />
        <KpiCard label="Total Queries" value={overview?.total_queries ?? 0} />
        <KpiCard
          label="Avg Faithfulness"
          value={fmt(overview?.avg_faithfulness ?? null)}
          scoreVal={overview?.avg_faithfulness ?? null}
        />
        <KpiCard
          label="Avg Relevance"
          value={fmt(overview?.avg_relevance ?? null)}
          scoreVal={overview?.avg_relevance ?? null}
        />
        <KpiCard
          label="Avg Precision"
          value={fmt(overview?.avg_context_precision ?? null)}
          scoreVal={overview?.avg_context_precision ?? null}
        />
        <KpiCard
          label="Avg Latency"
          value={overview?.avg_latency_ms ? `${fmt(overview.avg_latency_ms, 0)}ms` : "—"}
        />
      </div>

      {/* ── Daily Trend ────────────────────────────────────────────── */}
      {daily.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
            Daily Query Volume (last 30 days)
          </h2>
          <div className="flex items-end gap-1 h-32">
            {daily.map((d, i) => {
              const maxCount = Math.max(...daily.map((x) => x.query_count), 1);
              const height = (d.query_count / maxCount) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 group relative"
                  title={`${d.date}: ${d.query_count} queries`}
                >
                  <div
                    className="bg-blue-500/60 hover:bg-blue-400/80 transition-colors rounded-t"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs text-slate-200 rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                    {d.date}: {d.query_count}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>{daily[0]?.date}</span>
            <span>{daily[daily.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* ── Score Trend Bars ───────────────────────────────────────── */}
      {daily.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TrendCard title="Faithfulness Trend" data={daily} field="avg_faithfulness" color="emerald" />
          <TrendCard title="Relevance Trend" data={daily} field="avg_relevance" color="blue" />
        </div>
      )}

      {/* ── Recent Evaluations Table ──────────────────────────────── */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Recent Evaluations
          </h2>
        </div>

        {recent.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No evaluations yet. Ask questions in the Chat to generate metrics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-900/80 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Query</th>
                  <th className="px-4 py-3 font-medium text-center">Faith.</th>
                  <th className="px-4 py-3 font-medium text-center">Relev.</th>
                  <th className="px-4 py-3 font-medium text-center">Prec.</th>
                  <th className="px-4 py-3 font-medium text-center">Latency</th>
                  <th className="px-4 py-3 font-medium text-center">Chunks</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recent.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 text-slate-200 truncate max-w-xs" title={ev.query_text}>
                      {ev.query_text}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ScoreBadge score={ev.faithfulness_score} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ScoreBadge score={ev.relevance_score} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ScoreBadge score={ev.context_precision_score} />
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400">
                      {ev.latency_ms ? `${ev.latency_ms}ms` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400">
                      {ev.num_chunks_after_rbac ?? "—"}/{ev.num_chunks_retrieved ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(ev.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  scoreVal,
}: {
  label: string;
  value: string | number;
  scoreVal?: number | null;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${scoreVal !== undefined ? scoreColor(scoreVal ?? null) : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold border ${scoreBg(score)} ${scoreColor(score)}`}
    >
      {score !== null && score !== undefined ? score.toFixed(2) : "—"}
    </span>
  );
}

function TrendCard({
  title,
  data,
  field,
  color,
}: {
  title: string;
  data: Array<Record<string, any>>;
  field: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/60 hover:bg-emerald-400/80",
    blue: "bg-blue-500/60 hover:bg-blue-400/80",
    amber: "bg-amber-500/60 hover:bg-amber-400/80",
  };
  const barClass = colorMap[color] || colorMap.blue;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
        {title}
      </h3>
      <div className="flex items-end gap-1 h-24">
        {data.map((d, i) => {
          const val = d[field] as number | null;
          const height = val !== null ? val * 100 : 0;
          return (
            <div
              key={i}
              className="flex-1 group relative"
              title={`${d.date}: ${val !== null ? val.toFixed(2) : "N/A"}`}
            >
              <div
                className={`${barClass} transition-colors rounded-t`}
                style={{ height: `${Math.max(height, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-500 mt-2">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
