import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-styles";
import { Panel } from "@/components/ui/panel";
import type { DebtRecord, DebtSummary } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export function DebtOverview({
  currencyCode,
  summary,
  debts,
}: {
  currencyCode: string;
  summary: DebtSummary;
  debts: DebtRecord[];
}) {
  return (
    <Panel className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted">Ringkasan hutang</p>
          <h2 className="text-2xl font-bold text-foreground">Pantau hutang aktif dari dashboard</h2>
        </div>
        <Link href="/debts#form" className={cn(buttonVariants({ variant: "secondary", size: "md" }))}>
          Tambah hutang
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[24px] border border-danger/20 bg-danger/8 p-5">
          <p className="text-sm font-semibold text-danger">Sisa Hutang bulan ini</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatCurrency(summary.currentMonthOutstanding, currencyCode)}
          </p>
          <p className="mt-3 text-sm leading-7 text-danger">
            Prioritaskan pelunasan secepatnya agar beban bulan depan tidak ikut menumpuk. Berhutang kembali hanya kalau benar-benar mendesak dan sudah ada rencana bayar yang jelas.
          </p>
        </div>
        <div className="space-y-3">
          {debts.length ? (
            debts.map((debt) => (
              <div
                key={debt.id}
                className="flex flex-col gap-2 rounded-[24px] border border-border bg-background-strong px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-base font-semibold text-foreground">{debt.lender_name}</p>
                  <p className="text-sm text-muted">Dari {debt.source_name} | {debt.reason}</p>
                  <p className="text-xs text-muted">Tanggal {formatDate(debt.debt_date)}</p>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(debt.amount, currencyCode)}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-border px-4 py-8 text-sm leading-7 text-muted">
              Tidak ada hutang aktif di bulan ini.
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
