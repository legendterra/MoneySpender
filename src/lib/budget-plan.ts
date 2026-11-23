import { budgetRatio } from "@/lib/budget";

// Pure math for the Budget screen (PLAN.md section 4, /budget). All inputs are
// already limited to one WIB month by the caller; nothing here reads the clock.

export type BudgetStatus = "none" | "safe" | "warning" | "over";

export type BudgetCategoryInput = { id: string; name: string; color?: string | null };
export type BudgetLimitInput = { category_id: string; amount: number | string };
export type BudgetSpendInput = { type: string; amount: number | string; category_id: string | null };

export type BudgetRow = {
  categoryId: string;
  categoryName: string;
  color: string | null;
  /** Monthly limit; 0 when the category has no budget. */
  limit: number;
  spent: number;
  /** limit - spent; negative when over. */
  remaining: number;
  /** Percentage of the limit used (rounded), 0 without a limit. */
  ratio: number;
  status: BudgetStatus;
  /** Safe spend per remaining day (current month only), null otherwise. */
  perDay: number | null;
};

export type BudgetTotals = {
  limit: number;
  /** Spending in categories that have a budget. */
  spent: number;
  remaining: number;
  ratio: number;
  status: BudgetStatus;
  perDay: number | null;
  overCount: number;
  nearCount: number;
  /** Spending this month in categories without a budget. */
  unbudgetedSpent: number;
};

export type BudgetBoard = {
  /** Categories with a limit, most urgent first. */
  budgeted: BudgetRow[];
  /** Categories without a limit that have spending, biggest first. */
  unbudgetedWithSpending: BudgetRow[];
  /** Categories without a limit and without spending, alphabetical. */
  idle: BudgetRow[];
  totals: BudgetTotals;
};

export function statusForRatio(limit: number, ratio: number): BudgetStatus {
  if (!(limit > 0)) return "none";
  if (ratio >= 100) return "over";
  if (ratio >= 80) return "warning";
  return "safe";
}

/** Whole rupiah per remaining day, never negative; null when daysLeft is unknown. */
export function perDayAllowance(remaining: number, daysLeft: number | null) {
  if (daysLeft === null || !(daysLeft > 0)) return null;
  return Math.max(0, Math.floor(remaining / daysLeft));
}

const statusRank: Record<BudgetStatus, number> = { over: 0, warning: 1, safe: 2, none: 3 };

/** Expense spending per category id. Income and uncategorised rows are ignored. */
export function spendingByCategory(transactions: BudgetSpendInput[]) {
  const spent = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.category_id) continue;
    const amount = Number(t.amount);
    if (!Number.isFinite(amount)) continue;
    spent.set(t.category_id, (spent.get(t.category_id) ?? 0) + amount);
  }
  return spent;
}

/**
 * Board for one month: rows per expense category with spent/limit, plus totals.
 * `daysLeft` (days remaining including today) is only passed for the current month.
 */
export function buildBudgetBoard(
  categories: BudgetCategoryInput[],
  budgets: BudgetLimitInput[],
  transactions: BudgetSpendInput[],
  daysLeft: number | null = null,
): BudgetBoard {
  const spent = spendingByCategory(transactions);
  const limits = new Map<string, number>();
  for (const budget of budgets) {
    const amount = Number(budget.amount);
    if (amount > 0) limits.set(budget.category_id, amount);
  }

  const rows: BudgetRow[] = categories.map((category) => {
    const limit = limits.get(category.id) ?? 0;
    const used = spent.get(category.id) ?? 0;
    const ratio = budgetRatio(used, limit);
    const remaining = limit - used;
    return {
      categoryId: category.id,
      categoryName: category.name,
      color: category.color ?? null,
      limit,
      spent: used,
      remaining,
      ratio,
      status: statusForRatio(limit, ratio),
      perDay: limit > 0 ? perDayAllowance(remaining, daysLeft) : null,
    };
  });

  const budgeted = rows
    .filter((row) => row.limit > 0)
    .sort(
      (a, b) =>
        statusRank[a.status] - statusRank[b.status] ||
        b.ratio - a.ratio ||
        a.categoryName.localeCompare(b.categoryName, "id"),
    );
  const unbudgetedWithSpending = rows
    .filter((row) => row.limit === 0 && row.spent > 0)
    .sort((a, b) => b.spent - a.spent);
  const idle = rows
    .filter((row) => row.limit === 0 && row.spent === 0)
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName, "id"));

  const limit = budgeted.reduce((sum, row) => sum + row.limit, 0);
  const used = budgeted.reduce((sum, row) => sum + row.spent, 0);
  const ratio = budgetRatio(used, limit);
  const remaining = limit - used;

  return {
    budgeted,
    unbudgetedWithSpending,
    idle,
    totals: {
      limit,
      spent: used,
      remaining,
      ratio,
      status: statusForRatio(limit, ratio),
      perDay: limit > 0 ? perDayAllowance(remaining, daysLeft) : null,
      overCount: budgeted.filter((row) => row.status === "over").length,
      nearCount: budgeted.filter((row) => row.status === "warning").length,
      unbudgetedSpent: unbudgetedWithSpending.reduce((sum, row) => sum + row.spent, 0),
    },
  };
}

export type BudgetCopyPlan = {
  /** Rows to upsert into monthly_budgets for the target month (without user_id). */
  rows: Array<{ category_id: string; month: string; amount: number }>;
  /** Previous budgets skipped because the target month already has a limit. */
  alreadySet: number;
  /** Previous budgets skipped because the category no longer exists. */
  missingCategory: number;
};

/**
 * "Salin dari bulan lalu": copies every positive limit of the previous month into
 * `month`, never overwriting a limit the user already set for `month`.
 */
export function planBudgetCopy(
  previous: BudgetLimitInput[],
  current: BudgetLimitInput[],
  categoryIds: Iterable<string>,
  month: string,
): BudgetCopyPlan {
  const valid = new Set(categoryIds);
  const existing = new Set(current.filter((b) => Number(b.amount) > 0).map((b) => b.category_id));
  const plan: BudgetCopyPlan = { rows: [], alreadySet: 0, missingCategory: 0 };
  const seen = new Set<string>();

  for (const budget of previous) {
    const amount = Math.round(Number(budget.amount));
    if (!(amount > 0) || seen.has(budget.category_id)) continue;
    seen.add(budget.category_id);
    if (!valid.has(budget.category_id)) {
      plan.missingCategory += 1;
    } else if (existing.has(budget.category_id)) {
      plan.alreadySet += 1;
    } else {
      plan.rows.push({ category_id: budget.category_id, month, amount });
    }
  }
  return plan;
}

/** Quick picks for the edit sheet: last month's limit and spending, rounded up to 10.000. */
export function budgetSuggestions(input: {
  previousLimit: number;
  previousSpent: number;
  currentLimit: number;
}): number[] {
  const roundUp = (value: number) => Math.ceil(value / 10_000) * 10_000;
  const candidates = [input.previousLimit, roundUp(input.previousSpent)];
  const out: number[] = [];
  for (const value of candidates) {
    if (value > 0 && value !== input.currentLimit && !out.includes(value)) out.push(value);
  }
  return out;
}
