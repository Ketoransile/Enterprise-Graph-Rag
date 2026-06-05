"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Network, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTheme } from "next-themes";
import {
  RiBarChartBoxLine,
  RiBook2Line,
  RiChat3Line,
  RiCheckLine,
  RiCloseLine,
  RiDatabase2Line,
  RiGroupLine,
  RiHome5Line,
  RiLogoutBoxRLine,
  RiMenuLine,
  RiMore2Fill,
  RiSettings4Line,
  RiShieldUserLine,
  RiUser3Line,
} from "react-icons/ri";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { ChatProvider } from "@/lib/chat-context";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  roles: string[];
};

const workspaceNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <RiHome5Line /> },
  { href: "/documents", label: "Documents", icon: <RiBook2Line /> },
  { href: "/chat", label: "Chat", icon: <RiChat3Line /> },
];

const adminNav: NavItem[] = [
  { href: "/admin/users", label: "Users", icon: <RiGroupLine /> },
  { href: "/admin/roles", label: "Roles", icon: <RiShieldUserLine /> },
  { href: "/analytics", label: "Analytics", icon: <RiBarChartBoxLine /> },
  { href: "/graph", label: "Graph", icon: <RiDatabase2Line /> },
];

const systemNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: <RiSettings4Line /> },
];

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { token, ready, clearAuth } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);

  useEffect(() => {
    if (ready && !token) {
      router.replace("/login");
    }
  }, [ready, token, router]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) setIsCollapsed(JSON.parse(saved));
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      if (!token) {
        setProfile(null);
        return;
      }

      try {
        const nextProfile = await api.auth.me(token);
        if (!ignore) setProfile(nextProfile);
      } catch {
        if (!ignore) setProfile(null);
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, [token]);

  const canAccessAdmin = profile?.roles.includes("ADMIN") ?? false;
  const navGroups = useMemo(
    () => [
      { key: "workspace", label: "Workspace", items: workspaceNav },
      ...(canAccessAdmin ? [{ key: "admin", label: "Admin tools", items: adminNav }] : []),
      { key: "system", label: "System", items: systemNav },
    ],
    [canAccessAdmin],
  );

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", JSON.stringify(next));
      return next;
    });
  };

  const handleLogout = () => {
    setSignOutDialogOpen(false);
    clearAuth();
    router.replace("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/chat") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const link = (
      <Link
        href={item.href as any}
        onClick={() => setMobileMenuOpen(false)}
        className={`group relative flex h-10 items-center rounded-lg text-[14px] transition-colors ${
          isCollapsed ? "mx-auto w-10 justify-center" : "gap-3 px-3"
        } ${
          active
            ? "bg-neutral-100 text-neutral-950 ring-1 ring-neutral-200 dark:bg-white/[0.075] dark:text-neutral-50 dark:ring-white/[0.06]"
            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-white/[0.045] dark:hover:text-neutral-100"
        }`}
      >
        <span
          className={`grid h-5 w-5 shrink-0 place-items-center text-[18px] ${
            active
              ? "text-neutral-950 dark:text-neutral-50"
              : "text-neutral-500 group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-neutral-200"
          }`}
        >
          {item.icon}
        </span>
        {!isCollapsed && <span className="truncate font-normal">{item.label}</span>}
      </Link>
    );

    if (!isCollapsed) return <React.Fragment key={item.href}>{link}</React.Fragment>;

    return (
      <Tooltip key={item.href} delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  if (!ready || !token) {
    return (
      <div className="flex h-screen bg-white text-black dark:bg-black dark:text-white">
        <div className="hidden h-full w-[272px] shrink-0 border-r border-neutral-200 p-4 dark:border-neutral-900 md:block">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6 pt-20 md:p-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-36 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-80 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen overflow-hidden bg-white text-black dark:bg-[#05070d] dark:text-white">
        <div className="premium-grid pointer-events-none fixed inset-0 z-0 hidden opacity-55 dark:block" />
        <div className="pointer-events-none fixed inset-x-0 top-0 z-0 hidden h-[520px] bg-[radial-gradient(90%_80%_at_50%_0%,rgba(20,184,166,0.14),rgba(5,7,13,0)_72%)] dark:block" />

        <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/90 px-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-transparent md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-ml-2 grid h-9 w-9 place-items-center rounded-lg text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
            aria-label="Open sidebar"
          >
            <RiMenuLine className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">Enterprise Graph Rag</span>
          <span className="h-9 w-9" />
        </header>

        {mobileMenuOpen ? (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-neutral-200 bg-white text-neutral-950 shadow-2xl shadow-black/10 transition-all duration-300 dark:border-white/[0.08] dark:bg-[#05070d]/[0.86] dark:text-white dark:shadow-black/40 dark:backdrop-blur-xl ${
            isCollapsed ? "md:w-[72px]" : "md:w-[272px]"
          } ${mobileMenuOpen ? "w-[280px] translate-x-0" : "w-[280px] -translate-x-full md:translate-x-0"}`}
        >
          <div className={`shrink-0 px-3 ${isCollapsed ? "py-4" : "pb-5 pt-4"}`}>
            <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between gap-3"}`}>
              <Link
                href="/dashboard"
                className={`flex min-w-0 items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black text-white shadow-sm dark:border dark:border-white/[0.14] dark:bg-white dark:text-black dark:shadow-[0_16px_40px_rgba(255,255,255,0.08)]">
                  <Network className="h-4 w-4" strokeWidth={2.4} />
                </span>
                {!isCollapsed && (
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-neutral-950 dark:text-neutral-100">
                      Enterprise Graph Rag
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-normal text-neutral-500">
                      Knowledge workspace
                    </span>
                  </span>
                )}
              </Link>

              {!isCollapsed && (
                <div className="flex shrink-0 items-center gap-1">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={toggleSidebar}
                        className="hidden h-8 w-8 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950 dark:hover:bg-white/[0.06] dark:hover:text-neutral-100 md:grid"
                        aria-label="Collapse sidebar"
                      >
                        <PanelLeftClose className="h-[17px] w-[17px]" strokeWidth={1.8} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Collapse sidebar</TooltipContent>
                  </Tooltip>

                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950 dark:hover:bg-white/[0.06] dark:hover:text-white md:hidden"
                    aria-label="Close sidebar"
                  >
                    <RiCloseLine className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            {isCollapsed && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="mx-auto mt-4 hidden h-9 w-9 place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950 dark:hover:bg-white/[0.06] dark:hover:text-neutral-100 md:grid"
                    aria-label="Expand sidebar"
                  >
                    <PanelLeftOpen className="h-[17px] w-[17px]" strokeWidth={1.8} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>
            )}
          </div>

          <nav className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 ${isCollapsed ? "pt-3" : "pt-1"}`}>
            <div className={isCollapsed ? "space-y-6" : "space-y-7"}>
              {navGroups.map((group) => (
                <section key={group.key}>
                  {!isCollapsed && (
                    <h2 className="mb-2.5 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400 dark:text-white/[0.34]">
                      {group.label}
                    </h2>
                  )}
                  <div className={isCollapsed ? "space-y-2" : "space-y-1.5"}>{group.items.map(renderNavItem)}</div>
                </section>
              ))}
            </div>
          </nav>

          <div className="shrink-0 border-t border-neutral-200 px-3 py-3 dark:border-white/[0.08]">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className={`flex w-full items-center rounded-xl text-left transition hover:bg-neutral-100 dark:hover:bg-white/[0.05] ${
                    isCollapsed ? "h-10 justify-center" : "gap-2.5 px-2 py-2"
                  }`}
                >
                  <UserAvatar
                    email={profile?.email ?? "user@example.com"}
                    name={profile?.full_name ?? null}
                    avatarUrl={profile?.avatar_url ?? null}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-neutral-950 dark:text-neutral-100">
                          {profile?.full_name || profile?.email?.split("@")[0] || "User"}
                        </span>
                        <span className="block truncate text-[11px] text-neutral-500">
                          {profile?.email || "Signed in"}
                        </span>
                      </span>
                      <RiMore2Fill className="h-5 w-5 shrink-0 text-neutral-500" />
                    </>
                  )}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  side="top"
                  align={isCollapsed ? "center" : "end"}
                  sideOffset={10}
                  className="z-50 min-w-[220px] rounded-xl border border-neutral-200 bg-white p-1 text-neutral-900 shadow-2xl shadow-black/10 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:shadow-black/40"
                >
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-medium">{profile?.full_name || profile?.email || "Account"}</p>
                    <p className="truncate text-xs text-neutral-500">{profile?.email}</p>
                  </div>
                  <DropdownMenu.Separator className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                  <div className="px-3 pb-1 pt-2">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">Theme</p>
                  </div>
                  {(["light", "dark", "system"] as const).map((mode) => (
                    <DropdownMenu.Item
                      key={mode}
                      onSelect={() => setTheme(mode)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm capitalize outline-none transition hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
                    >
                      <span className="min-w-0 flex-1">{mode}</span>
                      {theme === mode ? <RiCheckLine className="h-4 w-4 text-neutral-900 dark:text-neutral-100" /> : null}
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                  <DropdownMenu.Item
                    onSelect={() => router.push("/settings")}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
                  >
                    <RiSettings4Line className="h-4 w-4" />
                    Settings
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => setSignOutDialogOpen(true)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 outline-none transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                  >
                    <RiLogoutBoxRLine className="h-4 w-4" />
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </aside>

        <main
          className={`relative z-10 h-screen bg-white transition-[margin] duration-300 dark:bg-transparent ${
            isCollapsed ? "md:ml-[72px]" : "md:ml-[272px]"
          } ${pathname === "/chat" ? "overflow-hidden" : "overflow-auto p-6 pt-20 md:p-10"}`}
        >
          {children}
        </main>

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
                onClick={handleLogout}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700"
              >
                <RiLogoutBoxRLine className="h-4 w-4" />
                Sign out
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function UserAvatar({
  email,
  name,
  avatarUrl,
}: {
  email: string;
  name: string | null;
  avatarUrl: string | null;
}) {
  const label = (name || email || "U").trim().slice(0, 1).toUpperCase();

  return (
    <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-800 text-xs font-semibold text-neutral-100 ring-1 ring-black/10 dark:ring-white/[0.08]">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name || email}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        label || <RiUser3Line className="h-4 w-4" />
      )}
    </span>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </ChatProvider>
  );
}
