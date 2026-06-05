"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  RiComputerLine,
  RiGoogleFill,
  RiLogoutBoxRLine,
  RiMoonLine,
  RiShieldCheckLine,
  RiSunLine,
  RiUser3Line,
} from "react-icons/ri";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  roles: string[];
};

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.body || error.message || fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function SettingsPage() {
  const { token, clearAuth } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextProfile = await api.auth.me(token);
        if (!ignore) setProfile(nextProfile);
      } catch (error) {
        if (!ignore) {
          toast.error("Profile unavailable", {
            description: errorMessage(error, "Could not load account settings."),
          });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, [token]);

  const displayName = profile?.full_name || profile?.email.split("@")[0] || "Workspace user";
  const roleSummary = useMemo(
    () => (profile?.roles.length ? profile.roles.join(", ") : "No assigned roles"),
    [profile],
  );

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-semibold text-black dark:text-white">Authentication Required</h2>
          <p className="mt-2 text-sm text-neutral-500">Please sign in to access settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="border-b border-neutral-200 pb-5 dark:border-neutral-800">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black dark:text-white">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          Manage your account, session, and interface preferences.
        </p>
      </header>

      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-neutral-100 text-xl text-black dark:bg-neutral-900 dark:text-white">
              <RiUser3Line />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-black dark:text-white">
                {displayName}
              </h2>
              <p className="truncate text-sm text-neutral-500">{profile?.email || "Signed in"}</p>
            </div>
          </div>
          <span
            className={`inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium ${
              profile?.is_active
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400"
            }`}
          >
            {profile?.is_active ? "Active account" : "Inactive account"}
          </span>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel
          icon={<RiShieldCheckLine />}
          title="Access"
          description="Roles control which workspace tools and protected content you can use."
        >
          <div className="flex flex-wrap gap-2">
            {(profile?.roles.length ? profile.roles : ["No roles"]).map((role) => (
              <span
                key={role}
                className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"
              >
                {role}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-neutral-500">{roleSummary}</p>
        </Panel>

        <Panel
          icon={<RiGoogleFill />}
          title="Sign-in"
          description="Google sign-in is available for provisioned workspace accounts."
        >
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
            Ask an admin to invite your Google account email before using SSO in invite-only mode.
          </div>
        </Panel>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black">
        <div className="border-b border-neutral-100 p-5 dark:border-neutral-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
            Appearance
          </h2>
          <p className="mt-1 text-sm text-neutral-500">Theme applies across content, chat, and sidebar navigation.</p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <ThemeChoice
            active={theme === "light"}
            icon={<RiSunLine />}
            label="Light"
            onClick={() => setTheme("light")}
          />
          <ThemeChoice
            active={theme === "dark"}
            icon={<RiMoonLine />}
            label="Dark"
            onClick={() => setTheme("dark")}
          />
          <ThemeChoice
            active={theme === "system"}
            icon={<RiComputerLine />}
            label="System"
            onClick={() => setTheme("system")}
          />
        </div>
        <div className="border-t border-neutral-100 px-5 py-4 dark:border-neutral-900">
          <div className="inline-flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-black">
            <ThemeToggle />
            <span className="pr-3 text-sm text-neutral-500">Quick toggle</span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-black">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-black dark:text-white">Session</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Sign out when you are finished on a shared device.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSignOutDialogOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            <RiLogoutBoxRLine className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </section>

      <Dialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <DialogContent className="border-neutral-200 bg-white text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 sm:rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-black dark:text-white">Sign out</DialogTitle>
            <DialogDescription className="text-neutral-500 dark:text-neutral-400">
              You will need to sign in again to access this workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <button
              type="button"
              onClick={() => setSignOutDialogOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-200 px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={clearAuth}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700"
            >
              <RiLogoutBoxRLine className="h-4 w-4" />
              Sign out
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Panel({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-black">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-neutral-100 text-xl text-black dark:bg-neutral-900 dark:text-white">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-black dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ThemeChoice({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[92px] items-center justify-between rounded-lg border p-4 text-left transition ${
        active
          ? "border-neutral-900 bg-neutral-100 text-black dark:border-neutral-100 dark:bg-neutral-900 dark:text-white"
          : "border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-black dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white"
      }`}
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-xs text-neutral-500">Theme mode</span>
      </span>
      <span className="text-2xl">{icon}</span>
    </button>
  );
}
