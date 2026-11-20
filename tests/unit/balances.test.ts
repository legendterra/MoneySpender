import { describe, expect, it } from "vitest";

import {
  computeWalletBalances,
  type BalanceInputs,
  type BalanceOptions,
  type WalletRow,
} from "@/lib/balances";

const wallets: WalletRow[] = [
  { id: "cash", name: "Tunai", kind: "cash", opening_balance: 500_000, color: null, is_archived: false },
  { id: "bca", name: "BCA", kind: "bank", opening_balance: "1000000", color: null, is_archived: false },
  { id: "old", name: "Lama", kind: "ewallet", opening_balance: 10_000, color: null, is_archived: true },
];

function balances(inputs: BalanceInputs, options?: BalanceOptions) {
  return Object.fromEntries(computeWalletBalances(wallets, inputs, options).map((w) => [w.id, w.balance]));
}

describe("computeWalletBalances", () => {
  it("starts from opening_balance (numeric strings from Postgres included)", () => {
    expect(balances({})).toEqual({ cash: 500_000, bca: 1_000_000, old: 10_000 });
  });

  it("adds income, subtracts expense and ignores transactions without a known wallet", () => {
    const result = balances({
      transactions: [
        { type: "income", amount: 200_000, wallet_id: "bca" },
        { type: "expense", amount: 25_000, wallet_id: "cash" },
        { type: "expense", amount: 99_000, wallet_id: null },
        { type: "expense", amount: 99_000, wallet_id: "deleted-wallet" },
      ],
    });
    expect(result).toEqual({ cash: 475_000, bca: 1_200_000, old: 10_000 });
  });

  it("moves transfers between wallets", () => {
    const result = balances({ transfers: [{ from_wallet_id: "bca", to_wallet_id: "cash", amount: 300_000 }] });
    expect(result.bca).toBe(700_000);
    expect(result.cash).toBe(800_000);
  });

  it("credits a payable debt to the receiving wallet and debits its payments", () => {
    const result = balances({
      debts: [{ id: "d1", direction: "payable", amount: 200_000, paid_amount: 50_000, wallet_id: "bca" }],
      payments: [{ debt_id: "d1", amount: 50_000, wallet_id: "bca" }],
    });
    expect(result.bca).toBe(1_000_000 + 200_000 - 50_000);
  });

  it("debits a receivable debt from the lending wallet and credits repayments", () => {
    const result = balances({
      debts: [{ id: "r1", direction: "receivable", amount: 100_000, paid_amount: 40_000, wallet_id: "cash" }],
      payments: [{ debt_id: "r1", amount: 40_000, wallet_id: "bca" }],
    });
    expect(result.cash).toBe(500_000 - 100_000);
    expect(result.bca).toBe(1_000_000 + 40_000);
  });

  it("counts a payment with wallet_id null against the debt's own wallet", () => {
    const result = balances({
      debts: [{ id: "d1", direction: "payable", amount: 200_000, paid_amount: 80_000, wallet_id: "cash" }],
      payments: [{ debt_id: "d1", amount: 80_000, wallet_id: null }],
    });
    expect(result.cash).toBe(500_000 + 200_000 - 80_000);
  });

  it("caps legacy over-payments at the debt amount", () => {
    const result = balances({
      debts: [{ id: "d1", direction: "payable", amount: 100_000, paid_amount: 100_000, wallet_id: "cash" }],
      payments: [
        { debt_id: "d1", amount: 70_000, wallet_id: "cash", paid_date: "2026-11-01" },
        { debt_id: "d1", amount: 70_000, wallet_id: "cash", paid_date: "2026-11-02" },
      ],
    });
    // +100k borrowed, only 100k of the 140k recorded payments count.
    expect(result.cash).toBe(500_000);
  });

  it("treats paid_amount without payment rows (imports, old edits) as paid from the debt's wallet", () => {
    const result = balances({
      debts: [{ id: "d1", direction: "payable", amount: 300_000, paid_amount: 300_000, wallet_id: "bca" }],
      payments: [],
    });
    expect(result.bca).toBe(1_000_000);
  });

  it("supports an exclusive date cutoff for 'as of the start of today'", () => {
    const result = balances(
      {
        transactions: [
          { type: "expense", amount: 10_000, wallet_id: "cash", transaction_date: "2026-11-19" },
          { type: "expense", amount: 20_000, wallet_id: "cash", transaction_date: "2026-11-20" },
        ],
        transfers: [{ from_wallet_id: "cash", to_wallet_id: "bca", amount: 5_000, transfer_date: "2026-11-20" }],
        debts: [{ id: "d1", direction: "payable", amount: 50_000, wallet_id: "cash", debt_date: "2026-11-20" }],
        payments: [],
      },
      { before: "2026-11-20" },
    );
    expect(result.cash).toBe(490_000);
    expect(result.bca).toBe(1_000_000);
  });

  it("returns wallet metadata unchanged, including archived wallets", () => {
    const [cash, , old] = computeWalletBalances(wallets, {});
    expect(cash).toMatchObject({ id: "cash", name: "Tunai", kind: "cash", opening_balance: 500_000 });
    expect(old.is_archived).toBe(true);
  });
});
