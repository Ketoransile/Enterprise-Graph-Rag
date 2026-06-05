"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RiAddLine,
  RiEdit2Line,
  RiGroupLine,
  RiInformationLine,
  RiShieldCheckLine,
} from "react-icons/ri";
import { toast } from "sonner";

import { TableSkeleton } from "@/components/ui/skeleton";
import { api, ApiError, type RoleRead } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

const ROLE_GUIDANCE: Record<string, string> = {
  ADMIN: "Full workspace administration, user management, audit visibility, and system configuration.",
  MANAGER: "Operational oversight for documents, analytics, and team activity without full system ownership.",
  USER: "Standard authenticated access to documents, chat, and permitted retrieval results.",
  VIEWER: "Read-oriented access for users who should inspect content without making operational changes.",
  HR: "People operations access pattern for HR-specific document collections.",
  FINANCE: "Finance access pattern for financial and accounting knowledge collections.",
};

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.body || error.message || fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function AdminRolesPage() {
  const { token } = useAuth();
  const [roles, setRoles] = useState<RoleRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");

  const totalAssignments = useMemo(
    () => roles.reduce((total, role) => total + role.user_count, 0),
    [roles],
  );

  const loadRoles = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setRoles(await api.auth.listRoles(token));
    } catch (error) {
      toast.error("Roles unavailable", {
        description: errorMessage(error, "Could not load role definitions."),
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !name.trim()) return;
    setSaving(true);
    try {
      const role = await api.auth.createRole(
        {
          name: name.trim(),
          description: description.trim() || undefined,
        },
        token,
      );
      setRoles((prev) => [...prev, role].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setDescription("");
      toast.success("Role created");
    } catch (error) {
      toast.error("Role creation failed", {
        description: errorMessage(error, "Could not create this role."),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(role: RoleRead) {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await api.auth.updateRole(
        role.name,
        { description: editingDescription.trim() || null },
        token,
      );
      setRoles((prev) => prev.map((item) => (item.name === updated.name ? updated : item)));
      setEditingName(null);
      setEditingDescription("");
      toast.success("Role updated");
    } catch (error) {
      toast.error("Role update failed", {
        description: errorMessage(error, "Could not update this role."),
      });
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-semibold text-black dark:text-white">Authentication Required</h2>
          <p className="mt-2 text-sm text-neutral-500">Please sign in to manage roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-5 dark:border-neutral-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black dark:text-white">Roles</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Define workspace access groups and review how users are distributed across them.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Metric label="Roles" value={roles.length} />
          <Metric label="Assignments" value={totalAssignments} />
        </div>
      </header>

      <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-black">
        <div className="mb-5 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-neutral-100 text-xl text-black dark:bg-neutral-900 dark:text-white">
            <RiAddLine />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-black dark:text-white">Create role</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Role names are stored uppercase and can be assigned from the Users page.
            </p>
          </div>
        </div>
        <form onSubmit={handleCreate} className="grid gap-3 lg:grid-cols-[220px_1fr_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ROLE_NAME"
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-black dark:focus:border-neutral-600"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe what this role should be used for"
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-black dark:focus:border-neutral-600"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="h-10 rounded-lg bg-black px-4 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            Create
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
        <div className="border-b border-neutral-100 p-4 dark:border-neutral-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
            Role definitions
          </h2>
          <p className="mt-1 text-sm text-neutral-500">Edit descriptions here. Assignments happen on the Users page.</p>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} columns={3} />
          </div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">No roles have been created yet.</div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {roles.map((role) => {
              const isEditing = editingName === role.name;
              const guidance = ROLE_GUIDANCE[role.name];

              return (
                <div key={role.id} className="grid gap-4 p-4 lg:grid-cols-[220px_1fr_auto] lg:items-start">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-neutral-100 text-lg text-black dark:bg-neutral-900 dark:text-white">
                      <RiShieldCheckLine />
                    </span>
                    <div>
                      <p className="font-medium text-black dark:text-white">{role.name}</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
                        <RiGroupLine className="h-3.5 w-3.5" />
                        {role.user_count} users
                      </p>
                    </div>
                  </div>

                  <div>
                    {isEditing ? (
                      <textarea
                        value={editingDescription}
                        onChange={(event) => setEditingDescription(event.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-black dark:focus:border-neutral-600"
                      />
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-neutral-600 dark:text-neutral-300">
                          {role.description || "No custom description."}
                        </p>
                        {guidance ? (
                          <p className="flex gap-2 text-xs leading-5 text-neutral-500">
                            <RiInformationLine className="mt-0.5 h-4 w-4 shrink-0" />
                            {guidance}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 lg:justify-end">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdate(role)}
                          disabled={saving}
                          className="h-9 rounded-lg bg-black px-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingName(null);
                            setEditingDescription("");
                          }}
                          className="h-9 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-black dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(role.name);
                          setEditingDescription(role.description ?? "");
                        }}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-black dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white"
                      >
                        <RiEdit2Line className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-black">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-black dark:text-white">{value}</p>
    </div>
  );
}
