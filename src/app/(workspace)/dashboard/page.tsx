import { getLocale, getTranslations } from "next-intl/server";

import { BerandaView } from "@/components/beranda/beranda-view";
import { toTodayItems } from "@/components/beranda/map-today";
import { OfflineSnapshotCache } from "@/components/pwa/offline-snapshot-cache";
import { daysLeftInMonth, formatMonthLabel, jakartaDateKey, toUiLocale } from "@/components/ui/format";
import { getDashboardData } from "@/lib/data";
import { getTodayActivity } from "@/lib/shell-data";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const [data, today, t, locale] = await Promise.all([
    getDashboardData(params.month),
    getTodayActivity(),
    getTranslations("beranda"),
    getLocale(),
  ]);

  const todayKey = jakartaDateKey();
  const isCurrentMonth = data.monthValue === todayKey.slice(0, 7);

  // TODO(v2-merge): use data.allowance from getDashboardData (src/lib/allowance.ts).
  // Temporary inline version of PLAN.md 4.1 without upcoming recurring and reserve.
  const liquidNow = data.wallets
    .filter((wallet) => wallet.kind !== "card" && !wallet.is_archived)
    .reduce((sum, wallet) => sum + wallet.balance, 0);
  const liquidAtStartOfDay = liquidNow + today.spent - today.income;
  const daysLeft = daysLeftInMonth(todayKey);
  const allowanceToday = Math.max(0, Math.floor(liquidAtStartOfDay / daysLeft));
  const tomorrowAllowance =
    daysLeft > 1 ? Math.max(0, Math.floor((liquidAtStartOfDay - today.spent) / (daysLeft - 1))) : 0;

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
          isCurrentMonth
            ? {
                allowanceToday,
                spentToday: today.spent,
                remainingToday: allowanceToday - today.spent,
                tomorrowAllowance,
                daysLeft,
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
        today={{ items: toTodayItems(today.items, t), spentTotal: today.spent }}
        budgets={data.budgetAlerts}
        savings={{
          saved: data.goalProgress.currentMonthSaved,
          goal: data.goalProgress.currentMonthGoal,
        }}
      />
    </>
  );
}
