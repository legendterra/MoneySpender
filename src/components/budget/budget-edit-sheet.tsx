"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { AmountDisplay } from "@/components/ui/amount-display";
import { AmountKeypad } from "@/components/ui/amount-keypad";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { formatMoney, toUiLocale } from "@/components/ui/format";
import { Sheet } from "@/components/ui/sheet";
import { budgetSuggestions } from "@/lib/budget-plan";
import { haptic } from "@/lib/haptics";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type BudgetEditTarget = {
  categoryId: string;
  categoryName: string;
  limit: number;
  spent: number;
  previousLimit: number;
  previousSpent: number;
};

/** Set, change or remove one category's limit for `month` (monthly_budgets). */
export function BudgetEditSheet({
  target,
  open,
  onOpenChange,
  month,
  monthLabel,
  userId,
  demo = false,
}: {
  target: BudgetEditTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  monthLabel: string;
  userId: string;
  demo?: boolean;
}) {
  const t = useTranslations("budget");
  const locale = toUiLocale(useLocale());
  const router = useRouter();
  const [amount, setAmount] = React.useState(target?.limit ?? 0);
  const [busy, setBusy] = React.useState<"save" | "remove" | null>(null);

  const suggestions = target
    ? budgetSuggestions({
        previousLimit: target.previousLimit,
        previousSpent: target.previousSpent,
        currentLimit: amount,
      })
    : [];

  async function save() {
    if (!target || amount <= 0) return;
    setBusy("save");
    if (!demo) {
      const { error } = await createBrowserSupabaseClient()
        .from("monthly_budgets")
        .upsert(
          { user_id: userId, category_id: target.categoryId, month, amount },
          { onConflict: "user_id,category_id,month" },
        );
      if (error) {
        setBusy(null);
        toast.error(t("saveFailed"), { description: `Supabase upsert on "monthly_budgets" failed: ${error.message}` });
        return;
      }
    }
    haptic("success");
    toast.success(t("saved", { name: target.categoryName, amount: formatMoney(amount, { locale }) }));
    setBusy(null);
    onOpenChange(false);
    router.refresh();
  }

  async function remove() {
    if (!target) return;
    setBusy("remove");
    if (!demo) {
      const { error } = await createBrowserSupabaseClient()
        .from("monthly_budgets")
        .delete()
        .eq("user_id", userId)
        .eq("category_id", target.categoryId)
        .eq("month", month);
      if (error) {
        setBusy(null);
        toast.error(t("removeFailed"), { description: `Supabase delete on "monthly_budgets" failed: ${error.message}` });
        return;
      }
    }
    toast.success(t("removed", { name: target.categoryName }));
    setBusy(null);
    onOpenChange(false);
    router.refresh();
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
            <Button variant="danger" onClick={() => void remove()} isLoading={busy === "remove"} disabled={busy !== null}>
              {t("remove")}
            </Button>
          ) : null}
          <Button
            className="flex-1"
            onClick={() => void save()}
            isLoading={busy === "save"}
            disabled={busy !== null || amount <= 0 || amount === target?.limit}
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
          <AmountKeypad value={amount} onChange={setAmount} onSubmit={() => void save()} captureKeyboard={open} />
        </div>
      ) : null}
    </Sheet>
  );
}
