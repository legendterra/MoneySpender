import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import * as uiFormat from "@/components/ui/format";
import * as dates from "@/lib/dates";
import {
  CATEGORY_COLUMNS,
  DEBT_COLUMNS,
  DEBT_PAYMENT_COLUMNS,
  HISTORY_DEBT_COLUMNS,
  HISTORY_DEBT_PAYMENT_COLUMNS,
  HISTORY_TRANSACTION_COLUMNS,
  HISTORY_TRANSFER_COLUMNS,
  PROFILE_COLUMNS,
  RECURRING_COLUMNS,
  REMINDER_COLUMNS,
  TEMPLATE_COLUMNS,
  TRANSACTION_COLUMNS,
  TRANSFER_COLUMNS,
  WALLET_COLUMNS,
} from "@/lib/finance-data";
import { formatMoney, parseAmountInput } from "@/lib/money";

describe("parseAmountInput", () => {
  it("reads typed rupiah in either locale", () => {
    expect(parseAmountInput("25.000")).toBe(25_000);
    expect(parseAmountInput("25,000")).toBe(25_000);
    expect(parseAmountInput("Rp 1.250.000")).toBe(1_250_000);
    expect(parseAmountInput("  ")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
  });

  it("only keeps a minus sign when allowed, and caps at 14 digits", () => {
    expect(parseAmountInput("-150.000")).toBe(150_000);
    expect(parseAmountInput("-150.000", { allowNegative: true })).toBe(-150_000);
    expect(parseAmountInput("Rp -150.000", { allowNegative: true })).toBe(-150_000);
    expect(parseAmountInput("1234567890123456789")).toBe(12_345_678_901_234);
  });
});

describe("one source of truth for formatting", () => {
  it("components/ui/format re-exports src/lib/money and src/lib/dates", () => {
    expect(uiFormat.formatMoney).toBe(formatMoney);
    const now = new Date(Date.UTC(2026, 10, 19, 18, 30));
    expect(uiFormat.jakartaDateKey(now)).toBe(dates.todayWIB(now));
    expect(uiFormat.jakartaMonthKey(now)).toBe(dates.monthValueWIB(now));
    expect(uiFormat.addMonthsToKey("2026-01", -1)).toBe(dates.shiftMonth("2026-01", -1));
    expect(uiFormat.daysInMonthKey("2028-02")).toBe(29);
  });
});

// Every column list the app selects must be probed by scripts/check-schema.mjs,
// otherwise a missing column only shows up as a runtime error.
describe("check-schema PROBES cover the column lists", () => {
  const script = readFileSync(path.join(__dirname, "..", "..", "scripts", "check-schema.mjs"), "utf8");
  const probed = new Map<string, Set<string>>();
  for (const match of script.matchAll(/table:\s*"([a-z_]+)",\s*columns:\s*\[([^\]]*)\]/g)) {
    const columns = [...match[2].matchAll(/"([a-z_]+)"/g)].map((column) => column[1]);
    const set = probed.get(match[1]) ?? new Set<string>();
    columns.forEach((column) => set.add(column));
    probed.set(match[1], set);
  }

  const lists: Array<[string, string]> = [
    ["transactions", TRANSACTION_COLUMNS],
    ["transactions", HISTORY_TRANSACTION_COLUMNS],
    ["debts", DEBT_COLUMNS],
    ["debts", HISTORY_DEBT_COLUMNS],
    ["debt_payments", DEBT_PAYMENT_COLUMNS],
    ["debt_payments", HISTORY_DEBT_PAYMENT_COLUMNS],
    ["wallets", WALLET_COLUMNS],
    ["wallet_transfers", TRANSFER_COLUMNS],
    ["wallet_transfers", HISTORY_TRANSFER_COLUMNS],
    ["recurring_transactions", RECURRING_COLUMNS],
    ["transaction_templates", TEMPLATE_COLUMNS],
    ["categories", CATEGORY_COLUMNS],
    ["profiles", PROFILE_COLUMNS],
    ["reminder_preferences", REMINDER_COLUMNS],
  ];

  it.each(lists)("%s: %s", (table, columns) => {
    const missing = columns.split(",").filter((column) => !probed.get(table)?.has(column));
    expect(missing).toEqual([]);
  });
});
