import { getAuthedContext } from "@/lib/auth";
import { computeAllowance } from "@/lib/allowance";
import { computeBudgetAlerts } from "@/lib/budget";
import { isMonthValue, monthRange, monthValueWIB, todayWIB } from "@/lib/dates";
import {
  BUDGET_COLUMNS,
  CATEGORY_COLUMNS,
  TRANSACTION_SUM_COLUMNS,
  balancesFromLean,
  fetchBalanceData,
  fetchProfile,
  fetchRecurring,
} from "@/lib/finance-data";
import { expectRows, selectAllRows } from "@/lib/supabase/query";
import type { Category, MonthlyBudget } from "@/lib/types";

type Row = Record<string, unknown>;

/**
 * Beranda (PLAN.md section 4, 4.1): only what the screen shows. Wallet
 * balances come from lean columns; month totals and budgets from the selected
 * month's lean transactions; every query runs in parallel.
 */
export async function getBerandaData(month?: string) {
  const today = todayWIB();
  const currentMonth = monthValueWIB();
  const monthValue = isMonthValue(month) && month <= currentMonth ? month : currentMonth;
  const isCurrentMonth = monthValue === currentMonth;
  const range = monthRange(monthValue);
  const { supabase, user } = await getAuthedContext();

  const [profile, balanceData, monthRows, categories, budgets, recurring] = await Promise.all([
    fetchProfile(supabase, user.id),
    fetchBalanceData(supabase, user.id),
    selectAllRows<Row>("transactions", () =>
      supabase
        .from("transactions")
        .select(TRANSACTION_SUM_COLUMNS)
        .eq("user_id", user.id)
        .gte("transaction_date", range.start)
        .lte("transaction_date", range.end)
        .order("id", { ascending: true }),
    ),
    supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("user_id", user.id)
      .eq("type", "expense")
      .then((result) => expectRows<Category>("categories", result)),
    supabase
      .from("monthly_budgets")
      .select(BUDGET_COLUMNS)
      .eq("user_id", user.id)
      .eq("month", monthValue)
      .then((result) => expectRows<MonthlyBudget>("monthly_budgets", result)),
    isCurrentMonth ? fetchRecurring(supabase, user.id, { activeOnly: true }) : Promise.resolve([]),
  ]);

  const monthTx = monthRows.map((row) => ({
    type: row.type === "income" ? ("income" as const) : ("expense" as const),
    amount: Number(row.amount) || 0,
    category_id: row.category_id === null || row.category_id === undefined ? null : String(row.category_id),
    transaction_date: String(row.transaction_date),
  }));
  const income = monthTx.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

  const wallets = balancesFromLean(balanceData);
  const allowance = isCurrentMonth
    ? computeAllowance({
        today,
        walletsAtStartOfToday: balancesFromLean(balanceData, { before: today }),
        transactions: monthTx,
        recurring,
        reserveSavings: profile.reserve_savings,
        monthlySavingsGoal: Number(profile.monthly_savings_goal ?? 0),
      })
    : null;
  const payableRemaining = balanceData.debts
    .filter((debt) => debt.direction === "payable" && !debt.is_paid)
    .reduce((sum, debt) => sum + Math.max(0, debt.amount - debt.paid_amount), 0);

  return {
    today,
    monthValue,
    isCurrentMonth,
    currency: profile.currency_code ?? "IDR",
    allowance,
    month: { income, expense, balance: income - expense },
    wallets: wallets.filter((wallet) => !wallet.is_archived),
    budgets: computeBudgetAlerts(monthTx, budgets, categories),
    savings: { saved: income - expense, goal: Number(profile.monthly_savings_goal ?? 0) },
    payableRemaining,
  };
}
