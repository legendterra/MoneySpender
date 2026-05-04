"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  HandCoins,
  LayoutGrid,
  Landmark,
  ScrollText,
  Settings2,
} from "lucide-react";

import { LogoMark } from "@/components/logo-mark";
import { LogoutButton } from "@/components/logout-button";
import { QuickAdd } from "@/components/quick-add";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const iconsByHref = {
  "/dashboard": LayoutGrid,
  "/net-worth": Landmark,
  "/all-transactions": ScrollText,
  "/income": ArrowDownCircle,
  "/expenses": ArrowUpCircle,
  "/debts": HandCoins,
  "/settings": Settings2,
} as const;

export function AppShell({
  children,
  userEmail,
  userLabel,
}: {
  children: React.ReactNode;
  userEmail: string;
  userLabel: string;
}) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    icon: iconsByHref[item.href],
  }));

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="mobile-safe min-h-screen pb-8">
      <header className="sticky top-0 z-40 px-4 pb-3 pt-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[24px] border border-border bg-background px-4 py-3 shadow-[0_12px_36px_rgba(30,41,59,0.08)] sm:px-5 dark:shadow-[0_12px_36px_rgba(0,0,0,0.24)]">
          <div className="flex min-w-0 items-center gap-4">
            <LogoMark />
            <div className="hidden lg:grid">
              <span className="text-sm font-semibold text-foreground">{userLabel}</span>
              <span className="text-xs text-muted">{userEmail}</span>
            </div>
          </div>
          <nav className="hidden max-w-[60%] flex-wrap items-center justify-end gap-2 lg:flex">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white shadow-[0_16px_38px_rgba(57,74,216,0.28)]"
                      : "text-muted hover:bg-background-strong hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden md:block">
              <LogoutButton variant="secondary" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <div>{children}</div>
      </main>

      <QuickAdd />

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="grid w-full grid-cols-3 gap-2 rounded-[24px] border border-border bg-background px-3 py-3 shadow-[0_12px_36px_rgba(30,41,59,0.12)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.28)]">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-center text-[11px] font-semibold transition",
                  active
                    ? "bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white shadow-[0_16px_38px_rgba(57,74,216,0.22)]"
                    : "text-muted hover:bg-background-strong hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
