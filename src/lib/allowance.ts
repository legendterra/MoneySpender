import { daysLeftInMonth } from "@/lib/dates";

// PLAN.md section 4.1 "Jatah aman hari ini". All dates are WIB `yyyy-MM-dd`.
//
// liquid            = balances of non-archived, non-card wallets at the start of today
// upcomingRecurring = active recurring EXPENSE rules with day_of_month >= today, not generated this month
// savedThisMonth    = max(0, income - expense) this month before today
// reserve           = reserve_savings ? max(0, monthly_savings_goal - savedThisMonth) : 0
// daysLeft          = days left in the month including today
// allowanceToday    = max(0, floor((liquid - upcomingRecurring - reserve) / daysLeft))
// spentToday        = expenses dated today (any wallet, transfers are not transactions)
// remainingToday    = allowanceToday - spentToday (negative = over)
// tomorrowAllowance = max(0, floor((liquid - spentToday - upcomingRecurring - reserve) / (daysLeft - 1)))

export type AllowanceWallet = { kind: string; is_archived: boolean; balance: number };
export type AllowanceTransaction = { type: "income" | "expense"; amount: number; transaction_date: string };
export type AllowanceRecurring = {
  type: "income" | "expense";
  amount: number;
  day_of_month: number;
  is_active: boolean;
  last_generated_month: string | null;
};

export type AllowanceInput = {
  today: string;
  /** Wallet balances as of the start of today (computeWalletBalances with `before: today`). */
  walletsAtStartOfToday: AllowanceWallet[];
  /** At least this month's transactions; others are ignored. */
  transactions: AllowanceTransaction[];
  recurring: AllowanceRecurring[];
  reserveSavings: boolean;
  monthlySavingsGoal: number;
};

export type AllowanceResult = {
  today: string;
  daysLeft: number;
  liquid: number;
  upcomingRecurring: number;
  savedThisMonth: number;
  reserve: number;
  /** Money that may still be spent this month: max(0, liquid - upcomingRecurring - reserve). */
  spendable: number;
  allowanceToday: number;
  spentToday: number;
  remainingToday: number;
  /** null on the last day of the month (the formula needs daysLeft > 1). */
  tomorrowAllowance: number | null;
};

export function computeAllowance(input: AllowanceInput): AllowanceResult {
  const { today } = input;
  const month = today.slice(0, 7);
  const dayOfMonth = Number(today.slice(8, 10));
  const daysLeft = daysLeftInMonth(today);

  const liquid = input.walletsAtStartOfToday
    .filter((wallet) => !wallet.is_archived && wallet.kind !== "card")
    .reduce((sum, wallet) => sum + (Number(wallet.balance) || 0), 0);

  const upcomingRecurring = input.recurring
    .filter(
      (rule) =>
        rule.is_active &&
        rule.type === "expense" &&
        rule.day_of_month >= dayOfMonth &&
        rule.last_generated_month !== month,
    )
    .reduce((sum, rule) => sum + (Number(rule.amount) || 0), 0);

  let incomeBeforeToday = 0;
  let expenseBeforeToday = 0;
  let spentToday = 0;
  for (const t of input.transactions) {
    if (t.transaction_date.slice(0, 7) !== month) continue;
    const amount = Number(t.amount) || 0;
    if (t.transaction_date < today) {
      if (t.type === "income") incomeBeforeToday += amount;
      else expenseBeforeToday += amount;
    } else if (t.transaction_date === today && t.type === "expense") {
      spentToday += amount;
    }
  }

  const savedThisMonth = Math.max(0, incomeBeforeToday - expenseBeforeToday);
  const reserve = input.reserveSavings
    ? Math.max(0, (Number(input.monthlySavingsGoal) || 0) - savedThisMonth)
    : 0;
  const available = liquid - upcomingRecurring - reserve;
  const allowanceToday = Math.max(0, Math.floor(available / daysLeft));
  const tomorrowAllowance =
    daysLeft > 1 ? Math.max(0, Math.floor((available - spentToday) / (daysLeft - 1))) : null;

  return {
    today,
    daysLeft,
    liquid,
    upcomingRecurring,
    savedThisMonth,
    reserve,
    spendable: Math.max(0, available),
    allowanceToday,
    spentToday,
    remainingToday: allowanceToday - spentToday,
    tomorrowAllowance,
  };
}
