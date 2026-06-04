"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { api, type GraphNode, type GraphEdge } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

// Dynamic import — react-force-graph-2d uses canvas and must not SSR
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] text-slate-500">
      Initializing graph engine…
    </div>
  ),
});

// ── Color map for entity types ───────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  PERSON: "#6366f1",
  ORGANIZATION: "#0ea5e9",
  CONCEPT: "#f59e0b",
  TECHNOLOGY: "#10b981",
  LOCATION: "#ef4444",
  EVENT: "#a855f7",
  DOCUMENT: "#64748b",
  METRIC: "#ec4899",
  PRODUCT: "#14b8a6",
  REGULATION: "#f97316",
  OTHER: "#94a3b8",
};

interface GraphData {
  nodes: Array<{ id: string; label: string; type: string; val: number }>;
  links: Array<{ source: string; target: string; type: string }>;
}

export default function GraphPage() {
  const { token } = useAuth();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const graphRef = useRef<any>(null);

  const fetchGraph = useCallback(
    async (query?: string) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.graph.explore(token, query, 150);

        // Transform to force-graph format
        const nodes = res.nodes.map((n: GraphNode) => ({
          id: n.id,
          label: n.label,
          type: n.type,
          val: 4, // node size
        }));

        const nodeIds = new Set(nodes.map((n: { id: string }) => n.id));

        const links = res.edges
          .filter(
            (e: GraphEdge) => nodeIds.has(e.source) && nodeIds.has(e.target)
          )
          .map((e: GraphEdge) => ({
            source: e.source,
            target: e.target,
            type: e.type,
          }));

        setGraphData({ nodes, links });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load graph data"
        );
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchGraph(searchQuery || undefined);
  }

  if (!token) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white">
          Authentication Required
        </h2>
        <p className="text-slate-400 mt-2">
          Please sign in to access the graph explorer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">
            Graph Explorer
          </h1>
          <p className="text-slate-400 mt-1">
            Inspect entities and relationships across your knowledge graph.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entities…"
            className="rounded-md border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
          <button
            type="submit"
            className="bg-white text-slate-950 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition"
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                fetchGraph();
              }}
              className="text-slate-400 hover:text-white px-2 text-sm"
            >
              Clear
            </button>
          )}
        </form>
      </header>

      {error && (
        <div className="rounded-md border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            {type}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Graph canvas */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 overflow-hidden relative" style={{ height: 600 }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">Loading graph…</p>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <p className="text-slate-400">No graph data available.</p>
              <p className="text-sm text-slate-500">
                Upload and process documents to start building the knowledge
                graph.
              </p>
            </div>
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              nodeLabel="label"
              nodeColor={(node: any) => TYPE_COLORS[node.type] || TYPE_COLORS.OTHER}
              nodeRelSize={6}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              linkColor={() => "rgba(100,116,139,0.35)"}
              linkWidth={1.5}
              linkLabel={(link: any) => link.type}
              onNodeClick={(node: any) => setSelectedNode(node)}
              backgroundColor="transparent"
              nodeCanvasObjectMode={() => "after"}
              nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                const label = node.label || node.id;
                const fontSize = Math.max(11 / globalScale, 3);
                ctx.font = `${fontSize}px Inter, sans-serif`;
                ctx.fillStyle = "rgba(226,232,240,0.9)";
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillText(label, node.x!, node.y! + 8);
              }}
              warmupTicks={80}
              cooldownTicks={100}
              width={undefined}
              height={600}
            />
          )}

          {/* Stats badge */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-400">
            {graphData.nodes.length} nodes · {graphData.links.length} relationships
          </div>
        </div>

        {/* Side Panel */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 space-y-4 h-[600px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Node Details
          </h3>

          {selectedNode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      TYPE_COLORS[selectedNode.type] || TYPE_COLORS.OTHER,
                  }}
                />
                <span className="text-lg font-medium text-white">
                  {selectedNode.label}
                </span>
              </div>

              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">Entity ID</dt>
                  <dd className="text-slate-200 font-mono text-xs">
                    {selectedNode.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Type</dt>
                  <dd>
                    <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-200 border border-slate-700">
                      {selectedNode.type}
                    </span>
                  </dd>
                </div>
              </dl>

              {/* Connections */}
              <div>
                <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                  Connections
                </h4>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {graphData.links
                    .filter(
                      (l) =>
                        (typeof l.source === "string"
                          ? l.source
                          : (l.source as any)?.id) === selectedNode.id ||
                        (typeof l.target === "string"
                          ? l.target
                          : (l.target as any)?.id) === selectedNode.id
                    )
                    .map((l, i) => {
                      const srcId =
                        typeof l.source === "string"
                          ? l.source
                          : (l.source as any)?.id;
                      const tgtId =
                        typeof l.target === "string"
                          ? l.target
                          : (l.target as any)?.id;
                      const otherId =
                        srcId === selectedNode.id ? tgtId : srcId;
                      const otherNode = graphData.nodes.find(
                        (n) => n.id === otherId
                      );
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/50 rounded px-2 py-1.5"
                        >
                          <span className="text-slate-500 font-medium">
                            {l.type}
                          </span>
                          <span className="text-slate-500">→</span>
                          <button
                            onClick={() =>
                              otherNode && setSelectedNode(otherNode)
                            }
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {otherNode?.label || otherId}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Click on a node in the graph to view its details and connections.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
