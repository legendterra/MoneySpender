"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  HandCoins,
  LayoutGrid,
  ScrollText,
  Settings2,
} from "lucide-react";

import { LogoMark } from "@/components/logo-mark";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const iconsByHref = {
  "/dashboard": LayoutGrid,
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
        <div className="glass-panel mx-auto flex max-w-7xl items-center justify-between rounded-[30px] px-4 py-3 sm:px-5">
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
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-accent text-white shadow-[0_16px_38px_rgba(57,112,242,0.25)]"
                      : "text-muted hover:bg-accent-soft hover:text-foreground",
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
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="glass-panel grid w-full grid-cols-3 gap-2 rounded-[28px] px-3 py-3">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-center text-[11px] font-semibold transition",
                  active
                    ? "bg-accent text-white shadow-[0_16px_38px_rgba(57,112,242,0.2)]"
                    : "text-muted hover:bg-accent-soft hover:text-foreground",
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
