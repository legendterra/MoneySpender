import { isMonthValue, monthRange, monthValueWIB, todayWIB } from "@/lib/dates";
import { DEFAULT_PAGE_SIZE, parsePage } from "@/lib/paging";
import type { DebtDirection, DebtPayment, DebtRecord, TransactionRecord, WalletTransfer } from "@/lib/types";

// Riwayat (PLAN.md section 4): every money movement in one list, grouped by
// day. Dates are WIB calendar days (`yyyy-MM-dd`, as stored by the app).

export type HistoryKind = "expense" | "income" | "transfer" | "debt" | "debt_payment";
/** Filter chips: "debt" covers new debts and their payments. */
export type HistoryTypeFilter = "expense" | "income" | "transfer" | "debt";
export type HistoryPeriod = "month" | "year" | "all";
/** Money flow from the user's point of view. */
export type HistoryFlow = "in" | "out" | "move";

export const HISTORY_TYPES: HistoryTypeFilter[] = ["expense", "income", "transfer", "debt"];
export const HISTORY_PERIODS: HistoryPeriod[] = ["month", "year", "all"];
/** Riwayat shows 20 rows per page (?page=), read with server-side range queries. */
export const HISTORY_PAGE_SIZE = DEFAULT_PAGE_SIZE;

export type HistoryEntry = {
  /** Unique across tables, e.g. "tx:<id>". */
  key: string;
  id: string;
  kind: HistoryKind;
  date: string;
  createdAt: string | null;
  amount: number;
  flow: HistoryFlow;
  note: string | null;
  merchant: string | null;
  categoryId: string | null;
  categoryLabel: string | null;
  /** Wallet that moved (transfers: the source wallet). */
  walletId: string | null;
  walletLabel: string | null;
  toWalletId: string | null;
  toWalletLabel: string | null;
  debtId: string | null;
  debtDirection: DebtDirection | null;
  contact: string | null;
  /** Debts only: amount already paid back. */
  debtPaid: number | null;
  debtPaidAt: string | null;
};

type WithCreatedAt<T> = T & { created_at?: string | null };

export type HistorySources = {
  transactions: WithCreatedAt<TransactionRecord>[];
  transfers: WithCreatedAt<WalletTransfer>[];
  /** All debts of the user: payments need their debt even if it is outside the range. */
  debts: WithCreatedAt<DebtRecord>[];
  payments: WithCreatedAt<DebtPayment>[];
  /** Parents of `payments` that are not entries themselves (paged reads). */
  paymentDebts?: DebtRecord[];
  walletNames: Map<string, string>;
  /** Only debts dated inside this range become entries (payments are pre-filtered by the query). */
  range?: { start: string | null; end: string | null };
};

const blankEntry = {
  note: null,
  merchant: null,
  categoryId: null,
  categoryLabel: null,
  walletId: null,
  walletLabel: null,
  toWalletId: null,
  toWalletLabel: null,
  debtId: null,
  debtDirection: null,
  contact: null,
  debtPaid: null,
  debtPaidAt: null,
} satisfies Partial<HistoryEntry>;

const clean = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

function inRange(date: string, range?: HistorySources["range"]) {
  if (!range) return true;
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
}

type Sortable = Pick<HistoryEntry, "date" | "createdAt" | "key">;

/** Newest day first; inside a day the most recently recorded first. */
export function compareEntries(a: Sortable, b: Sortable) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const left = a.createdAt ?? "";
  const right = b.createdAt ?? "";
  if (left !== right) return left < right ? 1 : -1;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

export function buildHistoryEntries(sources: HistorySources): HistoryEntry[] {
  const { walletNames } = sources;
  const name = (id: string | null | undefined, fallback?: string | null) =>
    (id ? walletNames.get(id) : undefined) ?? clean(fallback) ?? null;
  const entries: HistoryEntry[] = [];

  for (const t of sources.transactions) {
    entries.push({
      ...blankEntry,
      key: `tx:${t.id}`,
      id: t.id,
      kind: t.type,
      date: t.transaction_date,
      createdAt: t.created_at ?? null,
      amount: Number(t.amount) || 0,
      flow: t.type === "income" ? "in" : "out",
      note: clean(t.reason),
      merchant: clean(t.merchant),
      categoryId: t.category_id,
      categoryLabel: clean(t.category_label),
      walletId: t.wallet_id,
      walletLabel: name(t.wallet_id, t.wallet_label),
    });
  }

  for (const t of sources.transfers) {
    entries.push({
      ...blankEntry,
      key: `tf:${t.id}`,
      id: t.id,
      kind: "transfer",
      date: t.transfer_date,
      createdAt: t.created_at ?? null,
      amount: Number(t.amount) || 0,
      flow: "move",
      note: clean(t.note),
      walletId: t.from_wallet_id,
      walletLabel: name(t.from_wallet_id),
      toWalletId: t.to_wallet_id,
      toWalletLabel: name(t.to_wallet_id),
    });
  }

  const debtsById = new Map([...(sources.paymentDebts ?? []), ...sources.debts].map((debt) => [debt.id, debt]));
  for (const d of sources.debts) {
    if (!inRange(d.debt_date, sources.range)) continue;
    entries.push({
      ...blankEntry,
      key: `db:${d.id}`,
      id: d.id,
      kind: "debt",
      date: d.debt_date,
      createdAt: d.created_at ?? null,
      amount: Number(d.amount) || 0,
      // Borrowing brings money in; lending sends it out.
      flow: d.direction === "receivable" ? "out" : "in",
      note: clean(d.reason),
      categoryLabel: clean(d.category_label),
      walletId: d.wallet_id,
      walletLabel: name(d.wallet_id, d.wallet_label),
      debtId: d.id,
      debtDirection: d.direction,
      contact: clean(d.contact_name),
      debtPaid: Number(d.paid_amount) || 0,
      debtPaidAt: d.paid_at,
    });
  }

  for (const p of sources.payments) {
    const debt = debtsById.get(p.debt_id);
    const direction = debt?.direction ?? "payable";
    const walletId = p.wallet_id ?? debt?.wallet_id ?? null;
    entries.push({
      ...blankEntry,
      key: `dp:${p.id}`,
      id: p.id,
      kind: "debt_payment",
      date: p.paid_date,
      createdAt: p.created_at ?? null,
      amount: Number(p.amount) || 0,
      // Paying back a payable debt sends money out; a receivable coming back brings it in.
      flow: direction === "receivable" ? "in" : "out",
      note: clean(p.note),
      walletId,
      walletLabel: name(walletId, p.wallet_label ?? debt?.wallet_label),
      debtId: p.debt_id,
      debtDirection: direction,
      contact: clean(debt?.contact_name),
    });
  }

  return entries.sort(compareEntries);
}

// ── Filters ──────────────────────────────────────────────────────────────────

export type HistoryFilters = {
  type: HistoryTypeFilter | null;
  walletId: string | null;
  categoryId: string | null;
  q: string;
};

// ── Grouping and totals ──────────────────────────────────────────────────────

export type HistoryDay = {
  date: string;
  entries: HistoryEntry[];
  /** Expenses of the day (transfers and debts excluded), as on Beranda. */
  expense: number;
  income: number;
};

export type DayTotals = Map<string, { expense: number; income: number }>;

/**
 * Groups entries by WIB calendar day, newest first. With `totals` (computed
 * over the whole day by the server) a day cut by paging keeps its full total.
 */
export function groupByDay(entries: HistoryEntry[], totals?: DayTotals): HistoryDay[] {
  const days: HistoryDay[] = [];
  const byDate = new Map<string, HistoryDay>();
  for (const entry of [...entries].sort(compareEntries)) {
    let day = byDate.get(entry.date);
    if (!day) {
      day = { date: entry.date, entries: [], expense: 0, income: 0 };
      byDate.set(entry.date, day);
      days.push(day);
    }
    day.entries.push(entry);
    if (totals) continue;
    if (entry.kind === "expense") day.expense += entry.amount;
    else if (entry.kind === "income") day.income += entry.amount;
  }
  if (totals) {
    for (const day of days) Object.assign(day, totals.get(day.date) ?? { expense: 0, income: 0 });
  }
  return days;
}

/** Whole-day expense/income totals from lean transaction rows. */
export function dayTotals(rows: Array<{ type: string; amount: number | string; transaction_date: string }>): DayTotals {
  const totals: DayTotals = new Map();
  for (const row of rows) {
    const day = totals.get(row.transaction_date) ?? { expense: 0, income: 0 };
    if (row.type === "expense") day.expense += Number(row.amount) || 0;
    else if (row.type === "income") day.income += Number(row.amount) || 0;
    totals.set(row.transaction_date, day);
  }
  return totals;
}

export type HistorySummary = {
  count: number;
  expense: number;
  income: number;
  /** Top expense categories of the filtered set, largest first; label null = uncategorized. */
  topCategories: Array<{ label: string | null; total: number }>;
};

/** Expense/income totals and top expense categories from lean transaction rows. */
export function summarizeTransactions(
  rows: Array<{ type: string; amount: number | string; category_label: string | null }>,
  { top = 5 } = {},
): Omit<HistorySummary, "count"> {
  let expense = 0;
  let income = 0;
  const categories = new Map<string | null, number>();
  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    if (row.type === "expense") {
      expense += amount;
      const label = row.category_label?.trim() || null;
      categories.set(label, (categories.get(label) ?? 0) + amount);
    } else if (row.type === "income") {
      income += amount;
    }
  }
  const topCategories = [...categories.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total || (a.label ?? "").localeCompare(b.label ?? "", "id"))
    .slice(0, top);
  return { expense, income, topCategories };
}

// ── Optimistic rows ──────────────────────────────────────────────────────────

/** A row saved in this tab that the server page may not show yet. */
export type PendingEntry = { entry: HistoryEntry; at: number };

/** Does `entry` pass the Riwayat filters and date range? (client-side twin of the SQL filters) */
export function entryMatches(
  entry: HistoryEntry,
  filters: HistoryFilters & { range: { start: string | null; end: string | null } },
) {
  const { range } = filters;
  if (range.start && entry.date < range.start) return false;
  if (range.end && entry.date > range.end) return false;
  if (filters.type) {
    const kindOk =
      filters.type === "debt" ? entry.kind === "debt" || entry.kind === "debt_payment" : entry.kind === filters.type;
    if (!kindOk) return false;
  }
  if (filters.categoryId && entry.categoryId !== filters.categoryId) return false;
  if (filters.walletId && entry.walletId !== filters.walletId && entry.toWalletId !== filters.walletId) return false;
  const terms = searchTerms(filters.q);
  if (terms.length) {
    const haystack = [entry.note, entry.merchant, entry.categoryLabel, entry.walletLabel, entry.toWalletLabel, entry.contact]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("id");
    const ok = terms.every(
      (term) => (term.text && haystack.includes(term.text.toLocaleLowerCase("id"))) || term.amount === entry.amount,
    );
    if (!ok) return false;
  }
  return true;
}

const dayDelta = (entry: HistoryEntry, sign: 1 | -1) => ({
  expense: entry.kind === "expense" ? sign * entry.amount : 0,
  income: entry.kind === "income" ? sign * entry.amount : 0,
});

/**
 * Lays rows saved in this tab over a server page until the refreshed page
 * arrives: an edited row replaces its old version wherever it is; a new row
 * that matches the filters joins its day on the first page. Day totals follow.
 */
export function applyPending(
  days: HistoryDay[],
  pending: PendingEntry[],
  scope: HistoryFilters & { range: { start: string | null; end: string | null }; firstPage: boolean },
): HistoryDay[] {
  if (!pending.length) return days;
  const next = days.map((day) => ({ ...day, entries: [...day.entries] }));
  const dayOf = (date: string) => {
    let day = next.find((item) => item.date === date);
    if (!day) {
      day = { date, entries: [], expense: 0, income: 0 };
      next.push(day);
    }
    return day;
  };
  const shift = (day: HistoryDay, entry: HistoryEntry, sign: 1 | -1) => {
    const delta = dayDelta(entry, sign);
    day.expense += delta.expense;
    day.income += delta.income;
  };

  for (const { entry } of [...pending].reverse()) {
    const current = next.find((day) => day.entries.some((item) => item.key === entry.key));
    const matches = entryMatches(entry, scope);
    if (current) {
      const index = current.entries.findIndex((item) => item.key === entry.key);
      const old = current.entries[index];
      current.entries.splice(index, 1);
      shift(current, old, -1);
      if (!matches) continue;
      const target = dayOf(entry.date);
      target.entries.push(entry);
      shift(target, entry, 1);
    } else if (matches && scope.firstPage) {
      const target = dayOf(entry.date);
      target.entries.push(entry);
      shift(target, entry, 1);
    }
  }
  return next
    .filter((day) => day.entries.length)
    .map((day) => ({ ...day, entries: day.entries.sort(compareEntries) }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

// ── Server-side paging ───────────────────────────────────────────────────────

export type HistoryTable = "transactions" | "wallet_transfers" | "debts" | "debt_payments";

export const TABLE_PREFIX: Record<HistoryTable, string> = {
  transactions: "tx",
  wallet_transfers: "tf",
  debts: "db",
  debt_payments: "dp",
};

/** Sort key of one row, read before the full rows of a page. */
export type HistoryKey = { table: HistoryTable; id: string; date: string; createdAt: string | null; key: string };

export function toHistoryKey(table: HistoryTable, id: string, date: string, createdAt: string | null): HistoryKey {
  return { table, id, date, createdAt, key: `${TABLE_PREFIX[table]}:${id}` };
}

/**
 * Merges per-table key lists (each a sorted prefix of its table) and returns
 * the rows at [offset, offset + size) of the combined order. Each list must
 * hold at least its first offset + size rows (or all of them).
 */
export function pageOfKeys(lists: HistoryKey[][], offset: number, size: number) {
  return lists.flat().sort(compareEntries).slice(offset, offset + size);
}

/** Tables a type/category filter needs (a category only exists on transactions). */
export function tablesFor(filters: Pick<HistoryFilters, "type" | "categoryId">): HistoryTable[] {
  if (filters.categoryId || filters.type === "expense" || filters.type === "income") return ["transactions"];
  if (filters.type === "transfer") return ["wallet_transfers"];
  if (filters.type === "debt") return ["debts", "debt_payments"];
  return ["transactions", "wallet_transfers", "debts", "debt_payments"];
}

export type SearchTerm = { text: string; amount: number | null };

/**
 * Splits a search into at most five terms that are safe inside a PostgREST
 * or() filter (no commas, dots, parentheses or wildcards). "25.000" and
 * "Rp25000" also match the amount 25000.
 */
export function searchTerms(query: string): SearchTerm[] {
  return query
    .split(/\s+/)
    .map((raw) => {
      const numeric = /^(rp)?[\d.,]+$/i.test(raw);
      const digits = numeric ? raw.replace(/\D/g, "").slice(0, 14) : "";
      const text = raw.replace(/[^\p{L}\p{N}'&-]/gu, "").slice(0, 40);
      return { text, amount: digits ? Number(digits) : null };
    })
    .filter((term) => term.text || term.amount)
    .slice(0, 5);
}

/** "today" / "yesterday" relative to the WIB calendar, otherwise null. */
export function relativeDay(date: string, now: Date = new Date()): "today" | "yesterday" | null {
  const today = todayWIB(now);
  if (date === today) return "today";
  const yesterday = todayWIB(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  return date === yesterday ? "yesterday" : null;
}

// ── Display ──────────────────────────────────────────────────────────────────

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Title and subtitle of a row. `t` is the "riwayat" translator. */
export function describeEntry(entry: HistoryEntry, t: Translate) {
  const join = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(" · ");
  const contact = entry.contact ?? "-";
  switch (entry.kind) {
    case "transfer":
      return {
        title: t("rows.transfer", { from: entry.walletLabel ?? "-", to: entry.toWalletLabel ?? "-" }),
        subtitle: entry.note ?? "",
      };
    case "debt":
      return {
        title:
          entry.debtDirection === "receivable"
            ? t("rows.debtReceivable", { name: contact })
            : t("rows.debtPayable", { name: contact }),
        subtitle: join(entry.note, entry.walletLabel),
      };
    case "debt_payment":
      return {
        title:
          entry.debtDirection === "receivable"
            ? t("rows.paymentReceivable", { name: contact })
            : t("rows.paymentPayable", { name: contact }),
        subtitle: join(entry.note, entry.walletLabel),
      };
    default: {
      const category = entry.categoryLabel ?? t("rows.noCategory");
      const title = entry.note ?? entry.merchant ?? category;
      return { title, subtitle: title === category ? join(entry.walletLabel) : join(category, entry.walletLabel) };
    }
  }
}

// ── URL parameters ───────────────────────────────────────────────────────────

export type HistoryParams = HistoryFilters & {
  month: string;
  period: HistoryPeriod;
  page: number;
  range: { start: string | null; end: string | null };
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const ID_RE = /^[A-Za-z0-9-]{1,64}$/;

export function periodRange(period: HistoryPeriod, month: string) {
  if (period === "all") return { start: null, end: null };
  if (period === "year") {
    const year = month.slice(0, 4);
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  return monthRange(month);
}

export function parseHistoryParams(raw: RawParams, now: Date = new Date()): HistoryParams {
  const monthRaw = first(raw.month);
  const month = isMonthValue(monthRaw) ? monthRaw : monthValueWIB(now);
  const periodRaw = first(raw.period) as HistoryPeriod;
  const period = HISTORY_PERIODS.includes(periodRaw) ? periodRaw : "month";
  const typeRaw = first(raw.type) as HistoryTypeFilter;
  const wallet = first(raw.wallet);
  const category = first(raw.category);

  return {
    month,
    period,
    type: HISTORY_TYPES.includes(typeRaw) ? typeRaw : null,
    walletId: ID_RE.test(wallet) ? wallet : null,
    categoryId: ID_RE.test(category) ? category : null,
    q: first(raw.q).trim().slice(0, 80),
    page: parsePage(raw.page),
    range: periodRange(period, month),
  };
}

export type HistoryQuery = Partial<Pick<HistoryParams, "month" | "period" | "type" | "walletId" | "categoryId" | "q" | "page">>;

/** Query parameters of a Riwayat URL, defaults left out (also the pager's `query`). */
export function historyQuery(params: HistoryQuery, currentMonth: string = monthValueWIB()) {
  const query: Record<string, string | undefined> = {};
  if (params.month && params.month !== currentMonth) query.month = params.month;
  if (params.period && params.period !== "month") query.period = params.period;
  if (params.type) query.type = params.type;
  if (params.walletId) query.wallet = params.walletId;
  if (params.categoryId) query.category = params.categoryId;
  if (params.q?.trim()) query.q = params.q.trim();
  if (params.page && params.page > 1) query.page = String(params.page);
  return query;
}

/** `/history?...` with defaults left out, so URLs stay short and shareable. */
export function historyHref(params: HistoryQuery, currentMonth: string = monthValueWIB()) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(historyQuery(params, currentMonth))) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/history?${query}` : "/history";
}
