import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthedContext } from "@/lib/auth";
import { todayWIB } from "@/lib/dates";
import {
  CATEGORY_COLUMNS,
  HISTORY_DEBT_COLUMNS,
  HISTORY_DEBT_PAYMENT_COLUMNS,
  HISTORY_KEY_COLUMNS,
  HISTORY_TRANSACTION_COLUMNS,
  HISTORY_TRANSFER_COLUMNS,
  TRANSACTION_SUM_COLUMNS,
  WALLET_NAME_COLUMNS,
  mapDebt,
  mapDebtPayment,
  mapTransaction,
  mapTransfer,
} from "@/lib/finance-data";
import {
  HISTORY_PAGE_SIZE,
  buildHistoryEntries,
  dayTotals,
  groupByDay,
  pageOfKeys,
  parseHistoryParams,
  searchTerms,
  summarizeTransactions,
  tablesFor,
  toHistoryKey,
  type HistoryEntry,
  type HistoryFilters,
  type HistoryKey,
  type HistoryTable,
  type SearchTerm,
} from "@/lib/history";
import { clampPage, totalPages } from "@/lib/paging";
import { SupabaseQueryError, expectRows, selectAllRows, type SupabaseResultLike } from "@/lib/supabase/query";
import type { Category, WalletKind } from "@/lib/types";

// Riwayat reads one page at a time (owner rule: no full scans per request).
// Every table is filtered in SQL, then:
//   1. per table, only the sort keys (id, date, created_at) of its first
//      page * pageSize rows plus an exact count, via .range();
//   2. the keys are merged in Riwayat order and the page's ids picked;
//   3. the page's full rows are read by id (pageSize rows in total);
//   4. whole-day totals of the page's days and, for a month or year, the
//      period summary come from lean transaction columns.

type Row = Record<string, unknown>;
type DateRange = { start: string | null; end: string | null };

const DATE_COLUMN: Record<HistoryTable, string> = {
  transactions: "transaction_date",
  wallet_transfers: "transfer_date",
  debts: "debt_date",
  debt_payments: "paid_date",
};

const FULL_COLUMNS: Record<HistoryTable, string> = {
  transactions: HISTORY_TRANSACTION_COLUMNS,
  wallet_transfers: HISTORY_TRANSFER_COLUMNS,
  debts: HISTORY_DEBT_COLUMNS,
  debt_payments: HISTORY_DEBT_PAYMENT_COLUMNS,
};

/** PostgREST max-rows on Supabase. */
const MAX_ROWS = 1000;
/** Matches no row: used when a search term cannot match a table at all. */
const NO_ROW = "00000000-0000-0000-0000-000000000000";

const text = (value: unknown) => (value === null || value === undefined ? null : String(value));

export type HistoryWallet = { id: string; name: string; kind: WalletKind; is_archived: boolean };

export type HistoryPageRequest = HistoryFilters & { range: DateRange; page: number; pageSize?: number };

/** The parts of a supabase-js filter builder the history queries use. */
type Filterable = {
  eq(column: string, value: unknown): Filterable;
  gte(column: string, value: string): Filterable;
  lte(column: string, value: string): Filterable;
  in(column: string, values: unknown[]): Filterable;
  or(filters: string): Filterable;
};

type Lookups = {
  /** Per search term: wallets whose current name matches. */
  walletsByTerm: string[][];
  /** Per search term: debts whose contact or reason matches (finds their payments). */
  debtsByTerm: string[][];
  /** Debts booked on the filtered wallet (their payments without a wallet count there). */
  debtsOfWallet: string[];
};

const ilike = (column: string, term: string) => `${column}.ilike.*${term}*`;
const inList = (column: string, ids: string[]) => (ids.length ? [`${column}.in.(${ids.join(",")})`] : []);

function searchConditions(table: HistoryTable, term: SearchTerm, index: number, lookups: Lookups) {
  const parts: string[] = [];
  const word = term.text;
  const wallets = lookups.walletsByTerm[index] ?? [];
  if (table === "transactions") {
    if (word) {
      parts.push(ilike("reason", word), ilike("merchant", word), ilike("category_label", word), ilike("wallet_label", word));
    }
    parts.push(...inList("wallet_id", wallets));
  } else if (table === "wallet_transfers") {
    if (word) parts.push(ilike("note", word));
    parts.push(...inList("from_wallet_id", wallets), ...inList("to_wallet_id", wallets));
  } else if (table === "debts") {
    if (word) parts.push(ilike("contact_name", word), ilike("reason", word), ilike("wallet_label", word));
    parts.push(...inList("wallet_id", wallets));
  } else {
    if (word) parts.push(ilike("note", word), ilike("wallet_label", word));
    parts.push(...inList("wallet_id", wallets), ...inList("debt_id", lookups.debtsByTerm[index] ?? []));
  }
  if (term.amount) parts.push(`amount.eq.${term.amount}`);
  return parts;
}

/** Applies the range, type, wallet, category and search filters to a query on `table`. */
function applyFilters<Q>(query: Q, table: HistoryTable, request: HistoryPageRequest, terms: SearchTerm[], lookups: Lookups): Q {
  let q = query as unknown as Filterable;
  const date = DATE_COLUMN[table];
  if (request.range.start) q = q.gte(date, request.range.start);
  if (request.range.end) q = q.lte(date, request.range.end);
  if (table === "transactions") {
    if (request.type === "expense" || request.type === "income") q = q.eq("type", request.type);
    if (request.categoryId) q = q.eq("category_id", request.categoryId);
  }
  const wallet = request.walletId;
  if (wallet) {
    if (table === "wallet_transfers") {
      q = q.or(`from_wallet_id.eq.${wallet},to_wallet_id.eq.${wallet}`);
    } else if (table === "debt_payments" && lookups.debtsOfWallet.length) {
      q = q.or(`wallet_id.eq.${wallet},and(wallet_id.is.null,debt_id.in.(${lookups.debtsOfWallet.join(",")}))`);
    } else {
      q = q.eq("wallet_id", wallet);
    }
  }
  terms.forEach((term, index) => {
    const parts = searchConditions(table, term, index, lookups);
    q = parts.length ? q.or(parts.join(",")) : q.eq("id", NO_ROW);
  });
  return q as unknown as Q;
}

/** The first `count` sort keys of a filtered table and its exact row count. */
async function readKeys(
  client: SupabaseClient,
  userId: string,
  table: HistoryTable,
  count: number,
  request: HistoryPageRequest,
  terms: SearchTerm[],
  lookups: Lookups,
): Promise<{ keys: HistoryKey[]; total: number }> {
  const date = DATE_COLUMN[table];
  const keys: HistoryKey[] = [];
  let total = 0;
  for (let from = 0; from < count; from += MAX_ROWS) {
    const to = Math.min(count, from + MAX_ROWS) - 1;
    const base = client.from(table).select(HISTORY_KEY_COLUMNS[table], { count: "exact" }).eq("user_id", userId);
    const result = await applyFilters(base, table, request, terms, lookups)
      .order(date, { ascending: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, to);
    if (result.error) throw new SupabaseQueryError(table, "select", result.error);
    const rows = (result.data ?? []) as unknown as Row[];
    total = result.count ?? total;
    for (const row of rows) keys.push(toHistoryKey(table, String(row.id), String(row[date]), text(row.created_at)));
    if (rows.length < to - from + 1 || keys.length >= total) break;
  }
  return { keys, total };
}

async function debtIds(client: SupabaseClient, userId: string, filter: (query: Filterable) => Filterable) {
  const rows = await selectAllRows<Row>("debts", () => {
    const query = client.from("debts").select("id").eq("user_id", userId);
    return (filter(query as unknown as Filterable) as unknown as typeof query).order("id", { ascending: true });
  });
  return rows.map((row) => String(row.id));
}

/**
 * One page of Riwayat for `userId`: the page's entries grouped by WIB day
 * (with whole-day totals), the exact total, and the period summary for a
 * month or year.
 */
export async function fetchHistoryPage(client: SupabaseClient, userId: string, request: HistoryPageRequest) {
  const pageSize = request.pageSize ?? HISTORY_PAGE_SIZE;
  const terms = searchTerms(request.q);
  const tables = tablesFor(request);
  const needsDebtLookups = tables.includes("debt_payments");

  // Stage 1: names for rows and chips, and the debt ids some filters need.
  const [walletRows, categories, debtsByTerm, debtsOfWallet] = await Promise.all([
    client
      .from("wallets")
      .select(WALLET_NAME_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .then((result) => expectRows<Row>("wallets", result)),
    client
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .then((result) => expectRows<Category>("categories", result)),
    needsDebtLookups
      ? Promise.all(
          terms.map((term) =>
            term.text
              ? debtIds(client, userId, (q) => q.or(`${ilike("contact_name", term.text)},${ilike("reason", term.text)}`))
              : Promise.resolve([] as string[]),
          ),
        )
      : Promise.resolve([] as string[][]),
    needsDebtLookups && request.walletId
      ? debtIds(client, userId, (q) => q.eq("wallet_id", request.walletId))
      : Promise.resolve([] as string[]),
  ]);
  const wallets: HistoryWallet[] = walletRows.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    kind: String(row.kind ?? "other") as WalletKind,
    is_archived: Boolean(row.is_archived),
  }));
  const lookups: Lookups = {
    walletsByTerm: terms.map((term) => {
      const word = term.text.toLocaleLowerCase("id");
      return word
        ? wallets.filter((wallet) => wallet.name.toLocaleLowerCase("id").includes(word)).map((wallet) => wallet.id)
        : [];
    }),
    debtsByTerm,
    debtsOfWallet,
  };

  // Stage 2: sort keys and exact counts, merged into the requested page.
  const requested = Math.max(1, Math.floor(request.page) || 1);
  const perTable = await Promise.all(
    tables.map((table) => readKeys(client, userId, table, requested * pageSize, request, terms, lookups)),
  );
  const total = perTable.reduce((sum, item) => sum + item.total, 0);
  const pages = totalPages(total, pageSize);
  const page = clampPage(requested, pages);
  let pageKeys = pageOfKeys(
    perTable.map((item) => item.keys),
    (page - 1) * pageSize,
    pageSize,
  );
  if (page < requested && total > 0) {
    // Asked past the last page: read the keys of the last one.
    const again = await Promise.all(
      tables.map((table) => readKeys(client, userId, table, page * pageSize, request, terms, lookups)),
    );
    pageKeys = pageOfKeys(
      again.map((item) => item.keys),
      (page - 1) * pageSize,
      pageSize,
    );
  }

  // Stage 3: the page's rows, its whole-day totals and the period summary.
  const readRows = async (table: HistoryTable, ids: string[]): Promise<Row[]> => {
    if (!ids.length) return [];
    const result = await client.from(table).select(FULL_COLUMNS[table]).eq("user_id", userId).in("id", ids);
    return expectRows<Row>(table, result as unknown as SupabaseResultLike<Row[]>);
  };
  const idsOf = (table: HistoryTable) => pageKeys.filter((key) => key.table === table).map((key) => key.id);
  const pageDates = [...new Set(pageKeys.map((key) => key.date))];
  const withTransactions = tables.includes("transactions");
  const boundedPeriod = Boolean(request.range.start && request.range.end);

  const leanTransactions = (dates: string[] | null) =>
    selectAllRows<Row>("transactions", () => {
      let query = client.from("transactions").select(TRANSACTION_SUM_COLUMNS).eq("user_id", userId);
      if (dates) query = query.in("transaction_date", dates);
      return applyFilters(query, "transactions", request, terms, lookups).order("id", { ascending: true });
    });

  const [txRows, transferRows, debtRows, paymentRows, dayRows, periodRows] = await Promise.all([
    readRows("transactions", idsOf("transactions")),
    readRows("wallet_transfers", idsOf("wallet_transfers")),
    readRows("debts", idsOf("debts")),
    readRows("debt_payments", idsOf("debt_payments")),
    withTransactions && pageDates.length && !boundedPeriod ? leanTransactions(pageDates) : Promise.resolve(null),
    withTransactions && boundedPeriod ? leanTransactions(null) : Promise.resolve(null),
  ]);

  // The debts of the page's payments that are not on the page themselves.
  const onPage = new Set(debtRows.map((row) => String(row.id)));
  const parents = await readRows(
    "debts",
    [...new Set(paymentRows.map((row) => String(row.debt_id)))].filter((id) => !onPage.has(id)),
  );

  const entries = buildHistoryEntries({
    transactions: txRows.map((row) => ({ ...mapTransaction(row), created_at: text(row.created_at) })),
    transfers: transferRows.map((row) => ({ ...mapTransfer(row), created_at: text(row.created_at) })),
    debts: debtRows.map((row) => ({ ...mapDebt(row), created_at: text(row.created_at) })),
    payments: paymentRows.map((row) => ({ ...mapDebtPayment(row), created_at: text(row.created_at) })),
    paymentDebts: parents.map(mapDebt),
    walletNames: new Map(wallets.map((wallet) => [wallet.id, wallet.name])),
  });

  const lean = (rows: Row[]) =>
    rows.map((row) => ({
      type: String(row.type),
      amount: Number(row.amount) || 0,
      transaction_date: String(row.transaction_date),
      category_label: text(row.category_label),
    }));
  const periodLean = periodRows ? lean(periodRows) : null;

  return {
    entries,
    days: groupByDay(entries, withTransactions ? dayTotals(periodLean ?? lean(dayRows ?? [])) : undefined),
    page,
    pageSize,
    totalPages: pages,
    total,
    /** Totals of the whole filtered month or year (null for "all time"). */
    summary: boundedPeriod ? { count: total, ...summarizeTransactions(periodLean ?? []) } : null,
    wallets,
    categories,
  };
}

export type HistoryPageData = Awaited<ReturnType<typeof getHistoryPageData>>;

export async function getHistoryPageData(raw: Record<string, string | string[] | undefined>) {
  const params = parseHistoryParams(raw);
  const { supabase, user } = await getAuthedContext();
  const result = await fetchHistoryPage(supabase, user.id, params);
  return { params: { ...params, page: result.page }, today: todayWIB(), ...result };
}

/** Today's newest entries (WIB) for Beranda's "Hari ini" list, and how many there are in total. */
export async function getTodayEntries(limit = 5): Promise<{ today: string; entries: HistoryEntry[]; total: number }> {
  const today = todayWIB();
  const { supabase, user } = await getAuthedContext();
  const result = await fetchHistoryPage(supabase, user.id, {
    type: null,
    walletId: null,
    categoryId: null,
    q: "",
    range: { start: today, end: today },
    page: 1,
    pageSize: limit,
  });
  return { today, entries: result.entries, total: result.total };
}
