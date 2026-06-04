"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api, type Chunk, type Document } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function DocumentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { token } = useAuth();
  const router = useRouter();
  const [doc, setDoc] = useState<Document | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [chunkFilter, setChunkFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [d, c] = await Promise.all([
          api.documents.get(params.id, token),
          api.documents.chunks(params.id, token),
        ]);
        setDoc(d);
        setChunks(c);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load document",
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, params.id]);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !doc) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.documents.update(
        doc.id,
        {
          title: doc.title,
          description: doc.description ?? undefined,
          security_level: doc.security_level,
        },
        token,
      );
      setDoc(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update document",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token || !doc) return;
    if (!confirm("Delete this document?")) return;
    setDeleting(true);
    setError(null);
    try {
      await api.documents.delete(doc.id, token);
      router.push("/documents");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete document",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white">
          Authentication Required
        </h2>
        <p className="text-slate-400 mt-2">
          Please sign in to view this document.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Loading document...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-red-400">Error</h2>
        <p className="text-slate-400">{error ?? "Document not found."}</p>
        <Link
          href="/documents"
          className="text-sm text-blue-300 hover:text-blue-200"
        >
          Back to documents
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Document detail</p>
          <h1 className="text-3xl font-semibold text-slate-50">{doc.title}</h1>
          <p className="text-slate-400 mt-1">Uploaded file: {doc.file_name}</p>
        </div>
        <Link
          href="/documents"
          className="text-sm text-blue-300 hover:text-blue-200"
        >
          ← Back to documents
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">File type</span>
            <span className="text-sm font-medium text-slate-100">
              {doc.file_type}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Security</span>
            <span className="text-xs font-semibold rounded-full bg-slate-800 px-3 py-1 text-slate-100 border border-slate-700">
              {doc.security_level}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Status</span>
            <span className="text-xs font-semibold rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200 border border-emerald-500/30">
              {doc.processing_status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Page count</span>
            <span className="text-sm font-medium text-slate-100">
              {doc.page_count ?? "–"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Created</span>
            <span className="text-sm font-medium text-slate-100">
              {new Date(doc.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        <form
          onSubmit={handleUpdate}
          className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 space-y-4"
        >
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Title</label>
            <input
              value={doc.title}
              onChange={(e) => setDoc({ ...doc, title: e.target.value })}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Description</label>
            <textarea
              value={doc.description ?? ""}
              onChange={(e) => setDoc({ ...doc, description: e.target.value })}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">
              Security level
            </label>
            <select
              value={doc.security_level}
              onChange={(e) =>
                setDoc({ ...doc, security_level: e.target.value })
              }
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal</option>
              <option value="CONFIDENTIAL">Confidential</option>
              <option value="RESTRICTED">Restricted</option>
            </select>
          </div>
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm text-red-300 hover:text-red-200 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete document"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-50">Chunks</h3>
            <span className="text-xs text-slate-400">
              {chunks.length} total
            </span>
            {doc.page_count ? (
              <span className="text-xs text-slate-400">
                {doc.page_count} pages
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={chunkFilter}
              onChange={(e) => setChunkFilter(e.target.value)}
              placeholder="Filter text or page #"
              className="w-48 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100"
              onChange={(e) => {
                const target = document.getElementById(e.target.value);
                if (target)
                  target.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              defaultValue=""
            >
              <option value="" disabled>
                Jump to chunk
              </option>
              {chunks.map((chunk) => (
                <option key={chunk.id} value={`chunk-${chunk.id}`}>
                  #{chunk.chunk_index} (page {chunk.page_number ?? "-"})
                </option>
              ))}
            </select>
          </div>
        </div>
        {chunks.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center">
            <p className="text-slate-400">
              No chunks available yet. Ingestion may still be processing.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {chunks
              .filter((chunk) => {
                if (!chunkFilter.trim()) return true;
                const term = chunkFilter.toLowerCase();
                return (
                  chunk.chunk_text.toLowerCase().includes(term) ||
                  (chunk.page_number?.toString() ?? "").includes(term)
                );
              })
              .map((chunk) => (
                <div
                  key={chunk.id}
                  id={`chunk-${chunk.id}`}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="text-slate-200 font-medium">
                      Chunk #{chunk.chunk_index}
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-200 border border-slate-700">
                      Page {chunk.page_number ?? "–"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        chunk.security_level === "RESTRICTED"
                          ? "bg-red-500/10 text-red-200 border-red-500/30"
                          : chunk.security_level === "CONFIDENTIAL"
                            ? "bg-amber-500/10 text-amber-200 border-amber-500/30"
                            : chunk.security_level === "INTERNAL"
                              ? "bg-blue-500/10 text-blue-200 border-blue-500/30"
                              : "bg-emerald-500/10 text-emerald-200 border-emerald-500/30"
                      }`}
                    >
                      {chunk.security_level}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {chunk.chunk_text.length} chars
                    </span>
                  </div>
                  <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
                    {chunk.chunk_text}
                  </p>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
