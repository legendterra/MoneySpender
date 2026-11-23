import { describe, expect, it } from "vitest";

import { clampDebtPayment, recordDebtPayment } from "@/lib/debt-payments";

import { FakeSupabase, asClient } from "./helpers/fake-supabase";

const debt = { id: "d1", amount: 200_000, paid_amount: 150_000, wallet_id: "w-bca", wallet_label: "BCA" };
const NOW = new Date("2026-11-20T23:30:00Z"); // 06:30 WIB on Nov 21

function db(options?: ConstructorParameters<typeof FakeSupabase>[1]) {
  return new FakeSupabase({ debts: [{ ...debt, user_id: "u1", is_paid: false, paid_at: null }], debt_payments: [] }, options);
}

describe("clampDebtPayment", () => {
  it("never exceeds the remaining amount", () => {
    expect(clampDebtPayment(debt, 80_000)).toBe(50_000);
    expect(clampDebtPayment(debt, 20_000)).toBe(20_000);
    expect(clampDebtPayment(debt, 0)).toBe(0);
    expect(clampDebtPayment(debt, Number.NaN)).toBe(0);
    expect(clampDebtPayment({ amount: 100, paid_amount: 100 }, 10)).toBe(0);
  });
});

describe("recordDebtPayment", () => {
  it("stores the clamped payment with its wallet, then updates the debt", async () => {
    const fake = db();
    const result = await recordDebtPayment(asClient(fake), {
      userId: "u1",
      debt,
      amount: 80_000,
      walletId: "w-cash",
      walletLabel: "Tunai",
      note: "Bayar sebagian",
      now: NOW,
    });

    expect(result).toMatchObject({ amount: 50_000, paidAmount: 200_000, isPaid: true });
    expect(fake.rows("debt_payments")).toEqual([
      expect.objectContaining({
        debt_id: "d1",
        user_id: "u1",
        amount: 50_000,
        wallet_id: "w-cash",
        wallet_label: "Tunai",
        paid_date: "2026-11-21",
      }),
    ]);
    expect(fake.rows("debts")[0]).toMatchObject({ paid_amount: 200_000, is_paid: true, paid_at: NOW.toISOString() });
    // Payment is written before the debt.
    const order = fake.log.filter((q) => q.op !== "select").map((q) => `${q.op}:${q.table}`);
    expect(order).toEqual(["insert:debt_payments", "update:debts"]);
  });

  it("defaults to the debt's own wallet", async () => {
    const fake = db();
    await recordDebtPayment(asClient(fake), { userId: "u1", debt, amount: 10_000, now: NOW });
    expect(fake.rows("debt_payments")[0]).toMatchObject({ wallet_id: "w-bca", wallet_label: "BCA" });
    expect(fake.rows("debts")[0]).toMatchObject({ paid_amount: 160_000, is_paid: false, paid_at: null });
  });

  it("rolls the payment back when the debt update fails", async () => {
    const fake = db({ failures: [{ table: "debts", op: "update", error: { code: "42501", message: "permission denied" } }] });
    await expect(
      recordDebtPayment(asClient(fake), { userId: "u1", debt, amount: 10_000, now: NOW }),
    ).rejects.toThrow(/update on "debts" failed \[42501\]: permission denied\..*rolled back/);
    expect(fake.rows("debt_payments")).toHaveLength(0);
    expect(fake.rows("debts")[0].paid_amount).toBe(150_000);
  });

  it("does not touch the debt when the payment insert fails", async () => {
    const fake = db({ failures: [{ table: "debt_payments", op: "insert", error: { code: "42703", message: "column wallet_label does not exist" } }] });
    await expect(
      recordDebtPayment(asClient(fake), { userId: "u1", debt, amount: 10_000, now: NOW }),
    ).rejects.toThrow(/insert on "debt_payments"/);
    expect(fake.calls("debts", "update")).toHaveLength(0);
  });

  it("refuses to pay a debt that is already settled", async () => {
    const fake = db();
    await expect(
      recordDebtPayment(asClient(fake), { userId: "u1", debt: { ...debt, paid_amount: 200_000 }, amount: 5_000 }),
    ).rejects.toThrow(/belum lunas/);
    expect(fake.log).toHaveLength(0);
  });
});
