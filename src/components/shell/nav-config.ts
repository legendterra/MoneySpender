import {
  ChartColumn,
  HandCoins,
  House,
  LayoutGrid,
  PiggyBank,
  ReceiptText,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavKey =
  | "home"
  | "history"
  | "debts"
  | "wallets"
  | "budget"
  | "reports"
  | "settings"
  | "more";

export type ShellRoute = {
  href: string;
  key: NavKey;
  icon: LucideIcon;
  /** Shown in the desktop sidebar. */
  sidebar: boolean;
  /** Root screen on mobile (one of the bottom tabs). */
  mobileRoot: boolean;
  /** Shows the month switcher in the top bar. */
  month: boolean;
  /** Where the back button goes when there is no in-app history. */
  parent: string;
};

export const SHELL_ROUTES: ShellRoute[] = [
  { href: "/dashboard", key: "home", icon: House, sidebar: true, mobileRoot: true, month: true, parent: "/dashboard" },
  { href: "/history", key: "history", icon: ReceiptText, sidebar: true, mobileRoot: true, month: true, parent: "/dashboard" },
  { href: "/debts", key: "debts", icon: HandCoins, sidebar: true, mobileRoot: true, month: false, parent: "/dashboard" },
  { href: "/wallets", key: "wallets", icon: Wallet, sidebar: true, mobileRoot: false, month: false, parent: "/settings" },
  { href: "/budget", key: "budget", icon: PiggyBank, sidebar: true, mobileRoot: false, month: true, parent: "/settings" },
  { href: "/reports", key: "reports", icon: ChartColumn, sidebar: true, mobileRoot: false, month: false, parent: "/settings" },
  { href: "/settings", key: "settings", icon: Settings, sidebar: true, mobileRoot: true, month: false, parent: "/dashboard" },
];

export type TabItem =
  | { type: "link"; href: string; key: NavKey; icon: LucideIcon; match: string[] }
  | { type: "catat" };

/** Mobile bottom bar: Beranda | Riwayat | (+) | Hutang | Lainnya. */
export const TAB_ITEMS: TabItem[] = [
  { type: "link", href: "/dashboard", key: "home", icon: House, match: ["/dashboard"] },
  { type: "link", href: "/history", key: "history", icon: ReceiptText, match: ["/history"] },
  { type: "catat" },
  { type: "link", href: "/debts", key: "debts", icon: HandCoins, match: ["/debts"] },
  {
    type: "link",
    href: "/settings",
    key: "more",
    icon: LayoutGrid,
    match: ["/settings", "/wallets", "/budget", "/reports"],
  },
];

export function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The route a pathname belongs to; exact screens only (deeper paths are non-root). */
export function resolveRoute(pathname: string) {
  const exact = SHELL_ROUTES.find((route) => route.href === pathname);
  if (exact) return { route: exact, nested: false };
  const parent = SHELL_ROUTES.find((route) => matchesPath(pathname, route.href));
  return { route: parent ?? null, nested: true };
}
