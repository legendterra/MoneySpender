import { describe, expect, it } from "vitest";

import { buildDebtBoard, paymentSuggestions, toDebtItem } from "@/lib/debt-board";
import { computeNetWorth, orderWallets, recentTransfers } from "@/lib/net-worth";
import type { DebtPayment, DebtRecord, Wallet } from "@/lib/types";

const debt = (overrides: Partial<DebtRecord>): DebtRecord => ({
  id: "d",
  amount: 100_000,
  paid_amount: 0,
  remaining_amount: 100_000,
  debt_date: "2026-11-01",
  contact_name: "Budi",
  source_name: "",
  reason: "",
  direction: "payable",
  wallet_id: "w1",
  wallet_label: "BCA",
  category_label: "Hutang",
  is_paid: false,
  paid_at: null,
  ...overrides,
});

const payment = (overrides: Partial<DebtPayment>): DebtPayment => ({
  id: "p",
  debt_id: "d",
  amount: 10_000,
  paid_date: "2026-11-02",
  note: null,
  wallet_id: null,
  wallet_label: null,
  ...overrides,
});

describe("buildDebtBoard", () => {
  const debts = [
    debt({ id: "a", amount: 200_000, paid_amount: 50_000, debt_date: "2026-10-01", contact_name: "Budi" }),
    debt({ id: "b", amount: 300_000, debt_date: "2026-11-10", contact_name: "budi " }),
    debt({ id: "c", amount: 80_000, paid_amount: 80_000, is_paid: true, paid_at: "2026-11-05T01:00:00Z" }),
    // paid_amount reached the amount but is_paid was never set: still settled.
    debt({ id: "d", amount: 40_000, paid_amount: 40_000, debt_date: "2026-09-01" }),
    debt({ id: "e", direction: "receivable", amount: 500_000, paid_amount: 125_000, contact_name: "Sari" }),
  ];
  const payments = [
    payment({ id: "p1", debt_id: "a", amount: 30_000, paid_date: "2026-10-05" }),
    payment({ id: "p2", debt_id: "a", amount: 20_000, paid_date: "2026-11-05" }),
  ];
  const board = buildDebtBoard(debts, payments);

  it("splits payable and receivable with totals of what is still open", () => {
    expect(board.payable).toMatchObject({ remaining: 450_000, total: 500_000, paid: 50_000, people: 1 });
    expect(board.receivable).toMatchObject({ remaining: 375_000, total: 500_000, paid: 125_000, people: 1 });
  });

  it("lists active debts newest first and settled ones by payoff date", () => {
    expect(board.payable.active.map((item) => item.id)).toEqual(["b", "a"]);
    expect(board.payable.settled.map((item) => item.id)).toEqual(["c", "d"]);
  });

  it("attaches payments newest first and the paid progress", () => {
    const a = board.payable.active.find((item) => item.id === "a")!;
    expect(a.payments.map((item) => item.id)).toEqual(["p2", "p1"]);
    expect(a.progress).toBeCloseTo(0.25);
    expect(a.remaining_amount).toBe(150_000);
  });

  it("never reports more paid than the debt amount", () => {
    const item = toDebtItem(debt({ amount: 100_000, paid_amount: 130_000 }), []);
    expect(item).toMatchObject({ paid_amount: 100_000, remaining_amount: 0, progress: 1, settled: true });
  });
});

describe("paymentSuggestions", () => {
  it("offers the whole remaining amount and a rounded half", () => {
    expect(paymentSuggestions(150_000)).toEqual([150_000, 75_000]);
    expect(paymentSuggestions(25_500)).toEqual([25_500, 12_000]);
    expect(paymentSuggestions(1_500)).toEqual([1_500]);
    expect(paymentSuggestions(0)).toEqual([]);
  });
});

const wallet = (overrides: Partial<Wallet>): Wallet => ({
  id: "w",
  name: "W",
  kind: "bank",
  opening_balance: 0,
  color: null,
  is_archived: false,
  balance: 0,
  ...overrides,
});

describe("computeNetWorth", () => {
  it("is wallets + receivables - payables, ignoring archived wallets and settled debts", () => {
    const summary = computeNetWorth(
      [
        wallet({ id: "bca", balance: 3_000_000 }),
        wallet({ id: "tunai", kind: "cash", balance: 250_000 }),
        wallet({ id: "card", kind: "card", balance: -400_000 }),
        wallet({ id: "old", balance: 999_000, is_archived: true }),
      ],
      [
        debt({ direction: "payable", amount: 500_000, paid_amount: 100_000 }),
        debt({ direction: "payable", amount: 200_000, paid_amount: 200_000, is_paid: true }),
        debt({ direction: "receivable", amount: 300_000, paid_amount: 0 }),
      ],
    );
    expect(summary).toEqual({
      walletTotal: 2_850_000,
      liquid: 3_250_000,
      receivable: 300_000,
      payable: 400_000,
      assets: 3_150_000,
      netWorth: 2_750_000,
      activeWallets: 3,
      archivedWallets: 1,
    });
  });

  it("can be negative", () => {
    expect(computeNetWorth([wallet({ balance: 50_000 })], [debt({ amount: 80_000 })]).netWorth).toBe(-30_000);
  });
});

describe("wallet list helpers", () => {
  it("puts archived wallets last and keeps creation order", () => {
    const ordered = orderWallets([
      wallet({ id: "a", is_archived: true }),
      wallet({ id: "b" }),
      wallet({ id: "c" }),
    ]);
    expect(ordered.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("returns the latest transfers with wallet names", () => {
    const rows = recentTransfers(
      [
        { id: "1", from_wallet_id: "a", to_wallet_id: "b", amount: 1, transfer_date: "2026-11-01", note: null },
        { id: "3", from_wallet_id: "b", to_wallet_id: "x", amount: 3, transfer_date: "2026-11-20", note: "Isi" },
        { id: "2", from_wallet_id: "a", to_wallet_id: "b", amount: 2, transfer_date: "2026-11-20", note: null },
      ],
      [wallet({ id: "a", name: "BCA" }), wallet({ id: "b", name: "GoPay" })],
      2,
    );
    expect(rows.map((row) => [row.id, row.fromName, row.toName])).toEqual([
      ["3", "GoPay", null],
      ["2", "BCA", "GoPay"],
    ]);
  });
});
