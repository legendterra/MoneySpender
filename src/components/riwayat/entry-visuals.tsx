import { ArrowLeftRight, HandCoins, Undo2, type LucideIcon } from "lucide-react";
import { useLocale } from "next-intl";

import { formatAmountNumber, toUiLocale } from "@/components/ui/format";
import { RowAvatar, type RowTone } from "@/components/ui/list-row";
import type { HistoryEntry, HistoryFlow, HistoryKind } from "@/lib/history";
import { cn } from "@/lib/utils";

export const kindTone: Record<HistoryKind, RowTone> = {
  expense: "expense",
  income: "income",
  transfer: "transfer",
  debt: "debt",
  debt_payment: "debt",
};

const kindIcon: Partial<Record<HistoryKind, LucideIcon>> = {
  transfer: ArrowLeftRight,
  debt: HandCoins,
  debt_payment: Undo2,
};

export function EntryAvatar({ entry, label }: { entry: Pick<HistoryEntry, "kind">; label: string }) {
  return <RowAvatar tone={kindTone[entry.kind]} label={label} icon={kindIcon[entry.kind]} />;
}

/** Signed amount without the currency prefix, as in Beranda's "Hari ini" list. */
export function FlowAmount({ amount, flow, className }: { amount: number; flow: HistoryFlow; className?: string }) {
  const locale = toUiLocale(useLocale());
  const sign = flow === "in" ? "+" : flow === "out" ? "\u2212" : "";
  return (
    <span
      className={cn(
        "tabular-nums tracking-tight whitespace-nowrap",
        flow === "in" ? "text-income" : flow === "out" ? "text-expense" : "text-transfer",
        className,
      )}
    >
      {sign}
      {formatAmountNumber(amount, locale)}
    </span>
  );
}
