"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { LogoMark } from "@/components/logo-mark";
import { LogoutButton } from "@/components/logout-button";
import { CatatProvider, useCatat } from "@/components/quick-add/catat-provider";
import type { CatatData } from "@/components/quick-add/types";
import { matchesPath, resolveRoute, SHELL_ROUTES, TAB_ITEMS } from "@/components/shell/nav-config";
import { ThemeToggle } from "@/components/theme-toggle";
import { jakartaMonthKey } from "@/components/ui/format";
import { IconButton } from "@/components/ui/icon-button";
import { MonthSwitcher } from "@/components/ui/month-switcher";
import { cn } from "@/lib/utils";

export type AppShellProps = {
  children: React.ReactNode;
  userEmail: string;
  userLabel: string;
  /** Categories, wallets, templates and contacts for the global Catat sheet. */
  catatData: CatatData;
  /** UI gallery: the Catat sheet never talks to Supabase. */
  demo?: boolean;
  /** UI gallery: render the shell as if this path were active. */
  demoPathname?: string;
};

export function AppShell({
  children,
  userEmail,
  userLabel,
  catatData,
  demo = false,
  demoPathname,
}: AppShellProps) {
  return (
    <CatatProvider data={catatData} demo={demo}>
      <ShellFrame userEmail={userEmail} userLabel={userLabel} demoPathname={demoPathname}>
        {children}
      </ShellFrame>
    </CatatProvider>
  );
}

function firstName(label: string) {
  const first = label.trim().split(/\s+/)[0] ?? "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : label;
}

function ShellFrame({
  children,
  userEmail,
  userLabel,
  demoPathname,
}: {
  children: React.ReactNode;
  userEmail: string;
  userLabel: string;
  demoPathname?: string;
}) {
  const realPathname = usePathname();
  const pathname = demoPathname ?? realPathname;
  const router = useRouter();
  const t = useTranslations("nav");
  const ui = useTranslations("ui");
  const beranda = useTranslations("beranda");
  const { open } = useCatat();

  const initialPath = React.useRef(pathname);
  const navigated = React.useRef(false);
  React.useEffect(() => {
    if (pathname !== initialPath.current) navigated.current = true;
  }, [pathname]);

  const { route, nested } = resolveRoute(pathname);
  const title =
    route?.key === "home" && !nested
      ? beranda("greeting", { name: firstName(userLabel) })
      : route
        ? t(route.key)
        : "MoneySpender";
  const backMobile = nested || !route || !route.mobileRoot;
  const backDesktop = nested || !route || !route.sidebar;
  const parent = nested && route ? route.href : (route?.parent ?? "/dashboard");

  function goBack() {
    if (navigated.current) router.back();
    else router.push(parent);
  }

  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#main"
        className="sr-only z-[70] rounded-chip bg-primary px-4 py-3 font-semibold text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t("skipToContent")}
      </a>

      <Sidebar
        pathname={pathname}
        userEmail={userEmail}
        userLabel={userLabel}
        onCatat={() => open()}
      />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-line bg-bar pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:border-transparent lg:bg-bg/90">
          <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center gap-2 px-4 md:px-6 lg:h-[72px] lg:px-10">
            <IconButton
              label={ui("back")}
              onClick={goBack}
              className={cn("-ml-2", backMobile ? "flex" : "hidden", backDesktop ? "lg:flex" : "lg:hidden")}
            >
              <ChevronLeft aria-hidden="true" />
            </IconButton>
            <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight text-text lg:text-[22px] lg:font-bold">
              {title}
            </h1>
            {route?.month && !nested ? (
              <React.Suspense fallback={<div className="h-10 w-[13.5rem] rounded-control border border-line bg-surface" />}>
                <HeaderMonth pathname={realPathname} />
              </React.Suspense>
            ) : null}
          </div>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1120px] px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] outline-none md:px-6 md:pt-6 lg:px-10 lg:pt-2 lg:pb-16"
        >
          {children}
        </main>
      </div>

      <TabBar pathname={pathname} onCatat={() => open()} />
    </div>
  );
}

function HeaderMonth({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const requested = searchParams.get("month");
  const current = jakartaMonthKey();
  const value = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : current;
  return <MonthSwitcher value={value} basePath={pathname} />;
}

function Sidebar({
  pathname,
  userEmail,
  userLabel,
  onCatat,
}: {
  pathname: string;
  userEmail: string;
  userLabel: string;
  onCatat: () => void;
}) {
  const t = useTranslations("nav");

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 pt-6 pb-4 lg:flex">
      <Link href="/dashboard" className="rounded-chip px-2 outline-none focus-visible:outline-2 focus-visible:outline-ring">
        <LogoMark />
      </Link>

      <button
        type="button"
        onClick={onCatat}
        aria-haspopup="dialog"
        className="mt-6 flex min-h-12 items-center gap-2 rounded-control border border-primary-edge/50 bg-primary px-4 text-[15px] font-semibold text-on-primary transition-[filter,transform] outline-none hover:brightness-[1.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] dark:border-primary"
      >
        <Plus className="size-5" aria-hidden="true" />
        {t("catat")}
        <kbd
          className="ml-auto rounded-[6px] border border-on-primary/25 px-1.5 py-0.5 font-sans text-[11px] font-semibold"
          aria-label={t("catatShortcut")}
        >
          N
        </kbd>
      </button>

      <nav aria-label={t("mainNav")} className="mt-6 min-h-0 flex-1 overflow-y-auto">
        <ul className="grid gap-0.5">
          {SHELL_ROUTES.map((item) => {
            const active = matchesPath(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-control px-3 text-[14px] font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-ring",
                    active ? "bg-surface-2 font-semibold text-text" : "text-muted hover:bg-surface-2/60 hover:text-text",
                  )}
                >
                  <Icon
                    className={cn("size-5 shrink-0", active ? "text-primary-ink" : "")}
                    aria-hidden="true"
                    strokeWidth={active ? 2.2 : 1.9}
                  />
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-[13px] font-bold text-text"
        >
          {(userLabel.trim().charAt(0) || "?").toUpperCase()}
        </span>
        <div className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate text-[13px] font-semibold text-text capitalize">{userLabel}</span>
          <span className="truncate text-[12px] text-muted">{userEmail}</span>
        </div>
        <ThemeToggle />
        <LogoutButton iconOnly />
      </div>
    </aside>
  );
}

function TabBar({ pathname, onCatat }: { pathname: string; onCatat: () => void }) {
  const t = useTranslations("nav");

  return (
    <nav
      aria-label={t("tabNav")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bar pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-stretch px-2">
        {TAB_ITEMS.map((item) => {
          if (item.type === "catat") {
            return (
              <li key="catat" className="flex items-start justify-center">
                <button
                  type="button"
                  onClick={onCatat}
                  aria-haspopup="dialog"
                  aria-label={t("catatLong")}
                  className="-mt-5 grid size-14 place-items-center rounded-[18px] bg-primary text-on-primary shadow-fab ring-4 ring-bg transition-transform outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95"
                >
                  <Plus className="size-7" strokeWidth={2.4} aria-hidden="true" />
                </button>
              </li>
            );
          }
          const active = item.match.some((href) => matchesPath(pathname, href));
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-control text-[11px] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                  active ? "font-semibold text-text" : "font-medium text-muted hover:text-text",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-12 place-items-center rounded-full transition-colors",
                    active && "bg-surface-2",
                  )}
                >
                  <Icon
                    className={cn("size-[21px]", active && "text-primary-ink")}
                    strokeWidth={active ? 2.2 : 1.9}
                    aria-hidden="true"
                  />
                </span>
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
