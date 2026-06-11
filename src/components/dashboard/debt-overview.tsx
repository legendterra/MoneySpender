import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-styles";
import { Panel } from "@/components/ui/panel";
import type { DebtRecord, DebtSummary } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export function DebtOverview({
  currencyCode,
  summary,
  debts,
}: {
  currencyCode: string;
  summary: DebtSummary;
  debts: DebtRecord[];
}) {
  const hasDebts = debts.length > 0;
  const hasLiability = summary.totalPayable > 0;
  const hasReceivable = summary.totalReceivable > 0;

  return (
    <Panel className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted">Hutang &amp; Piutang</p>
          <h2 className="text-2xl font-bold text-foreground">Posisi kewajiban aktif</h2>
        </div>
        <Link
          href="/debts#form"
          prefetch={false}
          className={cn(buttonVariants({ variant: "secondary", size: "md" }))}
        >
          Tambah catatan
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Hutang (payable) */}
        <div className="rounded-lg border border-danger/20 bg-danger/8 p-5">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="size-4 text-danger" />
            <p className="text-sm font-semibold text-danger">Hutang (kamu bayar)</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatCurrency(summary.totalPayable, currencyCode)}
          </p>
          <p className="mt-2 text-xs leading-6 text-muted">
            Mengurangi Net Worth kamu. Prioritaskan yang paling dekat jatuh temponya.
          </p>
        </div>

        {/* Piutang (receivable) */}
        <div className="rounded-lg border border-accent/20 bg-accent-soft p-5">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="size-4 text-accent" />
            <p className="text-sm font-semibold text-accent">Piutang (orang lain bayar)</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatCurrency(summary.totalReceivable, currencyCode)}
          </p>
          <p className="mt-2 text-xs leading-6 text-muted">
            Menambah Net Worth kamu sementara belum dibayar.
          </p>
        </div>
      </div>

      {/* Recent debts */}
      <div className="space-y-3">
        {hasDebts ? (
          debts.map((debt) => (
            <div
              key={debt.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-background-strong px-4 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-full p-1 ${debt.direction === "payable" ? "bg-danger/10" : "bg-accent-soft"}`}>
                  {debt.direction === "payable"
                    ? <ArrowUpRight className="size-3.5 text-danger" />
                    : <ArrowDownLeft className="size-3.5 text-accent" />
                  }
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{debt.contact_name}</p>
                  <p className="text-sm text-muted">{debt.reason}</p>
                  <p className="text-xs text-muted">{formatDate(debt.debt_date)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">{formatCurrency(debt.amount, currencyCode)}</p>
                <p className={`text-xs font-semibold ${debt.direction === "payable" ? "text-danger" : "text-accent"}`}>
                  {debt.direction === "payable" ? "Hutang" : "Piutang"}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm leading-7 text-muted">
            {!hasLiability && !hasReceivable
              ? "Tidak ada hutang atau piutang aktif. Kondisi keuangan bersih."
              : "Tidak ada hutang baru bulan ini."}
          </div>
        )}
      </div>
    </Panel>
  );
}
