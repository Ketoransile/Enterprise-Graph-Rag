"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  RiCloseLine,
  RiDatabase2Line,
  RiEyeLine,
  RiFilter3Line,
  RiFocus3Line,
  RiNodeTree,
  RiRefreshLine,
  RiRouteLine,
  RiSearchLine,
} from "react-icons/ri";

import { Skeleton } from "@/components/ui/skeleton";
import { api, type GraphEdge, type GraphNode } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[560px] items-center justify-center p-8">
      <Skeleton className="h-64 w-full max-w-xl rounded-lg" />
    </div>
  ),
});

const TYPE_COLORS: Record<string, string> = {
  PERSON: "#4f46e5",
  ORGANIZATION: "#0284c7",
  CONCEPT: "#d97706",
  TECHNOLOGY: "#059669",
  LOCATION: "#dc2626",
  EVENT: "#9333ea",
  DOCUMENT: "#525252",
  METRIC: "#db2777",
  PRODUCT: "#0d9488",
  REGULATION: "#ea580c",
  OTHER: "#737373",
};

const LIMIT_OPTIONS = [50, 100, 150, 250];

type GraphNodeDatum = GraphNode & {
  val: number;
  x?: number;
  y?: number;
};

type GraphLinkDatum = {
  id: string;
  source: string | GraphNodeDatum;
  target: string | GraphNodeDatum;
  type: string;
};

interface GraphData {
  nodes: GraphNodeDatum[];
  links: GraphLinkDatum[];
}

function normalType(type: string | null | undefined) {
  return (type || "OTHER").toUpperCase();
}

function typeColor(type: string | null | undefined) {
  return TYPE_COLORS[normalType(type)] || TYPE_COLORS.OTHER;
}

function endpointId(endpoint: string | GraphNodeDatum) {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

function safeLabel(value: string) {
  return value.length > 42 ? `${value.slice(0, 39)}...` : value;
}

export default function GraphPage() {
  const { token } = useAuth();
  const { resolvedTheme } = useTheme();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [limit, setLimit] = useState(150);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 620 });
  const graphRef = useRef<any>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const isDark = resolvedTheme === "dark";

  const fetchGraph = useCallback(
    async (query?: string, nextLimit = 150) => {
      if (!token) return;
      setLoading(true);
      setError(null);

      try {
        const result = await api.graph.explore(token, query, nextLimit);
        const degree = new Map<string, number>();
        result.edges.forEach((edge) => {
          degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
          degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
        });

        const nodes = result.nodes.map((node: GraphNode) => {
          const connections = degree.get(node.id) ?? 0;
          return {
            id: node.id,
            label: node.label,
            type: normalType(node.type),
            val: Math.max(4, Math.min(10, 4 + connections * 0.7)),
          };
        });
        const nodeIds = new Set(nodes.map((node) => node.id));
        const links = result.edges
          .filter((edge: GraphEdge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
          .map((edge: GraphEdge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type || "RELATED_TO",
          }));

        setGraphData({ nodes, links });
        setSelectedNodeId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load graph data");
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchGraph(appliedQuery || undefined, limit);
  }, [appliedQuery, fetchGraph, limit]);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = Math.max(Math.floor(entry.contentRect.width), 320);
      const height = Math.max(Math.floor(entry.contentRect.height), 540);
      setCanvasSize({ width, height });
    });

    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const typeCounts = useMemo(() => {
    return graphData.nodes.reduce<Record<string, number>>((acc, node) => {
      acc[node.type] = (acc[node.type] ?? 0) + 1;
      return acc;
    }, {});
  }, [graphData.nodes]);

  const availableTypes = useMemo(
    () => Object.entries(typeCounts).sort((a, b) => b[1] - a[1]),
    [typeCounts],
  );

  const activeTypeSet = useMemo(() => new Set(selectedTypes), [selectedTypes]);
  const filteredGraphData = useMemo<GraphData>(() => {
    if (!selectedTypes.length) return graphData;

    const nodes = graphData.nodes.filter((node) => activeTypeSet.has(node.type));
    const nodeIds = new Set(nodes.map((node) => node.id));
    const links = graphData.links.filter(
      (link) => nodeIds.has(endpointId(link.source)) && nodeIds.has(endpointId(link.target)),
    );
    return { nodes, links };
  }, [activeTypeSet, graphData, selectedTypes.length]);

  const selectedNode = useMemo(
    () => graphData.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graphData.nodes, selectedNodeId],
  );

  const relationships = useMemo(() => {
    if (!selectedNode) return [];

    return graphData.links
      .filter((link) => endpointId(link.source) === selectedNode.id || endpointId(link.target) === selectedNode.id)
      .map((link) => {
        const sourceId = endpointId(link.source);
        const targetId = endpointId(link.target);
        const otherId = sourceId === selectedNode.id ? targetId : sourceId;
        const otherNode = graphData.nodes.find((node) => node.id === otherId) ?? null;
        return {
          id: link.id,
          type: link.type,
          direction: sourceId === selectedNode.id ? "out" : "in",
          node: otherNode,
          nodeId: otherId,
        };
      })
      .sort((a, b) => (a.node?.label || a.nodeId).localeCompare(b.node?.label || b.nodeId));
  }, [graphData.links, graphData.nodes, selectedNode]);

  const relationshipCounts = useMemo(() => {
    return graphData.links.reduce<Record<string, number>>((acc, link) => {
      acc[link.type] = (acc[link.type] ?? 0) + 1;
      return acc;
    }, {});
  }, [graphData.links]);

  const topRelationships = useMemo(
    () => Object.entries(relationshipCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
    [relationshipCounts],
  );

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query === appliedQuery) {
      fetchGraph(query || undefined, limit);
      return;
    }
    setAppliedQuery(query);
  }

  function clearSearch() {
    setSearchQuery("");
    if (appliedQuery) {
      setAppliedQuery("");
      return;
    }
    fetchGraph(undefined, limit);
  }

  function toggleType(type: string) {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  }

  function focusNode(node: GraphNodeDatum | null) {
    if (!node) return;
    setSelectedNodeId(node.id);
    if (typeof node.x === "number" && typeof node.y === "number") {
      graphRef.current?.centerAt(node.x, node.y, 600);
      graphRef.current?.zoom(2.3, 600);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-semibold text-black dark:text-white">Authentication Required</h2>
          <p className="mt-2 text-sm text-neutral-500">Please sign in to access the graph explorer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-fade-in-up">
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-5 dark:border-neutral-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black dark:text-white">
              Graph Explorer
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">
              Search entities, isolate important types, and inspect relationship context in the knowledge graph.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-neutral-500 transition focus-within:border-neutral-400 dark:border-neutral-800 dark:bg-black dark:focus-within:border-neutral-600 sm:w-80">
              <RiSearchLine className="h-4 w-4 shrink-0" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search entities"
                className="min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-neutral-400 dark:text-white"
              />
            </label>
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-black outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-black dark:text-white dark:focus:border-neutral-600"
              aria-label="Graph result limit"
            >
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} max
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              <RiSearchLine className="h-4 w-4" />
              Explore
            </button>
            <button
              type="button"
              onClick={() => fetchGraph(appliedQuery || undefined, limit)}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-200 px-3 text-neutral-600 transition hover:border-neutral-400 hover:text-black dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white"
              aria-label="Refresh graph"
            >
              <RiRefreshLine className="h-4 w-4" />
            </button>
          </form>
        </div>

        {appliedQuery ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-2 rounded-md border border-neutral-200 px-2.5 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
              Query: {appliedQuery}
              <button
                type="button"
                onClick={clearSearch}
                className="rounded text-neutral-400 transition hover:text-black dark:hover:text-white"
                aria-label="Clear graph search"
              >
                <RiCloseLine className="h-4 w-4" />
              </button>
            </span>
          </div>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Entities"
          value={graphData.nodes.length}
          detail={`${filteredGraphData.nodes.length} visible with filters`}
          icon={<RiNodeTree />}
          tone="neutral"
        />
        <MetricCard
          label="Relationships"
          value={graphData.links.length}
          detail={`${filteredGraphData.links.length} visible on canvas`}
          icon={<RiRouteLine />}
          tone="sky"
        />
        <MetricCard
          label="Entity Types"
          value={availableTypes.length}
          detail={availableTypes[0] ? `${availableTypes[0][0]} is most common` : "No entity types yet"}
          icon={<RiFilter3Line />}
          tone="emerald"
        />
        <MetricCard
          label="Selected Degree"
          value={selectedNode ? relationships.length : "--"}
          detail={selectedNode ? selectedNode.label : "Select a node to inspect"}
          icon={<RiFocus3Line />}
          tone="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
          <div className="flex flex-col gap-4 border-b border-neutral-100 p-4 dark:border-neutral-900 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
                Relationship Map
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Filter by entity type, then select a node to inspect its strongest local context.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTypes.slice(0, 8).map(([type, count]) => {
                const active = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition ${
                      active
                        ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-black"
                        : "border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-black dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: typeColor(type) }}
                    />
                    {type}
                    <span className="text-neutral-400">{count}</span>
                  </button>
                );
              })}
              {selectedTypes.length ? (
                <button
                  type="button"
                  onClick={() => setSelectedTypes([])}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-neutral-200 px-2.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-black dark:border-neutral-800 dark:hover:border-neutral-600 dark:hover:text-white"
                >
                  <RiCloseLine className="h-3.5 w-3.5" />
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div
            ref={canvasHostRef}
            className="relative h-[620px] overflow-hidden bg-neutral-50 dark:bg-neutral-950/40"
          >
            {loading ? (
              <div className="h-full p-6">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ) : filteredGraphData.nodes.length === 0 ? (
              <EmptyGraph />
            ) : (
              <ForceGraph2D
                ref={graphRef}
                graphData={filteredGraphData}
                width={canvasSize.width}
                height={canvasSize.height}
                nodeLabel={(node: any) => `${node.label} (${node.type})`}
                nodeColor={(node: any) => typeColor(node.type)}
                nodeVal={(node: any) => node.val}
                nodeRelSize={5}
                linkColor={() => (isDark ? "rgba(163,163,163,0.30)" : "rgba(82,82,82,0.24)")}
                linkWidth={(link: any) => (selectedNodeId && (endpointId(link.source) === selectedNodeId || endpointId(link.target) === selectedNodeId) ? 2.2 : 1.2)}
                linkDirectionalArrowLength={4}
                linkDirectionalArrowRelPos={1}
                linkLabel={(link: any) => link.type}
                onNodeClick={(node: any) => focusNode(node)}
                backgroundColor="transparent"
                cooldownTicks={100}
                warmupTicks={80}
                nodeCanvasObjectMode={() => "after"}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const label = safeLabel(node.label || node.id);
                  const fontSize = Math.max(11 / globalScale, 3.5);
                  ctx.font = `${fontSize}px Inter, sans-serif`;
                  ctx.fillStyle = isDark ? "rgba(245,245,245,0.88)" : "rgba(23,23,23,0.78)";
                  ctx.textAlign = "center";
                  ctx.textBaseline = "top";
                  ctx.fillText(label, node.x, node.y + 8);
                }}
              />
            )}

            <div className="absolute bottom-3 left-3 rounded-md border border-neutral-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-black/80 dark:text-neutral-300">
              {filteredGraphData.nodes.length} entities / {filteredGraphData.links.length} relationships
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
            <div className="border-b border-neutral-100 p-4 dark:border-neutral-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
                Selection
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Focus on one entity and its immediate relationships.
              </p>
            </div>
            <div className="p-4">
              {selectedNode ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: typeColor(selectedNode.type) }}
                    />
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold leading-6 text-black dark:text-white">
                        {selectedNode.label}
                      </h3>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                        {selectedNode.type}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <InfoCell label="Degree" value={relationships.length} />
                    <InfoCell
                      label="Visible"
                      value={filteredGraphData.nodes.some((node) => node.id === selectedNode.id) ? "Yes" : "Filtered"}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => focusNode(selectedNode)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-black px-3 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                    >
                      <RiFocus3Line className="h-4 w-4" />
                      Focus
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedNodeId(null)}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-200 px-3 text-neutral-600 transition hover:border-neutral-400 hover:text-black dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white"
                      aria-label="Clear selection"
                    >
                      <RiCloseLine className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Connected Entities
                    </h4>
                    {relationships.length ? (
                      <div className="max-h-[330px] space-y-2 overflow-y-auto pr-1">
                        {relationships.slice(0, 12).map((relationship) => (
                          <button
                            key={relationship.id}
                            type="button"
                            onClick={() => relationship.node && focusNode(relationship.node)}
                            className="flex w-full items-start gap-3 rounded-md border border-neutral-200 p-3 text-left transition hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-600 dark:hover:bg-neutral-950"
                          >
                            <span
                              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: typeColor(relationship.node?.type) }}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-black dark:text-white">
                                {relationship.node?.label || relationship.nodeId}
                              </span>
                              <span className="mt-1 block truncate text-xs text-neutral-500">
                                {relationship.direction === "out" ? "Outgoing" : "Incoming"} / {relationship.type}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-md border border-dashed border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800">
                        No direct relationships were returned for this entity.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-neutral-200 p-8 text-center dark:border-neutral-800">
                  <RiEyeLine className="mb-3 h-8 w-8 text-neutral-300 dark:text-neutral-700" />
                  <p className="font-medium text-black dark:text-white">No entity selected</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Click any node on the map to review its local context.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
            <div className="border-b border-neutral-100 p-4 dark:border-neutral-900">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
                Relationship Mix
              </h2>
              <p className="mt-1 text-sm text-neutral-500">Most frequent relationship labels in this subgraph.</p>
            </div>
            <div className="p-4">
              {topRelationships.length ? (
                <div className="space-y-3">
                  {topRelationships.map(([label, count]) => (
                    <DistributionRow
                      key={label}
                      label={label}
                      count={count}
                      total={graphData.links.length}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">Relationship labels will appear once graph data is available.</p>
              )}
            </div>
          </div>
        </aside>
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
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
  tone: "neutral" | "emerald" | "sky" | "amber";
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
          <p className="mt-2 truncate text-3xl font-semibold tracking-tight text-black dark:text-white">
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

function InfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-black dark:text-white">{value}</p>
    </div>
  );
}

function DistributionRow({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const width = total ? Math.max((count / total) * 100, 4) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-black dark:text-white">{label}</span>
        <span className="shrink-0 text-neutral-500">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
        <div
          className="h-full rounded-full bg-black dark:bg-white"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function EmptyGraph() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <RiDatabase2Line className="mb-3 h-9 w-9 text-neutral-300 dark:text-neutral-700" />
      <p className="font-medium text-black dark:text-white">No graph data available</p>
      <p className="mt-1 max-w-md text-sm text-neutral-500">
        Try a broader query or process documents with entity extraction to populate this view.
      </p>
    </div>
  );
}
