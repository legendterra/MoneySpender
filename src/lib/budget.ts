import type { BudgetAlert, Category, MonthlyBudget } from "@/lib/types";

type BudgetTransaction = { type: "income" | "expense"; amount: number; category_id: string | null };

export function budgetRatio(spent: number, budget: number) {
  if (!(budget > 0)) return 0;
  return Math.round((spent / budget) * 100);
}

export function budgetStatus(ratio: number): BudgetAlert["status"] {
  return ratio >= 100 ? "over" : ratio >= 80 ? "warning" : "safe";
}

/** Highest crossed notification threshold (80 / 100), or 0 below 80%. */
export function budgetThreshold(ratio: number): 0 | 80 | 100 {
  return ratio >= 100 ? 100 : ratio >= 80 ? 80 : 0;
}

/** `transactions` must already be limited to the budget month. */
export function computeBudgetAlerts(
  transactions: BudgetTransaction[],
  budgets: Pick<MonthlyBudget, "category_id" | "amount">[],
  categories: Pick<Category, "id" | "name">[],
): BudgetAlert[] {
  if (!budgets.length) return [];
  const spentByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.category_id) continue;
    spentByCategory.set(t.category_id, (spentByCategory.get(t.category_id) ?? 0) + (Number(t.amount) || 0));
  }

  return budgets
    .filter((budget) => Number(budget.amount) > 0)
    .map((budget) => {
      const spent = spentByCategory.get(budget.category_id) ?? 0;
      const amount = Number(budget.amount);
      const ratio = budgetRatio(spent, amount);
      return {
        categoryId: budget.category_id,
        categoryName: categories.find((category) => category.id === budget.category_id)?.name ?? "Kategori",
        spent,
        budget: amount,
        ratio,
        status: budgetStatus(ratio),
      } satisfies BudgetAlert;
    })
    .sort((a, b) => b.ratio - a.ratio);
}
