import { getLocale, getTranslations } from "next-intl/server";

import { BerandaView } from "@/components/beranda/beranda-view";
import { toTodayItems } from "@/components/beranda/map-today";
import { TODAY_LIMIT } from "@/components/beranda/today-list";
import { OfflineSnapshotCache } from "@/components/pwa/offline-snapshot-cache";
import { formatMonthLabel, toUiLocale } from "@/components/ui/format";
import { getBerandaData } from "@/lib/data-beranda";
import { getTodayEntries } from "@/lib/data-history";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  // Independent reads in parallel: Beranda totals/balances and today's newest rows.
  const [data, today, t, locale] = await Promise.all([
    getBerandaData(params.month),
    getTodayEntries(TODAY_LIMIT),
    getTranslations("riwayat"),
    getLocale(),
  ]);
  const monthLabel = formatMonthLabel(data.monthValue, toUiLocale(locale));
  // PLAN.md 4.1, computed server-side in src/lib/allowance.ts (recurring and reserve included).
  const { allowance } = data;

  return (
    <>
      <OfflineSnapshotCache
        name="dashboard"
        payload={{
          currency: data.currency,
          month: monthLabel,
          income: data.month.income,
          expense: data.month.expense,
          balance: data.month.balance,
          debt: data.payableRemaining,
        }}
      />
      <BerandaView
        allowance={
          allowance
            ? {
                allowanceToday: allowance.allowanceToday,
                spentToday: allowance.spentToday,
                remainingToday: allowance.remainingToday,
                tomorrowAllowance: allowance.tomorrowAllowance ?? 0,
                daysLeft: allowance.daysLeft,
              }
            : null
        }
        month={{ label: monthLabel, income: data.month.income, expense: data.month.expense }}
        wallets={data.wallets.map((wallet) => ({
          id: wallet.id,
          name: wallet.name,
          kind: wallet.kind,
          balance: wallet.balance,
        }))}
        today={{
          items: toTodayItems(today.entries, t),
          spentTotal: allowance?.spentToday ?? 0,
          total: today.total,
          date: today.today,
        }}
        budgets={data.budgets}
        savings={data.savings}
      />
    </>
  );
}
