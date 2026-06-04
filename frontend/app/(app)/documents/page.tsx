"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

import { api, API_BASE, type Document } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface CreateForm {
  title: string;
  description: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  security_level: string;
}

export default function DocumentsPage() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  useEffect(() => {
    async function load() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const docs = await api.documents.list(token);
        setDocuments(docs);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load documents",
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm("Delete this document?")) return;
    setDeletingId(id);
    try {
      await api.documents.delete(id, token);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
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
      storage_path: f.storage_path || `/uploads/${file.name}`,
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      const newDoc = await api.documents.create(
        {
          title: form.title,
          description: form.description || undefined,
          file_name: form.file_name,
          file_type: form.file_type,
          storage_path: form.storage_path,
          security_level: form.security_level,
        },
        token,
      );
      
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        await fetch(`${API_BASE}/api/v1/documents/${newDoc.id}/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
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
        <h2 className="text-xl font-semibold text-white">
          Authentication Required
        </h2>
        <p className="text-slate-400 mt-2">
          Please sign in to access documents.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">Documents</h1>
          <p className="text-slate-400 mt-1">
            Manage and register documents for ingestion.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-white text-slate-950 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition"
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
          className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 space-y-4"
        >
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Document title"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">
              Security level
            </label>
            <select
              value={form.security_level}
              onChange={(e) =>
                setForm((f) => ({ ...f, security_level: e.target.value }))
              }
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal</option>
              <option value="CONFIDENTIAL">Confidential</option>
              <option value="RESTRICTED">Restricted</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">
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
              className="mt-1 flex justify-center rounded-lg border border-dashed border-slate-600 px-6 py-10 transition-colors hover:border-slate-400 bg-slate-900/50"
            >
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div className="mt-4 flex text-sm leading-6 text-slate-400">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md bg-transparent font-semibold text-blue-400 focus-within:outline-none hover:text-blue-300"
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
                <p className="text-xs leading-5 text-slate-500">
                  {selectedFile ? selectedFile.name : "PDF, DOCX, TXT, MD up to 10MB"}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">
              Description (optional)
            </label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-white text-slate-950 px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-200 transition disabled:opacity-50"
            >
              {submitting ? "Registering..." : "Register"}
            </button>
          </div>
        </form>
      )}

      {documents.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-10 text-center">
          <p className="text-slate-400">No documents yet.</p>
          <p className="text-sm text-slate-500 mt-1">
            Register your first document to start ingestion.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Security</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-900/30 transition">
                  <td className="px-4 py-3 text-slate-200">
                    <Link
                      href={`/documents/${doc.id}` as any}
                      className="hover:text-blue-300"
                    >
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{doc.file_type}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {doc.security_level}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/20">
                      {doc.processing_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="text-sm text-red-300 hover:text-red-200 disabled:opacity-50"
                    >
                      {deletingId === doc.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
