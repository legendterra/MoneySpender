import { ArrowDownLeft, ArrowUpRight, PiggyBank, ReceiptText, Wallet } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import type { DebtSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatCompactCurrency } from "@/lib/utils";

const icons = {
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  balance: Wallet,
  savingsRate: PiggyBank,
  totalDebt: ReceiptText,
  currentMonthDebt: ReceiptText,
};

type SummaryItem = {
  key: keyof typeof icons;
  label: string;
  value: string;
  note: string;
  noteClassName?: string;
};

export function SummaryStrip({
  currencyCode,
  stats,
  debtSummary,
}: {
  currencyCode: string;
  stats: {
    income: number;
    expense: number;
    balance: number;
    savingsRate: number;
  };
  debtSummary: DebtSummary;
}) {
  const items: SummaryItem[] = [
    {
      key: "income",
      label: "Total pemasukan",
      value: formatCompactCurrency(stats.income, currencyCode),
      note: "Akumulasi bulan terpilih",
    },
    {
      key: "expense",
      label: "Total pengeluaran",
      value: formatCompactCurrency(stats.expense, currencyCode),
      note: "Termasuk semua kategori aktif",
    },
    {
      key: "balance",
      label: "Sisa saldo bulan ini",
      value: formatCompactCurrency(stats.balance, currencyCode),
      note: stats.balance >= 0 ? "Masih sehat untuk ditabung" : "Belanja melampaui pemasukan",
    },
    {
      key: "savingsRate",
      label: "Rasio menabung",
      value: `${stats.savingsRate}%`,
      note: "Persentase sisa dari pemasukan",
    },
    {
      key: "totalDebt",
      label: "Total Hutang",
      value: formatCompactCurrency(debtSummary.totalOutstanding, currencyCode),
      note: "Akumulasi seluruh hutang yang belum lunas",
    },
    {
      key: "currentMonthDebt",
      label: "Sisa Hutang bulan ini",
      value: formatCompactCurrency(debtSummary.currentMonthOutstanding, currencyCode),
      note: "Prioritaskan pelunasan bulan ini agar arus kas tetap sehat. Tambah hutang baru hanya saat benar-benar perlu.",
      noteClassName: "text-danger",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = icons[item.key];

        return (
          <Panel key={item.key} className="relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted">{item.label}</p>
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className={cn("text-xs leading-6 text-muted", item.noteClassName)}>{item.note}</p>
              </div>
              <div className="rounded-2xl bg-white/30 p-3 text-accent-strong shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:bg-white/8">
                <Icon className="size-5" />
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
