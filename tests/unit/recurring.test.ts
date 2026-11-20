import { describe, expect, it } from "vitest";

import { generateRecurringTransactions } from "@/lib/recurring";

import { FakeSupabase, asClient } from "./helpers/fake-supabase";

// 2026-11-20 08:00 WIB
const NOW = new Date("2026-11-20T01:00:00Z");

function rule(overrides: Record<string, unknown> = {}) {
  return {
    id: "r1",
    user_id: "u1",
    type: "expense",
    category_id: "c1",
    category_label: "Internet",
    wallet_id: "w1",
    wallet_label: "BCA",
    amount: 350_000,
    reason: "Indihome",
    merchant: null,
    day_of_month: 5,
    last_generated_month: "2026-10",
    is_active: true,
    ...overrides,
  };
}

describe("generateRecurringTransactions", () => {
  it("creates exactly one transaction per rule and month, even when run twice", async () => {
    const db = new FakeSupabase({ recurring_transactions: [rule()], transactions: [], audit_logs: [] });

    const first = await generateRecurringTransactions(asClient(db), NOW);
    const second = await generateRecurringTransactions(asClient(db), NOW);

    expect(first).toMatchObject({ month: "2026-11", generated: 1, errors: [] });
    expect(second.generated).toBe(0);
    expect(db.rows("transactions")).toHaveLength(1);
    expect(db.rows("recurring_transactions")[0].last_generated_month).toBe("2026-11");
  });

  it("copies the wallet and uses the rule's own day in WIB", async () => {
    const db = new FakeSupabase({ recurring_transactions: [rule()], transactions: [], audit_logs: [] });
    await generateRecurringTransactions(asClient(db), NOW);
    expect(db.rows("transactions")[0]).toMatchObject({
      user_id: "u1",
      wallet_id: "w1",
      wallet_label: "BCA",
      amount: 350_000,
      transaction_date: "2026-11-05",
    });
    expect(db.rows("transactions")[0]).not.toHaveProperty("payment_method");
  });

  it("skips rules that a concurrent run already claimed", async () => {
    const db = new FakeSupabase({ recurring_transactions: [rule()], transactions: [], audit_logs: [] });
    // Simulate the other run winning between our select and our claim.
    db.failures.push({
      table: "recurring_transactions",
      op: "update",
      error: { message: "unused" },
      when: () => {
        db.rows("recurring_transactions")[0].last_generated_month = "2026-11";
        return false;
      },
    });
    const report = await generateRecurringTransactions(asClient(db), NOW);
    expect(report).toMatchObject({ generated: 0, skipped: 1 });
    expect(db.rows("transactions")).toHaveLength(0);
  });

  it("ignores rules due later this month, inactive rules and already generated rules", async () => {
    const db = new FakeSupabase({
      recurring_transactions: [
        rule({ id: "later", day_of_month: 25 }),
        rule({ id: "inactive", is_active: false }),
        rule({ id: "done", last_generated_month: "2026-11" }),
        rule({ id: "new", last_generated_month: null, day_of_month: 20 }),
      ],
      transactions: [],
      audit_logs: [],
    });
    const report = await generateRecurringTransactions(asClient(db), NOW);
    expect(report.generated).toBe(1);
    expect(db.rows("transactions")[0].transaction_date).toBe("2026-11-20");
  });

  it("releases the claim when the insert fails so the next run retries", async () => {
    const db = new FakeSupabase(
      { recurring_transactions: [rule()], transactions: [], audit_logs: [] },
      { failures: [{ table: "transactions", op: "insert", error: { code: "23514", message: "check violation" }, times: 1 }] },
    );
    const failed = await generateRecurringTransactions(asClient(db), NOW);
    expect(failed.generated).toBe(0);
    expect(failed.errors[0]).toMatch(/insert on "transactions" failed \[23514\]/);
    expect(db.rows("recurring_transactions")[0].last_generated_month).toBe("2026-10");

    const retry = await generateRecurringTransactions(asClient(db), NOW);
    expect(retry.generated).toBe(1);
    expect(db.rows("transactions")).toHaveLength(1);
  });

  it("throws a descriptive error when the rules query fails", async () => {
    const db = new FakeSupabase(
      { recurring_transactions: [] },
      { failures: [{ table: "recurring_transactions", op: "select", error: { code: "42703", message: "column recurring_transactions.payment_method does not exist" } }] },
    );
    await expect(generateRecurringTransactions(asClient(db), NOW)).rejects.toThrow(/"recurring_transactions"/);
  });
});
