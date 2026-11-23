import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import type { TransactionRecord } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

function TransactionBlock({
  title,
  records,
  currencyCode,
  type,
}: {
  title: string;
  records: TransactionRecord[];
  currencyCode: string;
  type: "income" | "expense";
}) {
  const Icon = type === "income" ? ArrowDownLeft : ArrowUpRight;

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-muted">{title}</p>
          <h2 className="text-2xl font-bold text-foreground">
            10 {type === "income" ? "pemasukan" : "pengeluaran"} terbesar
          </h2>
        </div>
        <div className="rounded-md bg-accent-soft p-3 text-accent-strong">
          <Icon className="size-5" />
        </div>
      </div>
      <div className="scrollbar-thin max-h-[430px] space-y-3 overflow-auto pr-1">
        {records.length ? (
          records.map((record, index) => (
            <div
              key={record.id}
              className="grid gap-2 rounded-md border border-border/70 bg-background-strong px-4 py-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {index + 1}. {record.category_label || "Tanpa kategori"}
                  </p>
                  <p className="text-xs text-muted">{record.reason || "Tanpa catatan"}</p>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {formatCurrency(record.amount, currencyCode)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{formatDate(record.transaction_date)}</span>
                {record.merchant ? <span>• {record.merchant}</span> : null}
                {record.wallet_label ? <span>• {record.wallet_label}</span> : null}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border px-4 py-6 text-sm leading-7 text-muted">
            Belum ada data bulan ini.
          </p>
        )}
      </div>
    </Panel>
  );
}

export function TopTransactions({
  currencyCode,
  topIncome,
  topExpense,
}: {
  currencyCode: string;
  topIncome: TransactionRecord[];
  topExpense: TransactionRecord[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <TransactionBlock
        title="Paling besar"
        records={topIncome}
        currencyCode={currencyCode}
        type="income"
      />
      <TransactionBlock
        title="Paling besar"
        records={topExpense}
        currencyCode={currencyCode}
        type="expense"
      />
    </div>
  );
}
