import { describe, expect, it } from "vitest";

import {
  adjustTotals,
  budgetListRows,
  budgetSuggestions,
  buildBudgetBoard,
  perDayAllowance,
  planBudgetCopy,
  spendingByCategory,
  statusForRatio,
  statusForSpend,
  withLimit,
} from "@/lib/budget-plan";

const categories = [
  { id: "food", name: "Makan" },
  { id: "fun", name: "Hiburan" },
  { id: "bills", name: "Tagihan" },
  { id: "car", name: "Bensin" },
  { id: "gift", name: "Hadiah" },
];

const budgets = [
  { category_id: "food", amount: 1_000_000 },
  { category_id: "fun", amount: "200000" },
  { category_id: "bills", amount: 500_000 },
  { category_id: "gift", amount: 0 },
];

const tx = [
  { type: "expense", amount: 850_000, category_id: "food" },
  { type: "expense", amount: 250_000, category_id: "fun" },
  { type: "expense", amount: "100000", category_id: "bills" },
  { type: "expense", amount: 60_000, category_id: "car" },
  { type: "income", amount: 9_000_000, category_id: "food" },
  { type: "expense", amount: 5_000, category_id: null },
];

describe("budget-plan", () => {
  it("sums expenses per category, ignoring income and uncategorised rows", () => {
    const spent = spendingByCategory(tx);
    expect(Object.fromEntries(spent)).toEqual({ food: 850_000, fun: 250_000, bills: 100_000, car: 60_000 });
  });

  it("maps ratios to statuses, with none when there is no limit", () => {
    expect(statusForRatio(0, 0)).toBe("none");
    expect(statusForRatio(100, 79)).toBe("safe");
    expect(statusForRatio(100, 80)).toBe("warning");
    expect(statusForRatio(100, 100)).toBe("over");
    // Exact amounts: 299.000 of 300.000 is nearly used up, not over.
    expect(statusForSpend(300_000, 299_000)).toBe("warning");
    expect(statusForSpend(300_000, 300_000)).toBe("warning");
    expect(statusForSpend(300_000, 300_001)).toBe("over");
    expect(statusForSpend(0, 10)).toBe("none");
  });

  it("builds a board sorted over > near > safe, with unbudgeted and idle groups", () => {
    const board = buildBudgetBoard(categories, budgets, tx);
    expect(board.budgeted.map((row) => [row.categoryId, row.status, row.ratio])).toEqual([
      ["fun", "over", 125],
      ["food", "warning", 85],
      ["bills", "safe", 20],
    ]);
    expect(board.unbudgetedWithSpending.map((row) => row.categoryId)).toEqual(["car"]);
    expect(board.idle.map((row) => row.categoryId)).toEqual(["gift"]);
    expect(board.budgeted[0]).toMatchObject({ limit: 200_000, spent: 250_000, remaining: -50_000, perDay: null });
    expect(board.totals).toMatchObject({
      limit: 1_700_000,
      spent: 1_200_000,
      remaining: 500_000,
      ratio: 71,
      status: "safe",
      overCount: 1,
      nearCount: 1,
      unbudgetedSpent: 60_000,
    });
  });

  it("adds a per-day pace for the current month and never goes negative", () => {
    const board = buildBudgetBoard(categories, budgets, tx, 8);
    const byId = Object.fromEntries(board.budgeted.map((row) => [row.categoryId, row]));
    expect(byId.food.perDay).toBe(18_750); // 150.000 / 8
    expect(byId.fun.perDay).toBe(0);
    expect(board.totals.perDay).toBe(62_500);
    expect(perDayAllowance(100, 0)).toBeNull();
    expect(perDayAllowance(100, null)).toBeNull();
  });

  it("handles a month without budgets", () => {
    const board = buildBudgetBoard(categories, [], tx);
    expect(board.budgeted).toEqual([]);
    expect(board.totals).toMatchObject({ limit: 0, ratio: 0, status: "none", perDay: null });
    expect(board.unbudgetedWithSpending.map((row) => row.categoryId)).toEqual(["food", "fun", "bills", "car"]);
  });

  it("copies last month's limits without overwriting this month or deleted categories", () => {
    const plan = planBudgetCopy(
      [
        { category_id: "food", amount: 1_000_000 },
        { category_id: "fun", amount: 200_000 },
        { category_id: "gone", amount: 50_000 },
        { category_id: "bills", amount: 0 },
        { category_id: "food", amount: 999 },
      ],
      [{ category_id: "fun", amount: 300_000 }],
      categories.map((c) => c.id),
      "2026-12",
    );
    expect(plan.rows).toEqual([{ category_id: "food", month: "2026-12", amount: 1_000_000 }]);
    expect(plan.alreadySet).toBe(1);
    expect(plan.missingCategory).toBe(1);
  });

  it("treats a zero limit in the target month as not set", () => {
    const plan = planBudgetCopy([{ category_id: "food", amount: 100 }], [{ category_id: "food", amount: 0 }], ["food"], "2026-12");
    expect(plan.rows).toHaveLength(1);
  });

  it("suggests last month's limit and spending rounded up, without duplicates", () => {
    expect(budgetSuggestions({ previousLimit: 500_000, previousSpent: 431_500, currentLimit: 0 })).toEqual([500_000, 440_000]);
    expect(budgetSuggestions({ previousLimit: 500_000, previousSpent: 495_000, currentLimit: 500_000 })).toEqual([]);
    expect(budgetSuggestions({ previousLimit: 0, previousSpent: 0, currentLimit: 0 })).toEqual([]);
  });

  it("flattens the board into one ordered, tagged list for paging", () => {
    const rows = budgetListRows(buildBudgetBoard(categories, budgets, tx));
    expect(rows.map((row) => [row.id, row.group])).toEqual([
      ["fun", "budgeted"],
      ["food", "budgeted"],
      ["bills", "budgeted"],
      ["car", "unbudgeted"],
      ["gift", "idle"],
    ]);
  });

  it("recomputes a row for a new limit, and 0 removes the budget", () => {
    const [, food] = buildBudgetBoard(categories, budgets, tx, 10).budgeted;
    expect(withLimit(food, 2_000_000, 10)).toMatchObject({ limit: 2_000_000, ratio: 43, status: "safe", remaining: 1_150_000, perDay: 115_000 });
    expect(withLimit(food, 800_000, 10)).toMatchObject({ status: "over", remaining: -50_000, perDay: 0 });
    expect(withLimit(food, 0, 10)).toMatchObject({ limit: 0, ratio: 0, status: "none", perDay: null });
  });

  it("adjusts month totals for optimistic edits on the visible page", () => {
    const board = buildBudgetBoard(categories, budgets, tx, 10);
    const rows = budgetListRows(board);
    expect(adjustTotals(board.totals, rows, rows, 10)).toBe(board.totals);

    const car = rows.find((row) => row.id === "car")!;
    const after = rows.map((row) => (row.id === "car" ? withLimit(row, car.spent * 2, 10) : row));
    const next = adjustTotals(board.totals, rows, after, 10);
    expect(next.limit).toBe(board.totals.limit + car.spent * 2);
    expect(next.spent).toBe(board.totals.spent + car.spent);
    expect(next.unbudgetedSpent).toBe(board.totals.unbudgetedSpent - car.spent);
    expect(next.remaining).toBe(next.limit - next.spent);

    const removed = rows.map((row) => (row.group === "budgeted" ? withLimit(row, 0, 10) : row));
    expect(adjustTotals(board.totals, rows, removed, 10)).toMatchObject({ limit: 0, spent: 0, overCount: 0, nearCount: 0, perDay: null });
  });
});
