"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RiEyeLine, RiRefreshLine } from "react-icons/ri";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/ui/skeleton";
import { api, type Document } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface CreateForm {
  title: string;
  description: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  security_level: string;
}

function getDocumentId(doc: Document) {
  return doc.id || doc.document_id || "";
}

export default function DocumentsPage() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    title: "",
    description: "",
    file_name: "",
    file_type: "pdf",
    storage_path: "",
    security_level: "INTERNAL",
  });
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = useCallback(
    async ({ showSkeleton = false }: { showSkeleton?: boolean } = {}) => {
      if (!token) {
        setLoading(false);
        return;
      }

      if (showSkeleton) setLoading(true);
      setRefreshing(!showSkeleton);
      setError(null);

      try {
        setDocuments(await api.documents.list(token));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load documents");
      } finally {
        if (showSkeleton) setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadDocuments({ showSkeleton: true });
  }, [loadDocuments]);

  async function handleRefresh() {
    if (refreshing || loading) return;
    await loadDocuments();
  }

  async function handleDelete() {
    if (!token || !deleteTarget) return;
    const id = deleteTarget.id;
    setDeletingId(id);
    setError(null);
    try {
      await api.documents.delete(id, token);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete document",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function onFileSelect(file: File) {
    setSelectedFile(file);
    const inferredType = file.type.includes("pdf")
      ? "pdf"
      : file.type.includes("word") || file.name.endsWith(".docx")
        ? "docx"
        : file.type.includes("text") || file.name.endsWith(".txt")
          ? "txt"
          : file.name.endsWith(".md")
            ? "md"
            : "html";
    setForm((f) => ({
      ...f,
      file_name: file.name,
      title: f.title || file.name,
      file_type: inferredType,
      storage_path: f.storage_path || `db://pending/${file.name}`,
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      let newDoc = await api.documents.create(
        {
          title: form.title,
          description: form.description || undefined,
          file_name: form.file_name,
          file_type: form.file_type,
          storage_path: form.storage_path || `db://pending/${form.file_name}`,
          security_level: form.security_level,
        },
        token,
      );
      
      if (selectedFile) {
        newDoc = await api.documents.uploadFile(newDoc.id, selectedFile, token);
      }
      
      setDocuments((prev) => [newDoc, ...prev]);
      setForm({
        title: "",
        description: "",
        file_name: "",
        file_type: "pdf",
        storage_path: "",
        security_level: "INTERNAL",
      });
      setSelectedFile(null);
      setShowForm(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create document",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-black dark:text-white">
          Authentication Required
        </h2>
        <p className="text-neutral-500 mt-2">
          Please sign in to access documents.
        </p>
      </div>
    );
  }

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-black dark:text-white">Documents</h1>
          <p className="text-neutral-500 mt-1">
            Manage and register documents for ingestion.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-md text-sm font-medium hover:opacity-80 transition"
        >
          {showForm ? "Cancel" : "Register document"}
        </button>
      </header>

      {error && (
        <div className="rounded-md border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-6 space-y-4"
        >
          <div className="space-y-2">
            <label className="block text-sm text-neutral-600 dark:text-neutral-300">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              placeholder="Document title"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-neutral-600 dark:text-neutral-300">
              Security level
            </label>
            <select
              value={form.security_level}
              onChange={(e) =>
                setForm((f) => ({ ...f, security_level: e.target.value }))
              }
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            >
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal</option>
              <option value="CONFIDENTIAL">Confidential</option>
              <option value="RESTRICTED">Restricted</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-neutral-600 dark:text-neutral-300">
              Upload file
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file) onFileSelect(file);
              }}
              className="mt-1 flex justify-center rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-6 py-10 transition-colors hover:border-black dark:hover:border-white bg-white dark:bg-neutral-900/50"
            >
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div className="mt-4 flex text-sm leading-6 text-neutral-600 dark:text-neutral-400 justify-center">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md bg-transparent font-semibold text-black dark:text-white focus-within:outline-none hover:underline"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onFileSelect(file);
                      }}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs leading-5 text-neutral-500 mt-2">
                  {selectedFile ? selectedFile.name : "PDF, DOCX, TXT, MD up to 10MB"}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-neutral-600 dark:text-neutral-300">
              Description (optional)
            </label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              placeholder="Brief description"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-black text-white dark:bg-white dark:text-black px-5 py-2 rounded-md text-sm font-medium hover:opacity-80 transition disabled:opacity-50"
            >
              {submitting ? "Registering..." : "Register"}
            </button>
          </div>
        </form>
      )}

      {documents.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/30 p-10 text-center">
          <p className="text-neutral-600 dark:text-neutral-400">No documents yet.</p>
          <p className="text-sm text-neutral-500 mt-1">
            Register your first document to start ingestion.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-black">
            <div>
              <h2 className="text-sm font-semibold text-black dark:text-white">Document library</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                {documents.length} documents registered
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-neutral-200 px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              <RiRefreshLine className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-100 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Security</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {documents.map((doc) => {
                const documentId = getDocumentId(doc);
                return (
                <tr key={documentId || doc.file_name} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition">
                  <td className="px-4 py-3 text-black dark:text-neutral-200 font-medium">
                    {documentId ? (
                      <Link
                        href={`/documents/${documentId}` as any}
                        className="hover:underline"
                      >
                        {doc.title}
                      </Link>
                    ) : (
                      doc.title
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{doc.file_type}</td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {doc.security_level}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-neutral-200 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-black dark:text-white border border-neutral-300 dark:border-neutral-700">
                      {doc.processing_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/documents/${documentId}` as any}
                        aria-disabled={!documentId}
                        className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-2.5 text-xs font-medium transition dark:border-neutral-800 ${
                          documentId
                            ? "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-900"
                            : "pointer-events-none text-neutral-400 opacity-50 dark:text-neutral-600"
                        }`}
                      >
                        <RiEyeLine className="h-4 w-4" />
                        View
                      </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(doc)}
                      disabled={deletingId === doc.id}
                        className="inline-flex h-8 items-center justify-center rounded-md px-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                    >
                      {deletingId === doc.id ? "Deleting..." : "Delete"}
                    </button>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeleteTarget(null);
        }}
      >
        <DialogContent className="border-neutral-200 bg-white text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 sm:rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-black dark:text-white">Delete document</DialogTitle>
            <DialogDescription className="text-neutral-500 dark:text-neutral-400">
              This will permanently delete {deleteTarget ? `"${deleteTarget.title}"` : "this document"}
              and remove it from the workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(deletingId)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-200 px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={Boolean(deletingId)}
              className="inline-flex h-10 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {deletingId ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
