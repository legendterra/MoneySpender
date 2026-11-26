import { describe, expect, it } from "vitest";

import { fetchHistoryPage, type HistoryPageRequest } from "@/lib/data-history";
import { compareEntries } from "@/lib/history";
import { deleteDebtPayment } from "@/lib/debt-payments";
import { deleteEntry, restoreEntry } from "@/lib/history-mutations";

import { FakeSupabase, asClient } from "./helpers/fake-supabase";

const U = "u1";

function seed() {
  return new FakeSupabase({
    wallets: [
      { id: "w-bca", user_id: U, name: "BCA", kind: "bank", opening_balance: 0, color: null, is_archived: false, created_at: "1" },
      { id: "w-old", user_id: U, name: "Dompet lama", kind: "cash", opening_balance: 0, color: null, is_archived: true, created_at: "2" },
      { id: "w-x", user_id: "someone-else", name: "Bukan punyaku", kind: "cash", opening_balance: 0, color: null, is_archived: false, created_at: "3" },
    ],
    categories: [{ id: "c1", user_id: U, name: "Makan", type: "expense", color: null }],
    transactions: [
      { id: "t-oct", user_id: U, amount: "15000", type: "expense", category_id: "c1", category_label: "Makan", transaction_date: "2026-10-31", reason: null, merchant: null, wallet_id: "w-bca", wallet_label: "BCA", created_at: "2026-10-31T10:00:00Z" },
      { id: "t-nov", user_id: U, amount: "25000", type: "expense", category_id: "c1", category_label: "Makan", transaction_date: "2026-11-01", reason: "Nasi", merchant: "Warung", wallet_id: "w-old", wallet_label: "Dompet lama", created_at: "2026-11-01T00:30:00Z" },
      { id: "t-other", user_id: "someone-else", amount: "1", type: "expense", category_id: null, category_label: null, transaction_date: "2026-11-01", reason: null, merchant: null, wallet_id: null, wallet_label: null, created_at: "x" },
    ],
    wallet_transfers: [
      { id: "tf1", user_id: U, from_wallet_id: "w-bca", to_wallet_id: "w-old", amount: 50000, transfer_date: "2026-11-30", note: null, created_at: "2026-11-30T01:00:00Z" },
    ],
    debts: [
      { id: "d1", user_id: U, amount: 200000, paid_amount: 200000, debt_date: "2026-09-10", contact_name: "Budi", source_name: "", reason: "Tiket", category_label: "Hutang", is_paid: true, paid_at: "2026-11-15T03:00:00Z", direction: "payable", wallet_id: "w-bca", wallet_label: "BCA", created_at: "2026-09-10T00:00:00Z" },
    ],
    debt_payments: [
      { id: "p1", user_id: U, debt_id: "d1", amount: 150000, paid_date: "2026-10-01", note: null, wallet_id: "w-bca", wallet_label: "BCA", created_at: "2026-10-01T00:00:00Z" },
      { id: "p2", user_id: U, debt_id: "d1", amount: 50000, paid_date: "2026-11-15", note: "Lunas", wallet_id: null, wallet_label: null, created_at: "2026-11-15T03:00:00Z" },
    ],
  });
}

const request = (overrides: Partial<HistoryPageRequest> = {}): HistoryPageRequest => ({
  type: null,
  walletId: null,
  categoryId: null,
  q: "",
  range: { start: "2026-11-01", end: "2026-11-30" },
  page: 1,
  ...overrides,
});

function bulkTransactions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `t${String(index).padStart(5, "0")}`,
    user_id: U,
    amount: 1000 + index,
    type: index % 9 === 0 ? "income" : "expense",
    category_id: null,
    category_label: index % 3 ? "Makan" : "Transport",
    transaction_date: `2026-11-${String(1 + (index % 30)).padStart(2, "0")}`,
    reason: null,
    merchant: null,
    wallet_id: "w-bca",
    wallet_label: "BCA",
    created_at: index % 7 ? `2026-11-01T${String(index % 24).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00Z` : null,
  }));
}

describe("fetchHistoryPage", () => {
  it("returns the user's rows of the period, with payments of older debts named", async () => {
    const db = seed();
    const page = await fetchHistoryPage(asClient(db), U, request());
    expect(page.entries.map((entry) => entry.key)).toEqual(["tf:tf1", "dp:p2", "tx:t-nov"]);
    expect(page.entries.find((entry) => entry.key === "dp:p2")).toMatchObject({ contact: "Budi", walletLabel: "BCA" });
    // Archived wallets still name old rows and transfers.
    expect(page.entries.find((entry) => entry.key === "tf:tf1")).toMatchObject({ toWalletLabel: "Dompet lama" });
    expect(page.entries.find((entry) => entry.key === "tx:t-nov")).toMatchObject({ amount: 25000, merchant: "Warung" });
    expect(page).toMatchObject({ page: 1, totalPages: 1, total: 3 });
    expect(page.summary).toMatchObject({ count: 3, expense: 25000, income: 0 });
    expect(page.days.map((day) => [day.date, day.expense])).toEqual([
      ["2026-11-30", 0],
      ["2026-11-15", 0],
      ["2026-11-01", 25000],
    ]);
    expect(page.wallets.map((wallet) => wallet.id)).toEqual(["w-bca", "w-old"]);
    expect(page.categories).toHaveLength(1);
  });

  it("pages on the server past PostgREST's 1000-row cap and matches a full sort", async () => {
    const db = seed();
    db.tables.transactions = bulkTransactions(2_345);
    const everything = await fetchHistoryPage(asClient(db), U, request({ pageSize: 5_000 }));
    expect(everything.total).toBe(2_347); // + transfer + payment
    const expected = [...everything.entries].sort(compareEntries).map((entry) => entry.key);

    for (const pageNumber of [1, 2, 60, 118]) {
      db.log = [];
      const page = await fetchHistoryPage(asClient(db), U, request({ page: pageNumber }));
      expect(page).toMatchObject({ page: pageNumber, totalPages: 118, total: 2_347 });
      expect(page.entries.map((entry) => entry.key)).toEqual(expected.slice((pageNumber - 1) * 20, pageNumber * 20));
      // Full rows are read only for the page, by id.
      const fullReads = db.calls("transactions", "select").filter((call) => call.columns?.includes("merchant"));
      expect(fullReads).toHaveLength(1);
    }
  });

  it("keeps whole-day totals when a page shows only part of a day", async () => {
    const db = seed();
    db.tables.transactions = bulkTransactions(300);
    const page = await fetchHistoryPage(asClient(db), U, request({ page: 2 }));
    for (const day of page.days) {
      const rows = db.rows("transactions").filter((row) => row.transaction_date === day.date);
      const expense = rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + Number(row.amount), 0);
      expect(day.expense).toBe(expense);
    }
  });

  it("clamps a page past the end to the last page", async () => {
    const db = seed();
    const page = await fetchHistoryPage(asClient(db), U, request({ page: 9 }));
    expect(page).toMatchObject({ page: 1, totalPages: 1 });
    expect(page.entries).toHaveLength(3);
  });

  it("filters type, wallet and search in SQL and reads only the tables that can match", async () => {
    const db = seed();
    const all = { start: null, end: null };

    const expenses = await fetchHistoryPage(asClient(db), U, request({ type: "expense", range: all }));
    expect(expenses.entries.map((entry) => entry.key)).toEqual(["tx:t-nov", "tx:t-oct"]);
    expect(db.calls("wallet_transfers")).toHaveLength(0);
    expect(expenses.summary).toBeNull();

    // A payment without a wallet counts on its debt's wallet.
    const bca = await fetchHistoryPage(asClient(db), U, request({ walletId: "w-bca", range: all }));
    expect(bca.entries.map((entry) => entry.key)).toEqual(["tf:tf1", "dp:p2", "tx:t-oct", "dp:p1", "db:d1"]);

    const budi = await fetchHistoryPage(asClient(db), U, request({ q: "budi", range: all }));
    expect(budi.entries.map((entry) => entry.key)).toEqual(["dp:p2", "dp:p1", "db:d1"]);

    const byWalletName = await fetchHistoryPage(asClient(db), U, request({ q: "lama", range: all }));
    expect(byWalletName.entries.map((entry) => entry.key)).toEqual(["tf:tf1", "tx:t-nov"]);

    const byAmount = await fetchHistoryPage(asClient(db), U, request({ q: "Rp15.000", range: all }));
    expect(byAmount.entries.map((entry) => entry.key)).toEqual(["tx:t-oct"]);

    const twoWords = await fetchHistoryPage(asClient(db), U, request({ q: "nasi warung", range: all }));
    expect(twoWords.entries.map((entry) => entry.key)).toEqual(["tx:t-nov"]);
  });

  it("names the table when a query fails", async () => {
    const db = seed();
    db.failures.push({ table: "debt_payments", op: "select", error: { code: "42703", message: "column debt_payments.created_at does not exist" } });
    await expect(fetchHistoryPage(asClient(db), U, request())).rejects.toThrow(
      /select on "debt_payments" failed \[42703\]/,
    );
  });
});

describe("deleteEntry / restoreEntry", () => {
  it("deletes a transaction and the undo puts the identical row back", async () => {
    const db = seed();
    const before = { ...db.rows("transactions")[1] };
    const token = await deleteEntry(asClient(db), U, { kind: "expense", id: "t-nov" });
    expect(db.rows("transactions").some((row) => row.id === "t-nov")).toBe(false);
    await restoreEntry(asClient(db), U, token);
    expect(db.rows("transactions").find((row) => row.id === "t-nov")).toEqual(before);
  });

  it("keeps a debt's payments for the undo (they cascade on delete)", async () => {
    const db = seed();
    const token = await deleteEntry(asClient(db), U, { kind: "debt", id: "d1" });
    // The fake has no cascade; mimic Postgres.
    db.tables.debt_payments = db.rows("debt_payments").filter((row) => row.debt_id !== "d1");
    expect(token).toMatchObject({ kind: "rows" });
    await restoreEntry(asClient(db), U, token);
    expect(db.rows("debts").map((row) => row.id)).toEqual(["d1"]);
    expect(db.rows("debt_payments").map((row) => row.id).sort()).toEqual(["p1", "p2"]);
    const order = db.log.filter((q) => q.op === "insert").map((q) => q.table);
    expect(order).toEqual(["debts", "debt_payments"]);
  });

  it("refuses to touch another user's row", async () => {
    const db = seed();
    await expect(deleteEntry(asClient(db), U, { kind: "expense", id: "t-other" })).rejects.toThrow(
      /select on "transactions" failed/,
    );
    expect(db.rows("transactions")).toHaveLength(3);
  });

  it("deleting a payment lowers paid_amount and reopens the debt; undo restores both", async () => {
    const db = seed();
    const token = await deleteEntry(asClient(db), U, { kind: "debt_payment", id: "p2" });
    expect(db.rows("debts")[0]).toMatchObject({ paid_amount: 150000, is_paid: false, paid_at: null });
    expect(db.rows("debt_payments").map((row) => row.id)).toEqual(["p1"]);

    await restoreEntry(asClient(db), U, token);
    expect(db.rows("debts")[0]).toMatchObject({ paid_amount: 200000, is_paid: true, paid_at: "2026-11-15T03:00:00Z" });
    expect(db.rows("debt_payments").map((row) => row.id).sort()).toEqual(["p1", "p2"]);
  });

  it("puts the payment back when the debt update fails", async () => {
    const db = seed();
    db.failures.push({ table: "debts", op: "update", error: { code: "42501", message: "permission denied" } });
    await expect(deleteDebtPayment(asClient(db), { userId: U, paymentId: "p2" })).rejects.toThrow(
      /update on "debts" failed \[42501\]: permission denied\. The payment was put back\./,
    );
    expect(db.rows("debt_payments").map((row) => row.id).sort()).toEqual(["p1", "p2"]);
    expect(db.rows("debts")[0]).toMatchObject({ paid_amount: 200000, is_paid: true });
  });
});
