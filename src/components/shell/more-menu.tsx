import Link from "next/link";
import { ChartColumn, ChevronRight, PiggyBank, Wallet, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ThemeToggle } from "@/components/theme-toggle";

type MoreItem = { href: string; label: string; hint: string; icon: LucideIcon };

/**
 * "Lainnya" list shown at the top of /settings on mobile, where the bottom bar has no
 * room for Dompet, Budget and Laporan. Hidden on desktop (the sidebar lists them).
 */
export function MoreMenu() {
  const t = useTranslations("nav");
  const ui = useTranslations("ui");
  const items: MoreItem[] = [
    { href: "/wallets", label: t("wallets"), hint: t("moreWalletsHint"), icon: Wallet },
    { href: "/budget", label: t("budget"), hint: t("moreBudgetHint"), icon: PiggyBank },
    { href: "/reports", label: t("reports"), hint: t("moreReportsHint"), icon: ChartColumn },
  ];

  return (
    <nav aria-label={t("moreTitle")} className="mb-6 lg:hidden">
      <ul className="divide-y divide-line overflow-hidden rounded-sheet border border-line bg-surface">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-[60px] items-center gap-3 px-4 outline-none transition-colors hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-2 text-text">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-[15px] font-medium text-text">{item.label}</span>
                  <span className="truncate text-[12px] text-muted">{item.hint}</span>
                </span>
                <ChevronRight className="size-[18px] shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
        <li className="flex min-h-[60px] items-center gap-3 px-4">
          <span className="min-w-0 flex-1 text-[15px] font-medium text-text">{ui("themeLabel")}</span>
          <ThemeToggle className="-mr-2" />
        </li>
      </ul>
    </nav>
  );
}
