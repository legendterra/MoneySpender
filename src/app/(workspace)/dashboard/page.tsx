import Link from "next/link";
import dynamic from "next/dynamic";

import { DebtOverview } from "@/components/dashboard/debt-overview";
import { SummaryStrip } from "@/components/dashboard/summary-strip";
import { TopTransactions } from "@/components/dashboard/top-transactions";
import { MonthFilter } from "@/components/month-filter";
import { PageHeading } from "@/components/page-heading";
import { buttonVariants } from "@/components/ui/button-styles";
import { Panel } from "@/components/ui/panel";
import { getDashboardData } from "@/lib/data";
import { cn, formatCurrency } from "@/lib/utils";

const DashboardCharts = dynamic(
  () => import("@/components/dashboard/charts").then((module) => module.DashboardCharts),
  {
    loading: () => <DashboardChartsFallback />,
  },
);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const data = await getDashboardData(params.month);
  const currency = data.profile.currency_code ?? "IDR";

  return (
    <div className="space-y-6 pb-10">
      <PageHeading
        eyebrow="Dashboard"
        title="Ringkasan laporan keuangan yang langsung enak dibaca."
        description="Semua tombol penting ada di atas, grafiknya fokus ke cashflow dan progress target tabungan, sementara daftar top 10 membantu Anda cepat tahu transaksi terbesar per bulan."
        right={<MonthFilter monthValue={data.monthValue} actionPath="/dashboard" />}
      />

      <Panel className="overflow-hidden">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent-strong">
              Quick actions
            </p>
            <h2 className="text-3xl font-bold text-foreground">
              {data.selectedMonthLabel} | Saldo {formatCurrency(data.summary.balance, currency)}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted">
              Gunakan tombol ini untuk masuk ke form pencatatan supaya alur pencatatan harian lebih cepat dari dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/income#form"
                prefetch={false}
                className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
              >
                Tambah pemasukan
              </Link>
              <Link
                href="/expenses#form"
                prefetch={false}
                className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
              >
                Tambah pengeluaran
              </Link>
              <Link
                href="/debts#form"
                prefetch={false}
                className={cn(buttonVariants({ variant: "danger", size: "lg" }))}
              >
                Tambah hutang
              </Link>
              <Link
                href="/all-transactions"
                prefetch={false}
                className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
              >
                Semua transaksi
              </Link>
            </div>
          </div>
          <div className="rounded-[28px] border border-border bg-background-strong p-5">
            <p className="text-sm font-semibold text-muted">Mood bulan ini</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[24px] bg-accent-soft p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-accent-strong">Pemasukan</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {formatCurrency(data.summary.income, currency)}
                </p>
              </div>
              <div className="rounded-[24px] bg-background p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Pengeluaran</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {formatCurrency(data.summary.expense, currency)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-muted">
              Goal tabungan aktif: {formatCurrency(data.goalProgress.currentMonthGoal, currency)} per bulan
              dan {formatCurrency(data.goalProgress.currentYearGoal, currency)} per tahun.
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              Hutang aktif: {formatCurrency(data.debtSummary.totalOutstanding, currency)} dengan{" "}
              {data.debtSummary.unpaidCount} catatan belum lunas.
            </p>
          </div>
        </div>
      </Panel>

      <SummaryStrip currencyCode={currency} stats={data.summary} debtSummary={data.debtSummary} />
      <DebtOverview currencyCode={currency} summary={data.debtSummary} debts={data.recentDebts} />
      <DashboardCharts
        currencyCode={currency}
        trendData={data.trendData}
        expenseBreakdown={data.expenseBreakdown}
        goals={data.goalProgress}
      />
      <TopTransactions currencyCode={currency} topIncome={data.topIncome} topExpense={data.topExpense} />
    </div>
  );
}

function DashboardChartsFallback() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
      <Panel className="h-[380px] animate-pulse bg-background-strong" />
      <div className="grid gap-4">
        <Panel className="h-[180px] animate-pulse bg-background-strong" />
        <Panel className="h-[300px] animate-pulse bg-background-strong" />
      </div>
    </div>
  );
}
