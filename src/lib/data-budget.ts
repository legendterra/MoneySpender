import { getAuthedContext } from "@/lib/auth";
import {
  budgetListRows,
  buildBudgetBoard,
  planBudgetCopy,
  spendingByCategory,
  type BudgetCopyPlan,
  type BudgetListRow,
  type BudgetTotals,
} from "@/lib/budget-plan";
import { daysLeftInMonth, isMonthValue, monthRange, monthValueWIB, shiftMonth, todayWIB } from "@/lib/dates";
import { paginate } from "@/lib/paging";
import { expectRows, selectAllRows } from "@/lib/supabase/query";

// Server fetcher for /budget. Reads go through expectRows/selectAllRows so a
// schema problem names the table instead of rendering an empty screen.

export type BudgetPageData = {
  userId: string;
  month: string;
  previousMonth: string;
  isCurrentMonth: boolean;
  /** Days left including today (current month only). */
  daysLeft: number | null;
  totals: BudgetTotals;
  hasBudgets: boolean;
  /** One page (10) of the ordered category list. */
  rows: BudgetListRow[];
  page: number;
  totalPages: number;
  totalItems: number;
  /** Last month's limit and spending per category id, for edit suggestions. */
  previous: Record<string, { limit: number; spent: number }>;
  copyPlan: BudgetCopyPlan;
  hasCategories: boolean;
};

type CategoryRow = { id: string; name: string; color: string | null };
type BudgetRow = { category_id: string; month: string; amount: number | string };
type SpendRow = { type: string; amount: number | string; category_id: string | null; transaction_date: string };

export const BUDGET_PAGE_SIZE = 10;

export async function getBudgetPageData(requestedMonth?: string, requestedPage = 1): Promise<BudgetPageData> {
  const currentMonth = monthValueWIB();
  const month = isMonthValue(requestedMonth) && requestedMonth <= currentMonth ? requestedMonth : currentMonth;
  const previousMonth = shiftMonth(month, -1);
  const { start } = monthRange(previousMonth);
  const { end } = monthRange(month);
  const { supabase, user } = await getAuthedContext();

  const [categoriesResult, budgetsResult, spending] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,color")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .order("name", { ascending: true }),
    supabase
      .from("monthly_budgets")
      .select("category_id,month,amount")
      .eq("user_id", user.id)
      .in("month", [previousMonth, month]),
    selectAllRows<SpendRow>("transactions", () =>
      supabase
        .from("transactions")
        .select("type,amount,category_id,transaction_date")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("transaction_date", start)
        .lte("transaction_date", end)
        .order("transaction_date", { ascending: true })
        .order("id", { ascending: true }),
    ),
  ]);

  const categories = expectRows<CategoryRow>("categories", categoriesResult);
  const budgets = expectRows<BudgetRow>("monthly_budgets", budgetsResult);
  const current = budgets.filter((b) => b.month === month);
  const previousBudgets = budgets.filter((b) => b.month === previousMonth);
  const monthStart = monthRange(month).start;
  const isCurrentMonth = month === currentMonth;

  const previousSpent = spendingByCategory(spending.filter((t) => t.transaction_date < monthStart));
  const previous: BudgetPageData["previous"] = {};
  for (const category of categories) {
    const limit = Number(previousBudgets.find((b) => b.category_id === category.id)?.amount ?? 0);
    const spent = previousSpent.get(category.id) ?? 0;
    if (limit > 0 || spent > 0) previous[category.id] = { limit, spent };
  }

  const daysLeft = isCurrentMonth ? daysLeftInMonth(todayWIB()) : null;
  const board = buildBudgetBoard(
    categories,
    current,
    spending.filter((t) => t.transaction_date >= monthStart),
    daysLeft,
  );
  const paged = paginate(budgetListRows(board), requestedPage, BUDGET_PAGE_SIZE);

  return {
    userId: user.id,
    month,
    previousMonth,
    isCurrentMonth,
    daysLeft,
    totals: board.totals,
    hasBudgets: board.budgeted.length > 0,
    rows: paged.items,
    page: paged.page,
    totalPages: paged.totalPages,
    totalItems: paged.totalItems,
    previous,
    copyPlan: planBudgetCopy(previousBudgets, current, categories.map((c) => c.id), month),
    hasCategories: categories.length > 0,
  };
}
