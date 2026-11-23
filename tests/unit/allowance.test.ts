import { describe, expect, it } from "vitest";

import { computeAllowance, type AllowanceInput } from "@/lib/allowance";

function input(overrides: Partial<AllowanceInput> = {}): AllowanceInput {
  return {
    today: "2026-11-20", // 11 days left including today
    walletsAtStartOfToday: [
      { kind: "cash", is_archived: false, balance: 500_000 },
      { kind: "bank", is_archived: false, balance: 600_000 },
    ],
    transactions: [],
    recurring: [],
    reserveSavings: false,
    monthlySavingsGoal: 0,
    ...overrides,
  };
}

describe("computeAllowance (PLAN.md 4.1)", () => {
  it("divides liquid money by the days left including today", () => {
    const result = computeAllowance(input());
    expect(result.daysLeft).toBe(11);
    expect(result.liquid).toBe(1_100_000);
    expect(result.allowanceToday).toBe(100_000);
    expect(result.spentToday).toBe(0);
    expect(result.remainingToday).toBe(100_000);
    expect(result.tomorrowAllowance).toBe(110_000);
    expect(result.spendable).toBe(1_100_000);
  });

  it("excludes card and archived wallets from liquid", () => {
    const result = computeAllowance(
      input({
        walletsAtStartOfToday: [
          { kind: "cash", is_archived: false, balance: 110_000 },
          { kind: "card", is_archived: false, balance: 5_000_000 },
          { kind: "bank", is_archived: true, balance: 9_000_000 },
        ],
      }),
    );
    expect(result.liquid).toBe(110_000);
    expect(result.allowanceToday).toBe(10_000);
  });

  it("subtracts only upcoming, active, not-yet-generated recurring expenses", () => {
    const result = computeAllowance(
      input({
        recurring: [
          { type: "expense", amount: 220_000, day_of_month: 25, is_active: true, last_generated_month: "2026-10" },
          { type: "expense", amount: 1_000, day_of_month: 20, is_active: true, last_generated_month: null }, // today, not generated yet
          { type: "expense", amount: 50_000, day_of_month: 5, is_active: true, last_generated_month: null }, // already past
          { type: "expense", amount: 70_000, day_of_month: 28, is_active: true, last_generated_month: "2026-11" }, // generated
          { type: "expense", amount: 80_000, day_of_month: 28, is_active: false, last_generated_month: null },
          { type: "income", amount: 5_000_000, day_of_month: 25, is_active: true, last_generated_month: null },
        ],
      }),
    );
    expect(result.upcomingRecurring).toBe(221_000);
    expect(result.allowanceToday).toBe(Math.floor((1_100_000 - 221_000) / 11));
  });

  it("reserves the rest of the savings goal only when reserve_savings is on", () => {
    const transactions: AllowanceInput["transactions"] = [
      { type: "income", amount: 300_000, transaction_date: "2026-11-01" },
      { type: "expense", amount: 100_000, transaction_date: "2026-11-02" },
      { type: "income", amount: 999_999, transaction_date: "2026-11-20" }, // today: not part of savedThisMonth
      { type: "income", amount: 888_888, transaction_date: "2026-10-31" }, // other month
    ];
    const off = computeAllowance(input({ transactions, monthlySavingsGoal: 500_000 }));
    expect(off.reserve).toBe(0);
    expect(off.savedThisMonth).toBe(200_000);

    const on = computeAllowance(input({ transactions, monthlySavingsGoal: 500_000, reserveSavings: true }));
    expect(on.reserve).toBe(300_000);
    expect(on.allowanceToday).toBe(Math.floor((1_100_000 - 300_000) / 11));
  });

  it("never reserves a negative amount when the goal is already met", () => {
    const result = computeAllowance(
      input({
        reserveSavings: true,
        monthlySavingsGoal: 100_000,
        transactions: [{ type: "income", amount: 400_000, transaction_date: "2026-11-03" }],
      }),
    );
    expect(result.reserve).toBe(0);
  });

  it("counts only today's expenses as spentToday", () => {
    const result = computeAllowance(
      input({
        transactions: [
          { type: "expense", amount: 30_000, transaction_date: "2026-11-20" },
          { type: "expense", amount: 15_000, transaction_date: "2026-11-20" },
          { type: "income", amount: 50_000, transaction_date: "2026-11-20" },
          { type: "expense", amount: 70_000, transaction_date: "2026-11-19" },
        ],
      }),
    );
    expect(result.spentToday).toBe(45_000);
    expect(result.remainingToday).toBe(55_000);
    expect(result.tomorrowAllowance).toBe(Math.floor((1_100_000 - 45_000) / 10));
  });

  it("goes negative when over-spending and lowers tomorrow's allowance", () => {
    const result = computeAllowance(
      input({ transactions: [{ type: "expense", amount: 160_000, transaction_date: "2026-11-20" }] }),
    );
    expect(result.remainingToday).toBe(-60_000);
    expect(result.tomorrowAllowance).toBe(94_000);
  });

  it("on the last day of the month uses daysLeft = 1 and has no tomorrow value", () => {
    const result = computeAllowance(input({ today: "2026-11-30" }));
    expect(result.daysLeft).toBe(1);
    expect(result.allowanceToday).toBe(1_100_000);
    expect(result.tomorrowAllowance).toBeNull();
  });

  it("clamps the allowance at 0 when obligations exceed liquid money", () => {
    const result = computeAllowance(
      input({
        walletsAtStartOfToday: [{ kind: "cash", is_archived: false, balance: -20_000 }],
        transactions: [{ type: "expense", amount: 5_000, transaction_date: "2026-11-20" }],
      }),
    );
    expect(result.allowanceToday).toBe(0);
    expect(result.remainingToday).toBe(-5_000);
    expect(result.tomorrowAllowance).toBe(0);
    expect(result.spendable).toBe(0);
  });
});
