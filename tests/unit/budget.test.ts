import { describe, expect, it } from "vitest";

import { budgetRatio, budgetStatus, budgetThreshold, computeBudgetAlerts } from "@/lib/budget";

describe("budget helpers", () => {
  it("computes rounded ratios and guards against zero budgets", () => {
    expect(budgetRatio(85_000, 100_000)).toBe(85);
    expect(budgetRatio(1, 3)).toBe(33);
    expect(budgetRatio(10, 0)).toBe(0);
  });

  it("maps ratios to status and notification thresholds", () => {
    expect([79, 80, 99, 100, 140].map(budgetStatus)).toEqual(["safe", "warning", "warning", "over", "over"]);
    expect([79, 80, 99, 100, 140].map(budgetThreshold)).toEqual([0, 80, 80, 100, 100]);
  });

  it("builds alerts from expenses only, sorted by ratio", () => {
    const alerts = computeBudgetAlerts(
      [
        { type: "expense", amount: 90_000, category_id: "food" },
        { type: "expense", amount: 10_000, category_id: "fun" },
        { type: "income", amount: 1_000_000, category_id: "food" },
        { type: "expense", amount: 5_000, category_id: null },
      ],
      [
        { category_id: "food", amount: 100_000 },
        { category_id: "fun", amount: 50_000 },
        { category_id: "none", amount: 0 },
      ],
      [
        { id: "food", name: "Makan" },
        { id: "fun", name: "Hiburan" },
      ],
    );
    expect(alerts).toEqual([
      { categoryId: "food", categoryName: "Makan", spent: 90_000, budget: 100_000, ratio: 90, status: "warning" },
      { categoryId: "fun", categoryName: "Hiburan", spent: 10_000, budget: 50_000, ratio: 20, status: "safe" },
    ]);
  });
});
