import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { SETTINGS_SECTIONS, type SettingsSlug } from "@/components/pengaturan/settings-sections";
import { formatMoney, toUiLocale } from "@/components/ui/format";
import { formatHour } from "@/lib/notification-settings";
import type { ProfileData, ReminderPreferences } from "@/lib/types";

const row =
  "flex min-h-[60px] w-full items-center gap-3 py-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Mobile /settings ("Lainnya" tab): the screens that do not fit the bottom bar,
 * then the Pengaturan sections. Plain rows with dividers, each opens its route.
 */
export function SettingsMenu({
  profile,
  reminder,
  counts,
  email,
  locale,
}: {
  profile: ProfileData;
  reminder: ReminderPreferences;
  counts: { categories: number; recurring: number; templates: number };
  email: string;
  locale: string;
}) {
  const t = useTranslations("pengaturan");
  const nav = useTranslations("nav");
  const uiLocale = toUiLocale(locale);
  const goal = Number(profile.monthly_savings_goal ?? 0);

  const hints: Partial<Record<SettingsSlug, string>> = {
    profil: profile.full_name || email,
    tampilan: uiLocale === "en" ? "English" : "Bahasa Indonesia",
    tabungan: goal > 0 ? t("menuGoal", { amount: formatMoney(goal, { locale: uiLocale }) }) : t("menuNoGoal"),
    kategori: t("menuCount", { count: counts.categories }),
    berulang: t("menuActive", { count: counts.recurring }),
    template: t("menuCount", { count: counts.templates }),
    notifikasi: reminder.push_enabled
      ? t("menuNotifOn", {
          from: formatHour(reminder.active_start, uiLocale),
          to: formatHour(reminder.active_end, uiLocale),
        })
      : t("menuNotifOff"),
    data: t("menuData"),
    pasang: t("menuInstall"),
    akun: email,
  };

  const more = [
    { href: "/wallets", label: nav("wallets"), hint: nav("moreWalletsHint") },
    { href: "/budget", label: nav("budget"), hint: nav("moreBudgetHint") },
    { href: "/reports", label: nav("reports"), hint: nav("moreReportsHint") },
  ];

  return (
    <div className="grid gap-8">
      <nav aria-label={nav("moreTitle")}>
        <ul className="divide-y divide-line border-y border-line">
          {more.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={row}>
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-[16px] font-semibold text-text">{item.label}</span>
                  <span className="truncate text-[13px] text-muted">{item.hint}</span>
                </span>
                <ChevronRight className="size-[18px] shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-labelledby="settings-menu-title" className="grid gap-2">
        <h2 id="settings-menu-title" className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">
          {nav("settings")}
        </h2>
        <ul className="divide-y divide-line border-y border-line">
          {SETTINGS_SECTIONS.map((section) => (
            <li key={section.slug}>
              <Link href={section.href} className={row}>
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-[15px] font-medium text-text">{t(section.key)}</span>
                  {hints[section.slug] ? (
                    <span className="truncate text-[13px] text-muted">{hints[section.slug]}</span>
                  ) : null}
                </span>
                <ChevronRight className="size-[18px] shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
