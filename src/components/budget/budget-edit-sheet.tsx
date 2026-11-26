"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";

import { AmountDisplay } from "@/components/ui/amount-display";
import { AmountKeypad } from "@/components/ui/amount-keypad";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { formatMoney, toUiLocale } from "@/components/ui/format";
import { Sheet } from "@/components/ui/sheet";
import { budgetSuggestions } from "@/lib/budget-plan";

export type BudgetEditTarget = {
  categoryId: string;
  categoryName: string;
  limit: number;
  spent: number;
  previousLimit: number;
  previousSpent: number;
};

/** Set, change or remove one category's limit. The parent performs the write (optimistically). */
export function BudgetEditSheet({
  target,
  open,
  onOpenChange,
  monthLabel,
  onSave,
  onRemove,
}: {
  target: BudgetEditTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthLabel: string;
  onSave: (amount: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("budget");
  const locale = toUiLocale(useLocale());
  const [amount, setAmount] = React.useState(target?.limit ?? 0);

  const suggestions = target
    ? budgetSuggestions({
        previousLimit: target.previousLimit,
        previousSpent: target.previousSpent,
        currentLimit: amount,
      })
    : [];

  function save() {
    if (!target || amount <= 0 || amount === target.limit) return;
    onSave(amount);
  }

  function remove() {
    if (target) onRemove();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={target?.categoryName ?? t("editTitle")}
      description={t("editDescription", { month: monthLabel })}
      size="sm"
      footer={
        <div className="flex gap-2">
          {target && target.limit > 0 ? (
            <Button variant="danger" onClick={remove}>
              {t("remove")}
            </Button>
          ) : null}
          <Button
            className="flex-1"
            onClick={save}
            disabled={amount <= 0 || amount === target?.limit}
          >
            {t("save")}
          </Button>
        </div>
      }
    >
      {target ? (
        <div className="grid gap-4 pt-2">
          <div className="grid gap-1 text-center">
            <AmountDisplay value={amount} placeholder label={t("limitLabel")} />
            <p className="text-[13px] text-muted tabular-nums">
              {t("spentSoFar", { amount: formatMoney(target.spent, { locale }) })}
            </p>
          </div>
          {suggestions.length ? (
            <ChipGroup label={t("suggestions")} className="justify-center">
              {suggestions.map((value) => (
                <Chip key={value} onClick={() => setAmount(value)} selected={amount === value}>
                  {value === target.previousLimit
                    ? t("suggestLastLimit", { amount: formatMoney(value, { locale, compact: true }) })
                    : t("suggestLastSpent", { amount: formatMoney(value, { locale, compact: true }) })}
                </Chip>
              ))}
            </ChipGroup>
          ) : null}
          <AmountKeypad value={amount} onChange={setAmount} onSubmit={save} captureKeyboard={open} />
        </div>
      ) : null}
    </Sheet>
  );
}
