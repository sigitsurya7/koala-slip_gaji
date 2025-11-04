"use client";

import Link from "next/link";
import { Link as HeroLink } from "@heroui/link";
import { Avatar } from "@heroui/avatar";
import { MdDashboard, MdPeople, MdSettings, MdReceiptLong, MdExpandMore } from "react-icons/md";
import clsx from "clsx";
import { useMemo, useState } from "react";

type User = { username: string; role: "Admin" | "Member" } | null;

export function AdminSidebar({ user, pathname, fullWidth = false }: { user: User; pathname: string | null; fullWidth?: boolean }) {
  const isSettingsPath = useMemo(
    () => Boolean(pathname?.startsWith("/settings") || pathname?.startsWith("/users")),
    [pathname]
  );
  const [settingsOpen, setSettingsOpen] = useState(isSettingsPath);

  return (
    <nav className={clsx(
      "h-full p-3 flex flex-col",
      fullWidth ? "w-full" : "w-64 xl:w-72"
    )}>
      <div className={clsx(
        "flex h-full flex-col rounded-2xl border border-default-100 bg-content2/70 backdrop-blur p-4",
        "shadow-medium"
      )}>
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={(user?.username ?? "").slice(0, 2) || "?"} color="primary" size="sm" />
          <div className="leading-tight">
            <div className="text-sm font-medium truncate">{user?.username ?? "User"}</div>
            <div className="text-xs text-default-500">{user?.role ?? "Member"}</div>
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-default-500 px-2 mb-2">Menu</div>
        <div className="px-2 pb-3 space-y-2">
          <SidebarLink href="/admin" active={pathname === "/admin"} icon={<MdDashboard className="text-sm" />}>Dashboard</SidebarLink>
          <SidebarLink href="/slip" active={pathname?.startsWith("/slip") ?? false} icon={<MdReceiptLong className="text-sm" />}>Buat Slip</SidebarLink>

          {user?.role === "Admin" && (
            <div>
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                className={clsx(
                "w-full flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl text-left transition-colors",
                isSettingsPath || settingsOpen
                  ? "bg-default-100 font-medium"
                  : "hover:bg-default-100"
                )}
              >
                <MdSettings className="text-sm" />
                <span className="flex-1">Settings</span>
                <MdExpandMore className={clsx("transition-transform", settingsOpen ? "rotate-180" : "rotate-0")} />
              </button>
              {settingsOpen && (
                <div className="mt-1 pl-6 space-y-1">
                  <SidebarLink href="/settings/users" active={pathname?.startsWith("/settings/users") ?? false}>User Management</SidebarLink>
                  <SidebarLink href="/settings/app" active={pathname?.startsWith("/settings/app") ?? false}>Aplikasi</SidebarLink>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-auto px-2 pt-4 text-xs text-default-400">Koala Creative Ac 2025</div>
      </div>
    </nav>
  );
}

function SidebarLink({ href, active, icon, children }: { href: string; active?: boolean; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <HeroLink
      as={Link}
      href={href}
      color={active ? "primary" : "foreground"}
      className={clsx(
        "flex items-center gap-2 px-3 py-2 rounded-xl transition-colors border border-transparent",
        active
          ? "bg-primary-500/15 text-primary-300 border-primary-500/20 font-semibold shadow-sm"
          : "hover:bg-default-100"
      )}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span>{children}</span>
    </HeroLink>
  );
}
