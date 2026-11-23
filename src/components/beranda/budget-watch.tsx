import { useLocale, useTranslations } from "next-intl";

import { formatMoney, toUiLocale } from "@/components/ui/format";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils";

export type BudgetWatchItem = {
  categoryId: string | null;
  categoryName: string;
  spent: number;
  budget: number;
  /** Percentage, 0-100+. */
  ratio: number;
  status: "safe" | "warning" | "over";
};

/** Budgets near (>= 80%) or over the limit. Renders nothing when there are no budgets. */
export function BudgetWatch({ budgets, href = "/budget" }: { budgets: BudgetWatchItem[]; href?: string }) {
  const t = useTranslations("beranda");
  const locale = toUiLocale(useLocale());
  if (!budgets.length) return null;

  const flagged = budgets
    .filter((budget) => budget.status !== "safe")
    .sort((a, b) => b.ratio - a.ratio);
  const overCount = flagged.filter((budget) => budget.status === "over").length;
  const nearCount = flagged.length - overCount;
  const meta = [
    overCount ? t("budgetsOver", { count: overCount }) : null,
    nearCount ? t("budgetsNear", { count: nearCount }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-labelledby="budget-heading" className="grid gap-2">
      <SectionHeader
        id="budget-heading"
        title={t("budgets")}
        meta={meta || undefined}
        action={meta ? undefined : { label: t("seeAll"), href }}
      />
      {flagged.length ? (
        <ul className="grid gap-4">
          {flagged.map((budget) => (
            <li key={budget.categoryId ?? budget.categoryName} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="truncate font-medium text-text">{budget.categoryName}</span>
                <span
                  className={cn(
                    "shrink-0 font-semibold tabular-nums",
                    budget.status === "over" ? "text-expense" : "text-debt",
                  )}
                >
                  {budget.ratio}%
                </span>
              </div>
              <ProgressBar
                value={budget.spent}
                max={budget.budget}
                label={t("budgetProgress", { name: budget.categoryName })}
              />
              <p className="text-[12px] text-muted tabular-nums">
                {t("budgetUsed", {
                  spent: formatMoney(budget.spent, { locale }),
                  budget: formatMoney(budget.budget, { locale }),
                })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted">{t("budgetsAllSafe")}</p>
      )}
    </section>
  );
}
