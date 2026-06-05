"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RiAddLine,
  RiCheckboxCircleLine,
  RiCloseLine,
  RiGoogleFill,
  RiSearchLine,
  RiShieldUserLine,
  RiUserSettingsLine,
} from "react-icons/ri";
import { toast } from "sonner";

import { TableSkeleton } from "@/components/ui/skeleton";
import { api, ApiError, type RoleRead, type UserListItem } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

const DEFAULT_ROLES = ["USER", "VIEWER", "MANAGER", "ADMIN"];

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.body || error.message || fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<RoleRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("USER");
  const [inviting, setInviting] = useState(false);
  const [lastInvitePassword, setLastInvitePassword] = useState<string | null>(null);

  const roleOptions = useMemo(() => {
    const names = new Set([...DEFAULT_ROLES, ...roles.map((role) => role.name)]);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [roles]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      [user.email, user.full_name ?? "", user.roles.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, users]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [nextUsers, nextRoles] = await Promise.all([
        api.auth.listUsers(token),
        api.auth.listRoles(token),
      ]);
      setUsers(nextUsers);
      setRoles(nextRoles);
    } catch (error) {
      toast.error("Users unavailable", {
        description: errorMessage(error, "Could not load user management data."),
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !inviteEmail.trim()) return;
    setInviting(true);
    setLastInvitePassword(null);
    try {
      const result = await api.auth.invite(
        {
          email: inviteEmail.trim(),
          full_name: inviteName.trim() || undefined,
          role: inviteRole,
        },
        token,
      );
      setLastInvitePassword(result.temporary_password);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("USER");
      await loadUsers();
      toast.success("User invited", {
        description: `${result.email} can sign in with Google after provisioning.`,
      });
    } catch (error) {
      toast.error("Invite failed", {
        description: errorMessage(error, "Could not invite this user."),
      });
    } finally {
      setInviting(false);
    }
  }

  async function toggleRole(user: UserListItem, role: string) {
    if (!token) return;
    const nextRoles = user.roles.includes(role)
      ? user.roles.filter((item) => item !== role)
      : [...user.roles, role];
    setSavingUserId(user.id);
    try {
      const updated = await api.auth.updateUserRoles(user.id, nextRoles, token);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success("Roles updated");
    } catch (error) {
      toast.error("Role update failed", {
        description: errorMessage(error, "Could not update this user's roles."),
      });
    } finally {
      setSavingUserId(null);
    }
  }

  async function toggleStatus(user: UserListItem) {
    if (!token) return;
    setSavingUserId(user.id);
    try {
      const updated = await api.auth.updateUserStatus(user.id, !user.is_active, token);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(updated.is_active ? "User activated" : "User deactivated");
    } catch (error) {
      toast.error("Status update failed", {
        description: errorMessage(error, "Could not update this user's status."),
      });
    } finally {
      setSavingUserId(null);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-semibold text-black dark:text-white">Authentication Required</h2>
          <p className="mt-2 text-sm text-neutral-500">Please sign in to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-5 dark:border-neutral-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black dark:text-white">Users</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Provision people, assign roles, and keep access aligned with your workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen((open) => !open)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          {inviteOpen ? <RiCloseLine className="h-4 w-4" /> : <RiAddLine className="h-4 w-4" />}
          {inviteOpen ? "Close invite" : "Invite user"}
        </button>
      </header>

      {inviteOpen ? (
        <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-black">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-neutral-100 text-xl text-black dark:bg-neutral-900 dark:text-white">
              <RiGoogleFill />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-black dark:text-white">Invite for Google sign-in</h2>
              <p className="mt-1 text-sm text-neutral-500">
                The invite provisions the account and role. The user can then continue with Google using the invited email.
              </p>
            </div>
          </div>
          <form onSubmit={handleInvite} className="grid gap-3 lg:grid-cols-[1fr_1fr_180px_auto]">
            <input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              type="email"
              required
              placeholder="email@company.com"
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-black dark:focus:border-neutral-600"
            />
            <input
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
              placeholder="Full name"
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-black dark:focus:border-neutral-600"
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-black dark:focus:border-neutral-600"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="h-10 rounded-lg border border-neutral-900 bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60 dark:border-neutral-100 dark:bg-neutral-100 dark:text-black dark:hover:bg-neutral-300"
            >
              {inviting ? "Inviting..." : "Send invite"}
            </button>
          </form>
          {lastInvitePassword ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Temporary password generated: <span className="font-mono font-semibold">{lastInvitePassword}</span>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
        <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 dark:border-neutral-900 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
              Directory
            </h2>
            <p className="mt-1 text-sm text-neutral-500">{users.length} provisioned users</p>
          </div>
          <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-neutral-200 px-3 text-neutral-500 transition focus-within:border-neutral-400 dark:border-neutral-800 md:w-80">
            <RiSearchLine className="h-4 w-4 shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users"
              className="min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-neutral-400 dark:text-white"
            />
          </label>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={6} columns={3} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">No users match your search.</div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
            {filteredUsers.map((user) => (
              <div key={user.id} className="grid gap-4 p-4 xl:grid-cols-[minmax(220px,1fr)_minmax(360px,1.4fr)_auto] xl:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
                      {(user.full_name || user.email).slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-black dark:text-white">
                        {user.full_name || user.email.split("@")[0]}
                      </p>
                      <p className="truncate text-xs text-neutral-500">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {roleOptions.map((role) => {
                    const checked = user.roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(user, role)}
                        disabled={savingUserId === user.id}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition disabled:opacity-60 ${
                          checked
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-black"
                            : "border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-800 dark:hover:border-neutral-600 dark:hover:text-white"
                        }`}
                      >
                        {checked ? <RiCheckboxCircleLine className="h-3.5 w-3.5" /> : <RiShieldUserLine className="h-3.5 w-3.5" />}
                        {role}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3 xl:justify-end">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      user.is_active
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400"
                    }`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleStatus(user)}
                    disabled={savingUserId === user.id}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-black disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white"
                  >
                    <RiUserSettingsLine className="h-3.5 w-3.5" />
                    {user.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
