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
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex w-full items-center justify-between">
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
                    "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-accent text-white"
                      : "text-muted hover:bg-background-strong hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="https://moneyspender.net"
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-background-elevated px-3 text-sm font-semibold text-muted transition-colors hover:bg-background-strong hover:text-foreground"
              aria-label="Kembali ke MoneySpender Hub"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5"
                aria-hidden="true"
              >
                <path d="M10 3L5 8l5 5" />
              </svg>
              Hub
            </a>
            <ThemeToggle />
            <div className="hidden md:block">
              <LogoutButton variant="secondary" />
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 pt-6 sm:px-6">
        <div>{children}</div>
      </main>

      <QuickAdd />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="scrollbar-thin mx-auto flex max-w-2xl gap-1 overflow-x-auto px-3 py-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex min-h-14 min-w-[4.75rem] flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 text-center text-[10px] font-semibold transition-colors",
                  active
                    ? "bg-accent text-white"
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
