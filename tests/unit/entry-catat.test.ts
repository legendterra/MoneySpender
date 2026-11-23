import { describe, expect, it } from "vitest";

import { entryToCatat } from "@/components/riwayat/entry-catat";
import type { HistoryEntry } from "@/lib/history";

const base: HistoryEntry = {
  key: "tx:t1",
  id: "t1",
  kind: "expense",
  date: "2026-11-18",
  createdAt: null,
  amount: 25000,
  flow: "out",
  note: "Kopi susu",
  merchant: "Kopi Kenangan",
  categoryId: "c-kopi",
  categoryLabel: "Kopi",
  walletId: "w-old",
  walletLabel: "Dompet lama",
  toWalletId: null,
  toWalletLabel: null,
  debtId: null,
  debtDirection: null,
  contact: null,
  debtPaid: null,
  debtPaidAt: null,
};

describe("entryToCatat", () => {
  it("edits a transaction in place, keeping its date and wallet", () => {
    expect(entryToCatat(base, { today: "2026-11-23" })).toEqual({
      mode: "expense",
      options: {
        preset: {
          amount: 25000,
          note: "Kopi susu",
          dateKey: "2026-11-18",
          walletId: "w-old",
          walletLabel: "Dompet lama",
          categoryId: "c-kopi",
          categoryLabel: "Kopi",
        },
        editing: { table: "transactions", id: "t1" },
      },
    });
  });

  it("duplicates as a new record dated today", () => {
    const result = entryToCatat(base, { duplicate: true, today: "2026-11-23" });
    expect(result?.options.editing).toBeUndefined();
    expect(result?.options.preset?.dateKey).toBe("2026-11-23");
  });

  it("edits transfers and debts in their own table; payments are not editable here", () => {
    const transfer = entryToCatat(
      { ...base, kind: "transfer", key: "tf:x", id: "x", toWalletId: "w2", toWalletLabel: "GoPay" },
      { today: "2026-11-23" },
    );
    expect(transfer).toMatchObject({
      mode: "transfer",
      options: { preset: { toWalletId: "w2" }, editing: { table: "wallet_transfers", id: "x" } },
    });

    const debt = entryToCatat(
      { ...base, kind: "debt", id: "d1", contact: "Budi", debtDirection: "receivable", debtPaid: 50000, debtPaidAt: null },
      { today: "2026-11-23" },
    );
    expect(debt).toMatchObject({
      mode: "debt",
      options: {
        preset: { contact: "Budi", debtDirection: "receivable" },
        editing: { table: "debts", id: "d1", debtPaid: 50000 },
      },
    });
    expect(entryToCatat({ ...base, kind: "debt_payment" }, { today: "2026-11-23" })).toBeNull();
  });
});
