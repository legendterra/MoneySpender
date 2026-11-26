import { describe, expect, it } from "vitest";

import {
  buildRecurringRow,
  buildTemplateRow,
  monthlyRecurringTotals,
  nextSortOrder,
  validateRuleDraft,
  type RuleDraft,
} from "@/lib/settings-rules";

const categories = [
  { id: "c-food", name: "Makan", type: "expense" as const },
  { id: "c-salary", name: "Gaji", type: "income" as const },
];
const wallets = [{ id: "w1", name: "BCA" }];

const draft: RuleDraft = {
  type: "expense",
  amount: 150_000,
  label: "  Internet rumah ",
  categoryId: "c-food",
  walletId: "w1",
  dayOfMonth: 5,
  isActive: true,
};

describe("settings rules", () => {
  it("validates amount, label and day", () => {
    expect(validateRuleDraft(draft, "recurring")).toBeNull();
    expect(validateRuleDraft({ ...draft, amount: 0 }, "template")).toBe("amount");
    expect(validateRuleDraft({ ...draft, amount: 10.5 }, "template")).toBe("amount");
    expect(validateRuleDraft({ ...draft, label: "   " }, "template")).toBe("label");
    expect(validateRuleDraft({ ...draft, label: "x".repeat(61) }, "template")).toBe("label");
    expect(validateRuleDraft({ ...draft, dayOfMonth: 31 }, "recurring")).toBe("day");
    expect(validateRuleDraft({ ...draft, dayOfMonth: 0 }, "recurring")).toBe("day");
    expect(validateRuleDraft({ ...draft, dayOfMonth: undefined }, "template")).toBeNull();
  });

  it("builds a recurring row with labels copied and no payment_method", () => {
    const row = buildRecurringRow(draft, categories, wallets);
    expect(row).toEqual({
      type: "expense",
      amount: 150_000,
      reason: "Internet rumah",
      category_id: "c-food",
      category_label: "Makan",
      wallet_id: "w1",
      wallet_label: "BCA",
      day_of_month: 5,
      is_active: true,
    });
    expect(row).not.toHaveProperty("payment_method");
  });

  it("drops a category of the other type and unknown wallets", () => {
    const row = buildTemplateRow({ ...draft, type: "income", walletId: "gone" }, categories, wallets);
    expect(row).toEqual({
      label: "Internet rumah",
      type: "income",
      amount: 150_000,
      category_id: null,
      category_label: null,
      wallet_id: null,
      wallet_label: null,
    });
  });

  it("appends templates after the last sort_order", () => {
    expect(nextSortOrder([])).toBe(0);
    expect(nextSortOrder([{ sort_order: 3 }, { sort_order: 1 }])).toBe(4);
  });

  it("sums active rules per type", () => {
    expect(
      monthlyRecurringTotals([
        { type: "expense", amount: 100, is_active: true },
        { type: "expense", amount: 50, is_active: false },
        { type: "income", amount: 1_000, is_active: true },
      ]),
    ).toEqual({ income: 1_000, expense: 100 });
  });
});
