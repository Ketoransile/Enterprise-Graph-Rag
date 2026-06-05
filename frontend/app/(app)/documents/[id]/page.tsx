"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/ui/skeleton";
import { api, type Chunk, type Document } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function DocumentDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const documentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [doc, setDoc] = useState<Document | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [chunkFilter, setChunkFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  useEffect(() => {
    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      if (!documentId) {
        setError("Document id is missing from the current route.");
        setLoading(false);
        return;
      }
      try {
        const [d, c] = await Promise.all([
          api.documents.get(documentId, token),
          api.documents.chunks(documentId, token),
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
  }, [token, documentId]);

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

  async function handleReprocess() {
    if (!token || !doc) return;
    setReprocessing(true);
    setError(null);
    try {
      const updated = await api.documents.reprocess(doc.id, token);
      setDoc(updated);
      setChunks([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reprocess document",
      );
    } finally {
      setReprocessing(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-black dark:text-white">
          Authentication Required
        </h2>
        <p className="text-neutral-500 mt-2">
          Please sign in to view this document.
        </p>
      </div>
    );
  }

  if (loading) {
    return <PageSkeleton />;
  }

  if (error || !doc) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">Error</h2>
        <p className="text-neutral-500">{error ?? "Document not found."}</p>
        <Link
          href="/documents"
          className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
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
          <p className="text-sm text-neutral-500">Document detail</p>
          <h1 className="text-3xl font-semibold text-black dark:text-white">{doc.title}</h1>
          <p className="text-neutral-500 mt-1">Uploaded file: {doc.file_name}</p>
        </div>
        <Link
          href="/documents"
          className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
        >
          ← Back to documents
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">File type</span>
            <span className="text-sm font-medium text-black dark:text-white">
              {doc.file_type}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Security</span>
            <span className="text-xs font-semibold rounded-full bg-neutral-200 dark:bg-neutral-800 px-3 py-1 text-black dark:text-white border border-neutral-300 dark:border-neutral-700">
              {doc.security_level}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Status</span>
            <span className="text-xs font-semibold rounded-full bg-neutral-200 dark:bg-neutral-800 px-3 py-1 text-black dark:text-white border border-neutral-300 dark:border-neutral-700">
              {doc.processing_status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Page count</span>
            <span className="text-sm font-medium text-black dark:text-white">
              {doc.page_count ?? "–"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Created</span>
            <span className="text-sm font-medium text-black dark:text-white">
              {new Date(doc.created_at).toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            onClick={handleReprocess}
            disabled={reprocessing}
            className="mt-2 w-full rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium hover:opacity-80 disabled:opacity-50 transition"
          >
            {reprocessing ? "Reprocessing..." : "Reprocess document"}
          </button>
        </div>

        <form
          onSubmit={handleUpdate}
          className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-5 space-y-4"
        >
          <div className="space-y-2">
            <label className="block text-sm text-neutral-600 dark:text-neutral-300">Title</label>
            <input
              value={doc.title}
              onChange={(e) => setDoc({ ...doc, title: e.target.value })}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-neutral-600 dark:text-neutral-300">Description</label>
            <textarea
              value={doc.description ?? ""}
              onChange={(e) => setDoc({ ...doc, description: e.target.value })}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-neutral-600 dark:text-neutral-300">
              Security level
            </label>
            <select
              value={doc.security_level}
              onChange={(e) =>
                setDoc({ ...doc, security_level: e.target.value })
              }
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
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
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleting}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete document"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium hover:opacity-80 disabled:opacity-50 transition"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-black dark:text-white">Chunks</h3>
            <span className="text-xs text-neutral-500">
              {chunks.length} total
            </span>
            {doc.page_count ? (
              <span className="text-xs text-neutral-500">
                {doc.page_count} pages
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={chunkFilter}
              onChange={(e) => setChunkFilter(e.target.value)}
              placeholder="Filter text or page #"
              className="w-48 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
            <select
              className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-xs text-black dark:text-white"
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
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-6 text-center">
            <p className="text-neutral-500">
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
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/60 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                    <span className="text-black dark:text-neutral-200 font-medium">
                      Chunk #{chunk.chunk_index}
                    </span>
                    <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-black dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700">
                      Page {chunk.page_number ?? "–"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        chunk.security_level === "RESTRICTED"
                          ? "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900"
                          : chunk.security_level === "CONFIDENTIAL"
                            ? "bg-neutral-200 dark:bg-neutral-800 text-black dark:text-neutral-200 border-neutral-300 dark:border-neutral-700"
                            : chunk.security_level === "INTERNAL"
                              ? "bg-neutral-200 dark:bg-neutral-800 text-black dark:text-neutral-200 border-neutral-300 dark:border-neutral-700"
                              : "bg-neutral-200 dark:bg-neutral-800 text-black dark:text-neutral-200 border-neutral-300 dark:border-neutral-700"
                      }`}
                    >
                      {chunk.security_level}
                    </span>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      {chunk.chunk_text.length} chars
                    </span>
                  </div>
                  <p className="text-sm text-black dark:text-neutral-100 leading-relaxed whitespace-pre-wrap">
                    {chunk.chunk_text}
                  </p>
                </div>
              ))}
          </div>
        )}
      </section>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteDialogOpen(false);
        }}
      >
        <DialogContent className="border-neutral-200 bg-white text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 sm:rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-black dark:text-white">Delete document</DialogTitle>
            <DialogDescription className="text-neutral-500 dark:text-neutral-400">
              This will permanently delete &quot;{doc.title}&quot; and return you to the documents list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-200 px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex h-10 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
