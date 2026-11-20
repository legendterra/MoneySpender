import type { SupabaseClient } from "@supabase/supabase-js";

import { filterProUserIds } from "@/lib/billing";
import { todayWIB } from "@/lib/dates";
import { expectRows, SupabaseQueryError } from "@/lib/supabase/query";

type RuleRow = {
  id: string;
  user_id: string;
  type: "income" | "expense";
  category_id: string | null;
  category_label: string | null;
  wallet_id: string | null;
  wallet_label: string | null;
  amount: number;
  reason: string;
  merchant: string | null;
  day_of_month: number;
  last_generated_month: string | null;
};

export type RecurringRunReport = {
  month: string;
  generated: number;
  /** Rules another concurrent run already claimed this month. */
  skipped: number;
  errors: string[];
};

const RULE_COLUMNS =
  "id,user_id,type,category_id,category_label,wallet_id,wallet_label,amount,reason,merchant,day_of_month,last_generated_month";

const notThisMonth = (month: string) => `last_generated_month.is.null,last_generated_month.neq.${month}`;

/**
 * Creates this month's transaction for every due rule, at most once per rule
 * and month: the rule is claimed with a conditional update of
 * last_generated_month BEFORE inserting, so a second (or concurrent) run finds
 * nothing to claim. If the insert fails the claim is released for a retry.
 */
export async function generateRecurringTransactions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient | any,
  now: Date = new Date(),
): Promise<RecurringRunReport> {
  const today = todayWIB(now);
  const month = today.slice(0, 7);
  const day = Number(today.slice(8, 10));
  const report: RecurringRunReport = { month, generated: 0, skipped: 0, errors: [] };

  const rules = expectRows<RuleRow>(
    "recurring_transactions",
    await admin
      .from("recurring_transactions")
      .select(RULE_COLUMNS)
      .eq("is_active", true)
      .lte("day_of_month", Math.min(day, 28))
      .or(notThisMonth(month)),
  );

  // Recurring is a Pro feature while billing is enabled.
  const proIds = await filterProUserIds(
    admin,
    rules.map((rule) => rule.user_id),
  );

  for (const rule of rules.filter((r) => proIds.has(r.user_id))) {
    const claim = await admin
      .from("recurring_transactions")
      .update({ last_generated_month: month })
      .eq("id", rule.id)
      .or(notThisMonth(month))
      .select("id");
    if (claim.error) {
      report.errors.push(new SupabaseQueryError("recurring_transactions", "update", claim.error).message);
      continue;
    }
    if (!claim.data?.length) {
      report.skipped += 1;
      continue;
    }

    const inserted = await admin.from("transactions").insert({
      user_id: rule.user_id,
      type: rule.type,
      category_id: rule.category_id,
      category_label: rule.category_label,
      wallet_id: rule.wallet_id,
      wallet_label: rule.wallet_label,
      amount: rule.amount,
      reason: rule.reason,
      merchant: rule.merchant,
      // The rule's own day this month (WIB), also when a missed day is caught up later.
      transaction_date: `${month}-${String(rule.day_of_month).padStart(2, "0")}`,
    });

    if (inserted.error) {
      report.errors.push(new SupabaseQueryError("transactions", "insert", inserted.error).message);
      await admin
        .from("recurring_transactions")
        .update({ last_generated_month: rule.last_generated_month })
        .eq("id", rule.id)
        .eq("last_generated_month", month);
      continue;
    }

    report.generated += 1;
    const audit = await admin.from("audit_logs").insert({
      user_id: rule.user_id,
      action: "auto_recurring_generated",
      metadata: { recurring_id: rule.id, month },
    });
    if (audit.error) report.errors.push(new SupabaseQueryError("audit_logs", "insert", audit.error).message);
  }

  return report;
}
