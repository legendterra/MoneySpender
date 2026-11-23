import { describe, expect, it } from "vitest";

import {
  buildHistoryEntries,
  compareEntries,
  dayTotals,
  describeEntry,
  groupByDay,
  historyHref,
  pageOfKeys,
  searchTerms,
  summarizeTransactions,
  tablesFor,
  toHistoryKey,
  parseHistoryParams,
  periodRange,
  relativeDay,
  type HistorySources,
} from "@/lib/history";
import type { DebtPayment, DebtRecord, TransactionRecord, WalletTransfer } from "@/lib/types";

const tx = (overrides: Partial<TransactionRecord> & { created_at?: string }): TransactionRecord & { created_at?: string } => ({
  id: "t1",
  amount: 25_000,
  type: "expense",
  category_id: "c-kopi",
  transaction_date: "2026-11-20",
  reason: "Kopi susu",
  merchant: null,
  category_label: "Kopi & Nongkrong",
  wallet_id: "w-tunai",
  wallet_label: "Tunai lama",
  ...overrides,
});

const debt = (overrides: Partial<DebtRecord> = {}): DebtRecord => ({
  id: "d1",
  amount: 200_000,
  paid_amount: 50_000,
  remaining_amount: 150_000,
  debt_date: "2026-10-02",
  contact_name: "Budi",
  source_name: "",
  reason: "Patungan tiket",
  direction: "payable",
  wallet_id: "w-bca",
  wallet_label: "BCA",
  category_label: "Hutang",
  is_paid: false,
  paid_at: null,
  ...overrides,
});

const transfer: WalletTransfer & { created_at?: string } = {
  id: "tf1",
  from_wallet_id: "w-bca",
  to_wallet_id: "w-gopay",
  amount: 100_000,
  transfer_date: "2026-11-20",
  note: "Isi saldo",
  created_at: "2026-11-20T02:00:00Z",
};

const payment: DebtPayment & { created_at?: string } = {
  id: "p1",
  debt_id: "d1",
  amount: 50_000,
  paid_date: "2026-11-19",
  note: null,
  wallet_id: null,
  wallet_label: null,
  created_at: "2026-11-19T05:00:00Z",
};

const walletNames = new Map([
  ["w-tunai", "Tunai"],
  ["w-bca", "BCA"],
  ["w-gopay", "GoPay"],
]);

function sources(overrides: Partial<HistorySources> = {}): HistorySources {
  return {
    transactions: [
      tx({ id: "t1", created_at: "2026-11-20T01:00:00Z" }),
      tx({
        id: "t2",
        type: "income",
        amount: 8_500_000,
        category_id: "c-gaji",
        category_label: "Gaji",
        reason: null,
        wallet_id: "w-bca",
        transaction_date: "2026-11-19",
        created_at: "2026-11-19T03:00:00Z",
      }),
    ],
    transfers: [transfer],
    debts: [debt()],
    payments: [payment],
    walletNames,
    range: { start: "2026-11-01", end: "2026-11-30" },
    ...overrides,
  };
}

const t = (key: string, values?: Record<string, string | number>) =>
  `${key}${values ? `(${Object.values(values).join(",")})` : ""}`;

describe("buildHistoryEntries", () => {
  const entries = buildHistoryEntries(sources());
  const byKey = (key: string) => entries.find((entry) => entry.key === key)!;

  it("includes transactions, transfers and payments, newest first", () => {
    expect(entries.map((entry) => entry.key)).toEqual(["tf:tf1", "tx:t1", "dp:p1", "tx:t2"]);
  });

  it("skips debts dated outside the range but keeps their payments", () => {
    expect(entries.some((entry) => entry.kind === "debt")).toBe(false);
    const paid = byKey("dp:p1");
    // A payment without its own wallet uses the debt's wallet and contact.
    expect(paid).toMatchObject({ walletId: "w-bca", walletLabel: "BCA", contact: "Budi", flow: "out", debtId: "d1" });
  });

  it("uses current wallet names over stored labels and sets the money flow", () => {
    expect(byKey("tx:t1")).toMatchObject({ walletLabel: "Tunai", flow: "out", note: "Kopi susu" });
    expect(byKey("tx:t2")).toMatchObject({ flow: "in", note: null });
    expect(byKey("tf:tf1")).toMatchObject({ walletLabel: "BCA", toWalletLabel: "GoPay", flow: "move" });
  });

  it("maps debt directions: borrowing is money in, lending and receivable payments the reverse", () => {
    const all = buildHistoryEntries(
      sources({
        debts: [debt(), debt({ id: "d2", direction: "receivable", debt_date: "2026-11-05", contact_name: "Sari" })],
        payments: [payment, { ...payment, id: "p2", debt_id: "d2", wallet_id: "w-gopay" }],
        range: undefined,
      }),
    );
    const find = (key: string) => all.find((entry) => entry.key === key)!;
    expect(find("db:d1")).toMatchObject({ flow: "in", debtPaid: 50_000, contact: "Budi" });
    expect(find("db:d2")).toMatchObject({ flow: "out", debtDirection: "receivable" });
    expect(find("dp:p2")).toMatchObject({ flow: "in", walletLabel: "GoPay" });
  });

  it("orders rows of one day by when they were recorded", () => {
    const sameDay = buildHistoryEntries(
      sources({
        transactions: [
          tx({ id: "a", created_at: "2026-11-20T01:00:00Z" }),
          tx({ id: "b", created_at: "2026-11-20T09:00:00Z" }),
          tx({ id: "c", created_at: null as unknown as string }),
        ],
        transfers: [],
        payments: [],
      }),
    );
    expect(sameDay.map((entry) => entry.id)).toEqual(["b", "a", "c"]);
  });
});

describe("groupByDay and totals", () => {
  const entries = buildHistoryEntries(
    sources({
      transactions: [
        tx({ id: "a", amount: 25_000, created_at: "2026-11-20T01:00:00Z" }),
        tx({ id: "b", amount: 33_000, created_at: "2026-11-20T05:00:00Z", category_label: "Makan" }),
        tx({ id: "c", type: "income", amount: 100_000, transaction_date: "2026-11-18", category_label: "Bonus" }),
        tx({ id: "d", amount: 10_000, transaction_date: "2026-11-18", category_label: null }),
      ],
    }),
  );

  it("groups by calendar day, newest day first, with expense and income totals", () => {
    const days = groupByDay(entries);
    expect(days.map((day) => day.date)).toEqual(["2026-11-20", "2026-11-19", "2026-11-18"]);
    // Transfers and debt payments are not spending.
    expect(days[0]).toMatchObject({ expense: 58_000, income: 0 });
    expect(days[0].entries.map((entry) => entry.key)).toEqual(["tx:b", "tf:tf1", "tx:a"]);
    expect(days[1]).toMatchObject({ expense: 0, income: 0 });
    expect(days[2]).toMatchObject({ expense: 10_000, income: 100_000 });
  });

  it("keeps whole-day totals from the server when a page cuts a day", () => {
    const pageEntries = entries.filter((entry) => entry.key === "tx:b");
    const totals = dayTotals([
      { type: "expense", amount: 25_000, transaction_date: "2026-11-20" },
      { type: "expense", amount: "33000", transaction_date: "2026-11-20" },
      { type: "income", amount: 5_000, transaction_date: "2026-11-20" },
    ]);
    const days = groupByDay(pageEntries, totals);
    expect(days).toHaveLength(1);
    expect(days[0].entries).toHaveLength(1);
    expect(days[0]).toMatchObject({ expense: 58_000, income: 5_000 });
  });

  it("summarizes lean transaction rows like the full entries", () => {
    const summary = summarizeTransactions([
      { type: "expense", amount: 33_000, category_label: "Makan" },
      { type: "expense", amount: 25_000, category_label: "Kopi & Nongkrong" },
      { type: "expense", amount: 10_000, category_label: " " },
      { type: "income", amount: "100000", category_label: "Bonus" },
    ]);
    expect(summary).toEqual({
      expense: 68_000,
      income: 100_000,
      topCategories: [
        { label: "Makan", total: 33_000 },
        { label: "Kopi & Nongkrong", total: 25_000 },
        { label: null, total: 10_000 },
      ],
    });
  });
});

describe("server-side paging helpers", () => {
  const key = (table: Parameters<typeof toHistoryKey>[0], id: string, date: string, createdAt: string | null) =>
    toHistoryKey(table, id, date, createdAt);

  it("merges per-table key lists into one Riwayat order and slices a page", () => {
    const transactions = [
      key("transactions", "t3", "2026-11-20", "2026-11-20T05:00:00Z"),
      key("transactions", "t2", "2026-11-20", "2026-11-20T01:00:00Z"),
      key("transactions", "t1", "2026-11-18", null),
    ];
    const transfers = [key("wallet_transfers", "f1", "2026-11-20", "2026-11-20T03:00:00Z")];
    const payments = [key("debt_payments", "p1", "2026-11-19", "2026-11-19T00:00:00Z")];
    const lists = [transactions, transfers, payments];
    expect(pageOfKeys(lists, 0, 3).map((item) => item.key)).toEqual(["tx:t3", "tf:f1", "tx:t2"]);
    expect(pageOfKeys(lists, 3, 3).map((item) => item.key)).toEqual(["dp:p1", "tx:t1"]);
    expect(pageOfKeys(lists, 6, 3)).toEqual([]);
  });

  it("gives the same rows as sorting everything, for every page", () => {
    // 3 tables x 700 rows over 40 days; each table only hands over its first page * size keys.
    const tables = ["transactions", "wallet_transfers", "debt_payments"] as const;
    const all = tables.flatMap((table, t) =>
      Array.from({ length: 700 }, (_, index) =>
        key(
          table,
          `${t}-${String(index).padStart(4, "0")}`,
          `2026-10-${String(1 + ((index * 7 + t) % 28)).padStart(2, "0")}`,
          index % 5 === 0 ? null : `2026-10-01T${String(index % 24).padStart(2, "0")}:00:00Z`,
        ),
      ),
    );
    const sorted = [...all].sort(compareEntries);
    const size = 20;
    for (const page of [1, 2, 37, 105]) {
      const prefixes = tables.map((table) =>
        pageOfKeys([all.filter((item) => item.table === table)], 0, page * size),
      );
      expect(pageOfKeys(prefixes, (page - 1) * size, size)).toEqual(sorted.slice((page - 1) * size, page * size));
    }
    expect(sorted).toHaveLength(2_100);
  });

  it("reads only the tables a filter can match", () => {
    expect(tablesFor({ type: null, categoryId: null })).toEqual(["transactions", "wallet_transfers", "debts", "debt_payments"]);
    expect(tablesFor({ type: "expense", categoryId: null })).toEqual(["transactions"]);
    expect(tablesFor({ type: null, categoryId: "c1" })).toEqual(["transactions"]);
    expect(tablesFor({ type: "transfer", categoryId: null })).toEqual(["wallet_transfers"]);
    expect(tablesFor({ type: "debt", categoryId: null })).toEqual(["debts", "debt_payments"]);
  });

  it("splits a search into safe terms and reads amounts", () => {
    expect(searchTerms("  Kopi  susu ")).toEqual([
      { text: "Kopi", amount: null },
      { text: "susu", amount: null },
    ]);
    expect(searchTerms("Rp25.000")).toEqual([{ text: "Rp25000", amount: 25_000 }]);
    // PostgREST syntax characters are dropped, so a term cannot break the or() filter.
    expect(searchTerms("a,b.c(d)*%")).toEqual([{ text: "abcd", amount: null }]);
    expect(searchTerms("Jum'at & co-op")).toEqual([
      { text: "Jum'at", amount: null },
      { text: "&", amount: null },
      { text: "co-op", amount: null },
    ]);
    expect(searchTerms("a b c d e f g")).toHaveLength(5);
    expect(searchTerms("...")).toEqual([]);
  });
});

describe("relativeDay (WIB)", () => {
  it("uses the Jakarta calendar day, not UTC", () => {
    // 2026-11-19 18:30 UTC = 2026-11-20 01:30 WIB.
    const now = new Date(Date.UTC(2026, 10, 19, 18, 30));
    expect(relativeDay("2026-11-20", now)).toBe("today");
    expect(relativeDay("2026-11-19", now)).toBe("yesterday");
    expect(relativeDay("2026-11-18", now)).toBeNull();
    // 16:59 UTC on Dec 1 is 23:59 WIB, still Dec 1: yesterday crosses the month.
    expect(relativeDay("2026-11-30", new Date(Date.UTC(2026, 11, 1, 16, 59)))).toBe("yesterday");
  });
});

describe("describeEntry", () => {
  const entries = buildHistoryEntries(sources({ range: undefined }));
  const find = (key: string) => describeEntry(entries.find((entry) => entry.key === key)!, t);

  it("titles every kind of row", () => {
    expect(find("tx:t1")).toEqual({ title: "Kopi susu", subtitle: "Kopi & Nongkrong · Tunai" });
    expect(find("tx:t2")).toEqual({ title: "Gaji", subtitle: "BCA" });
    expect(find("tf:tf1")).toEqual({ title: "rows.transfer(BCA,GoPay)", subtitle: "Isi saldo" });
    expect(find("db:d1")).toEqual({ title: "rows.debtPayable(Budi)", subtitle: "Patungan tiket · BCA" });
    expect(find("dp:p1")).toEqual({ title: "rows.paymentPayable(Budi)", subtitle: "BCA" });
  });
});

describe("URL parameters", () => {
  const now = new Date(Date.UTC(2026, 10, 30, 18, 0)); // Dec 1, 01:00 WIB

  it("defaults to the current WIB month and the first page", () => {
    expect(parseHistoryParams({}, now)).toEqual({
      month: "2026-12",
      period: "month",
      type: null,
      walletId: null,
      categoryId: null,
      q: "",
      page: 1,
      range: { start: "2026-12-01", end: "2026-12-31" },
    });
  });

  it("validates every parameter", () => {
    const parsed = parseHistoryParams(
      { month: "2026-02", period: "year", type: "debt", wallet: "w-1", category: "bad id!", q: "  kopi  ", page: "3" },
      now,
    );
    expect(parsed).toMatchObject({
      month: "2026-02",
      period: "year",
      type: "debt",
      walletId: "w-1",
      categoryId: null,
      q: "kopi",
      page: 3,
      range: { start: "2026-01-01", end: "2026-12-31" },
    });
    expect(parseHistoryParams({ month: "2026-13", type: "loan", period: "week", page: "-5" }, now)).toMatchObject({
      month: "2026-12",
      type: null,
      period: "month",
      page: 1,
    });
    expect(parseHistoryParams({ q: ["a", "b"], page: "x" }, now)).toMatchObject({ q: "a", page: 1 });
  });

  it("builds short URLs and month ranges with the real last day", () => {
    expect(periodRange("month", "2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(periodRange("all", "2026-11")).toEqual({ start: null, end: null });
    expect(historyHref({ month: "2026-11", period: "month", q: " ", page: 1 }, "2026-11")).toBe("/history");
    expect(
      historyHref({ month: "2026-10", period: "all", type: "expense", walletId: "w1", categoryId: "c1", q: "kopi susu", page: 4 }, "2026-11"),
    ).toBe("/history?month=2026-10&period=all&type=expense&wallet=w1&category=c1&q=kopi+susu&page=4");
  });
});
