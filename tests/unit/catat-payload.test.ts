import { describe, expect, it } from "vitest";

import {
  buildCatatPayload,
  sortCategoriesByUsage,
  validateDraft,
  type CatatDraft,
} from "@/components/quick-add/build-payload";
import type { CatatCategory, CatatWallet } from "@/components/quick-add/types";

const wallets: CatatWallet[] = [
  { id: "w1", name: "BCA", kind: "bank" },
  { id: "w2", name: "Tunai", kind: "cash" },
];
const categories: CatatCategory[] = [
  { id: "c1", name: "Makan & Minum", type: "expense", color: null, usageCount: 3 },
  { id: "c2", name: "Kopi & Nongkrong", type: "expense", color: null, usageCount: 9 },
  { id: "c3", name: "Gaji", type: "income", color: null, usageCount: 1 },
  { id: "c4", name: "Bensin", type: "expense", color: null },
];

const base: CatatDraft = {
  mode: "expense",
  amount: 25000,
  categoryId: "c2",
  categoryLabel: "Kopi & Nongkrong",
  walletId: "w2",
  toWalletId: "w1",
  dateKey: "2026-11-20",
  note: "  Kopi susu  ",
  debtDirection: "payable",
  contact: "",
};

describe("buildCatatPayload", () => {
  it("builds a transactions row without payment_method", () => {
    const result = buildCatatPayload(base, categories, wallets);
    expect(result.table).toBe("transactions");
    expect(result.payload).toEqual({
      type: "expense",
      amount: 25000,
      category_id: "c2",
      category_label: "Kopi & Nongkrong",
      wallet_id: "w2",
      wallet_label: "Tunai",
      transaction_date: "2026-11-20",
      reason: "Kopi susu",
      merchant: null,
    });
    expect(result.payload).not.toHaveProperty("payment_method");
  });

  it("keeps a free category label when the category has no row", () => {
    const result = buildCatatPayload(
      { ...base, categoryId: null, categoryLabel: "Servis motor", note: "" },
      categories,
      wallets,
    );
    expect(result.payload).toMatchObject({ category_id: null, category_label: "Servis motor", reason: null });
  });

  it("builds a wallet_transfers row", () => {
    const result = buildCatatPayload({ ...base, mode: "transfer", walletId: "w1", toWalletId: "w2" }, categories, wallets);
    expect(result).toEqual({
      table: "wallet_transfers",
      payload: {
        from_wallet_id: "w1",
        to_wallet_id: "w2",
        amount: 25000,
        transfer_date: "2026-11-20",
        note: "Kopi susu",
      },
    });
  });

  it("builds a debts row with contact_name and the Hutang/Piutang label", () => {
    const payable = buildCatatPayload({ ...base, mode: "debt", contact: " Budi ", walletId: "w1" }, categories, wallets);
    expect(payable.table).toBe("debts");
    expect(payable.payload).toEqual({
      direction: "payable",
      amount: 25000,
      debt_date: "2026-11-20",
      wallet_id: "w1",
      wallet_label: "BCA",
      contact_name: "Budi",
      source_name: "BCA",
      reason: "Kopi susu",
      category_label: "Hutang",
    });
    expect(payable.payload).not.toHaveProperty("lender_name");
    const receivable = buildCatatPayload(
      { ...base, mode: "debt", contact: "Sari", debtDirection: "receivable" },
      categories,
      wallets,
    );
    expect(receivable.payload).toMatchObject({ direction: "receivable", category_label: "Piutang" });
  });
});

describe("validateDraft", () => {
  it("requires an amount", () => {
    expect(validateDraft({ ...base, amount: 0 }, 2)).toBe("amount");
  });

  it("requires two different wallets for a transfer", () => {
    expect(validateDraft({ ...base, mode: "transfer", toWalletId: "w2" }, 2)).toBe("wallets");
    expect(validateDraft({ ...base, mode: "transfer" }, 1)).toBe("wallets");
    expect(validateDraft({ ...base, mode: "transfer" }, 2)).toBeNull();
  });

  it("requires a contact for a debt", () => {
    expect(validateDraft({ ...base, mode: "debt", contact: "  " }, 2)).toBe("contact");
    expect(validateDraft({ ...base, mode: "debt", contact: "Budi" }, 2)).toBeNull();
  });
});

describe("sortCategoriesByUsage", () => {
  it("puts the most used first and filters by type", () => {
    expect(sortCategoriesByUsage(categories, "expense").map((item) => item.id)).toEqual(["c2", "c1", "c4"]);
    expect(sortCategoriesByUsage(categories, "income").map((item) => item.id)).toEqual(["c3"]);
  });
});
