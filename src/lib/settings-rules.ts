import type { TransactionType } from "@/lib/types";

// Pure validation + row building for Pengaturan > Transaksi berulang and
// Template (recurring_transactions / transaction_templates). No payment_method:
// that column does not exist in the live schema.

export type RuleDraft = {
  type: TransactionType;
  amount: number;
  /** Template label, or the recurring rule's note (recurring_transactions.reason). */
  label: string;
  categoryId: string | null;
  walletId: string | null;
  /** Recurring only, 1-28 so every month has the day. */
  dayOfMonth?: number;
  cadence?: "weekly" | "monthly" | "yearly";
  dayOfWeek?: number | null;
  monthOfYear?: number | null;
  endOfMonth?: boolean;
  isActive?: boolean;
};

export type RuleIssue = "amount" | "label" | "day";

type Named = { id: string; name: string };
type TypedCategory = Named & { type: TransactionType };

export const MAX_RULE_DAY = 28;

export function validateRuleDraft(draft: RuleDraft, kind: "recurring" | "template"): RuleIssue | null {
  if (!Number.isInteger(draft.amount) || draft.amount <= 0) return "amount";
  const label = draft.label.trim();
  if (!label || label.length > 60) return "label";
  if (kind === "recurring") {
    const day = draft.dayOfMonth ?? 0;
    if (!Number.isInteger(day) || day < 1 || day > MAX_RULE_DAY) return "day";
  }
  return null;
}

function resolveRefs(draft: RuleDraft, categories: TypedCategory[], wallets: Named[]) {
  const category = categories.find((c) => c.id === draft.categoryId && c.type === draft.type) ?? null;
  const wallet = wallets.find((w) => w.id === draft.walletId) ?? null;
  return {
    category_id: category?.id ?? null,
    category_label: category?.name ?? null,
    wallet_id: wallet?.id ?? null,
    wallet_label: wallet?.name ?? null,
  };
}

/** recurring_transactions insert/update payload (without user_id for updates). */
export function buildRecurringRow(draft: RuleDraft, categories: TypedCategory[], wallets: Named[]) {
  const base = {
    type: draft.type,
    amount: draft.amount,
    reason: draft.label.trim(),
    ...resolveRefs(draft, categories, wallets),
    day_of_month: draft.dayOfMonth ?? 1,
    is_active: draft.isActive ?? true,
  };
  if (
    draft.cadence === undefined &&
    draft.dayOfWeek === undefined &&
    draft.monthOfYear === undefined &&
    draft.endOfMonth === undefined
  ) {
    return base;
  }
  return {
    ...base,
    cadence: draft.cadence ?? "monthly",
    day_of_week: draft.cadence === "weekly" ? (draft.dayOfWeek ?? 1) : null,
    month_of_year: draft.cadence === "yearly" ? (draft.monthOfYear ?? 1) : null,
    end_of_month: Boolean(draft.endOfMonth),
  };
}

/** transaction_templates insert/update payload (without user_id for updates). */
export function buildTemplateRow(draft: RuleDraft, categories: TypedCategory[], wallets: Named[]) {
  return {
    label: draft.label.trim(),
    type: draft.type,
    amount: draft.amount,
    ...resolveRefs(draft, categories, wallets),
  };
}

/** Next sort_order: after the current last template. */
export function nextSortOrder(templates: Array<{ sort_order: number }>) {
  return templates.reduce((max, t) => Math.max(max, Number(t.sort_order) || 0), -1) + 1;
}

/** Monthly cost of active expense rules (shown as the section summary). */
export function monthlyRecurringTotals(rules: Array<{ type: TransactionType; amount: number; is_active: boolean }>) {
  return rules.reduce(
    (sum, rule) => {
      if (!rule.is_active) return sum;
      if (rule.type === "expense") sum.expense += Number(rule.amount) || 0;
      else sum.income += Number(rule.amount) || 0;
      return sum;
    },
    { income: 0, expense: 0 },
  );
}
