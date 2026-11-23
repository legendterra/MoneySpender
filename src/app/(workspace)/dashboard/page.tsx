import { getLocale, getTranslations } from "next-intl/server";

import { BerandaView } from "@/components/beranda/beranda-view";
import { toTodayItems } from "@/components/beranda/map-today";
import { OfflineSnapshotCache } from "@/components/pwa/offline-snapshot-cache";
import { formatMonthLabel, toUiLocale } from "@/components/ui/format";
import { getDashboardData } from "@/lib/data";
import { getTodayEntries } from "@/lib/data-history";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const [data, today, t, locale] = await Promise.all([
    getDashboardData(params.month),
    getTodayEntries(),
    getTranslations("riwayat"),
    getLocale(),
  ]);

  // PLAN.md 4.1, computed server-side in src/lib/allowance.ts (recurring and reserve included).
  const { allowance } = data;

  return (
    <>
      <OfflineSnapshotCache
        name="dashboard"
        payload={{
          currency: data.profile.currency_code ?? "IDR",
          month: data.selectedMonthLabel,
          income: data.summary.income,
          expense: data.summary.expense,
          balance: data.summary.balance,
          debt: data.debtSummary.totalOutstanding,
        }}
      />
      <BerandaView
        allowance={
          data.isCurrentMonth
            ? {
                allowanceToday: allowance.allowanceToday,
                spentToday: allowance.spentToday,
                remainingToday: allowance.remainingToday,
                tomorrowAllowance: allowance.tomorrowAllowance ?? 0,
                daysLeft: allowance.daysLeft,
              }
            : null
        }
        month={{
          label: formatMonthLabel(data.monthValue, toUiLocale(locale)),
          income: data.summary.income,
          expense: data.summary.expense,
        }}
        wallets={data.wallets.map((wallet) => ({
          id: wallet.id,
          name: wallet.name,
          kind: wallet.kind,
          balance: wallet.balance,
        }))}
        today={{ items: toTodayItems(today.entries, t), spentTotal: allowance.spentToday }}
        budgets={data.budgetAlerts}
        savings={{
          saved: data.goalProgress.currentMonthSaved,
          goal: data.goalProgress.currentMonthGoal,
        }}
      />
    </>
  );
}
