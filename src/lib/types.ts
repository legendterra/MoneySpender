export type TransactionType = "income" | "expense" | "debt";
export type FinanceTransactionType = Exclude<TransactionType, "debt">;

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  color: string | null;
};

export type TransactionRecord = {
  id: string;
  amount: number;
  type: FinanceTransactionType;
  transaction_date: string;
  reason: string | null;
  merchant: string | null;
  payment_method: string | null;
  category_label: string | null;
};

export type DebtRecord = {
  id: string;
  amount: number;
  debt_date: string;
  source_name: string;
  lender_name: string;
  reason: string;
  category_label: string | null;
  is_paid: boolean;
  paid_at: string | null;
};

export type DebtSummary = {
  totalOutstanding: number;
  currentMonthOutstanding: number;
  unpaidCount: number;
};

export type HistoryRecord = {
  id: string;
  source: "transaction" | "debt";
  type: TransactionType;
  amount: number;
  date: string;
  title: string;
  subtitle: string;
  detail: string | null;
  statusLabel: string;
};

export type SummaryStats = {
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
};

export type MonthlyPoint = {
  label: string;
  income: number;
  expense: number;
  balance: number;
};

export type CategorySlice = {
  name: string;
  total: number;
};

export type GoalProgress = {
  currentMonthSaved: number;
  currentMonthGoal: number;
  currentYearSaved: number;
  currentYearGoal: number;
};

export type ProfileData = {
  full_name: string | null;
  currency_code: string | null;
  monthly_savings_goal: number | null;
  yearly_savings_goal: number | null;
};

export type ReminderPreferences = {
  reminder_morning_enabled: boolean;
  reminder_evening_enabled: boolean;
  push_enabled: boolean;
};
