"use client";

import React, { useEffect, useState } from "react";
import { api, type AuditLog } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function AuditLogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.admin.auditLogs.list(token, 0, 100);
        setLogs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [token]);

  if (!token) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white">Authentication Required</h2>
        <p className="text-slate-400 mt-2">Please sign in to access audit logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-slate-50">Audit Logs</h1>
        <p className="text-slate-400 mt-1">
          Review system activity, search queries, and access records.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-10 text-center">
          <p className="text-slate-400">No audit logs found.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-900/80 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">User ID</th>
                  <th className="px-4 py-3 font-medium">Resource</th>
                  <th className="px-4 py-3 font-medium">Query / Details</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-300 border border-blue-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                      {log.user_id ? log.user_id.split("-")[0] + "..." : "System"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {log.resource_type || "-"} {log.resource_id ? `(${log.resource_id.split("-")[0]}...)` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-300 truncate max-w-xs" title={log.query_text || ""}>
                      {log.query_text || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium border ${
                        log.response_status?.startsWith("ERROR") 
                          ? "bg-red-500/10 text-red-300 border-red-500/20" 
                          : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                      }`}>
                        {log.response_status || "OK"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
