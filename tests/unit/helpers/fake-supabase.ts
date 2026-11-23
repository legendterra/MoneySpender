// Minimal in-memory stand-in for the parts of supabase-js the server code uses
// (from().select/insert/update/delete + filters, range, single/maybeSingle).
// Unique constraints can be declared per table to simulate 23505.

type Row = Record<string, unknown>;
type Op = "select" | "insert" | "update" | "delete";
type Result = { data: unknown; error: { message: string; code?: string } | null; count?: number | null };

export type QueryInfo = { table: string; op: Op; columns: string | null; payload: unknown };

export type Failure = {
  table: string;
  op: Op;
  error: { message: string; code?: string };
  when?: (query: QueryInfo) => boolean;
  /** How many times to fail (default: always). */
  times?: number;
};

export type FakeDbOptions = {
  unique?: Record<string, string[][]>;
  failures?: Failure[];
};

let idCounter = 0;

export class FakeSupabase {
  tables: Record<string, Row[]>;
  unique: Record<string, string[][]>;
  failures: Failure[];
  log: QueryInfo[] = [];

  constructor(tables: Record<string, Row[]> = {}, options: FakeDbOptions = {}) {
    this.tables = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.map((r) => ({ ...r }))]));
    this.unique = options.unique ?? {};
    this.failures = options.failures ?? [];
  }

  rows(table: string) {
    return (this.tables[table] ??= []);
  }

  from(table: string) {
    return new FakeQuery(this, table);
  }

  calls(table: string, op?: Op) {
    return this.log.filter((entry) => entry.table === table && (!op || entry.op === op));
  }
}

type Filter = (row: Row) => boolean;

function parseOrExpression(expression: string): Filter {
  const parts = expression.split(",").map((part) => {
    const [column, operator, ...rest] = part.split(".");
    const value = rest.join(".");
    return (row: Row) => {
      const current = row[column];
      if (operator === "is") return value === "null" ? current === null || current === undefined : String(current) === value;
      if (operator === "eq") return String(current) === value;
      if (operator === "neq") return current !== null && current !== undefined && String(current) !== value;
      throw new Error(`fake supabase: unsupported or() operator ${operator}`);
    };
  });
  return (row) => parts.some((test) => test(row));
}

class FakeQuery implements PromiseLike<Result> {
  private op: Op = "select";
  private columns: string | null = null;
  private payload: unknown = null;
  private returning = false;
  private filters: Filter[] = [];
  private orders: Array<{ column: string; ascending: boolean }> = [];
  private from_: number | null = null;
  private to_: number | null = null;
  private limit_: number | null = null;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private countRequested = false;
  private head = false;

  constructor(
    private db: FakeSupabase,
    private table: string,
  ) {}

  select(columns = "*", options?: { count?: string; head?: boolean }) {
    if (this.op === "select") this.columns = columns;
    else this.returning = true;
    this.countRequested = Boolean(options?.count);
    this.head = Boolean(options?.head);
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  delete(options?: { count?: string }) {
    this.op = "delete";
    this.countRequested = Boolean(options?.count);
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }
  gt(column: string, value: number | string) {
    this.filters.push((row) => (row[column] as number | string) > value);
    return this;
  }
  gte(column: string, value: number | string) {
    this.filters.push((row) => (row[column] as number | string) >= value);
    return this;
  }
  lt(column: string, value: number | string) {
    this.filters.push((row) => (row[column] as number | string) < value);
    return this;
  }
  lte(column: string, value: number | string) {
    this.filters.push((row) => (row[column] as number | string) <= value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }
  or(expression: string) {
    this.filters.push(parseOrExpression(expression));
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }
  limit(count: number) {
    this.limit_ = count;
    return this;
  }
  range(from: number, to: number) {
    this.from_ = from;
    this.to_ = to;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }

  then<T1 = Result, T2 = never>(
    onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onfulfilled, onrejected);
  }

  private matches(row: Row) {
    return this.filters.every((test) => test(row));
  }

  private execute(): Result {
    const info: QueryInfo = { table: this.table, op: this.op, columns: this.columns, payload: this.payload };
    this.db.log.push(info);

    const failure = this.db.failures.find(
      (f) => f.table === this.table && f.op === this.op && (f.times ?? 1) > 0 && (!f.when || f.when(info)),
    );
    if (failure) {
      if (failure.times !== undefined) failure.times -= 1;
      return { data: null, error: failure.error };
    }

    const rows = this.db.rows(this.table);

    if (this.op === "insert") {
      const incoming = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
      const prepared = incoming.map((row) => ({ id: row.id ?? `id-${++idCounter}`, ...row }));
      for (const constraint of this.db.unique[this.table] ?? []) {
        const key = (row: Row) => constraint.map((column) => String(row[column])).join("|");
        const existing = new Set(rows.map(key));
        for (const row of prepared) {
          if (existing.has(key(row))) {
            return {
              data: null,
              error: { code: "23505", message: `duplicate key value violates unique constraint on ${this.table} (${constraint.join(", ")})` },
            };
          }
          existing.add(key(row));
        }
      }
      rows.push(...prepared);
      return this.shape(this.returning ? prepared : null);
    }

    if (this.op === "update") {
      const matched = rows.filter((row) => this.matches(row));
      matched.forEach((row) => Object.assign(row, this.payload as Row));
      return this.shape(this.returning ? matched.map((row) => ({ ...row })) : null, matched.length);
    }

    if (this.op === "delete") {
      const removed = rows.filter((row) => this.matches(row));
      this.db.tables[this.table] = rows.filter((row) => !this.matches(row));
      return this.shape(this.returning ? removed : null, removed.length);
    }

    let selected = rows.filter((row) => this.matches(row)).map((row) => ({ ...row }));
    for (const { column, ascending } of [...this.orders].reverse()) {
      selected = [...selected].sort((a, b) => {
        const left = a[column] as string | number;
        const right = b[column] as string | number;
        if (left === right) return 0;
        return (left > right ? 1 : -1) * (ascending ? 1 : -1);
      });
    }
    const total = selected.length;
    if (this.from_ !== null && this.to_ !== null) selected = selected.slice(this.from_, this.to_ + 1);
    if (this.limit_ !== null) selected = selected.slice(0, this.limit_);
    if (this.head) return { data: null, error: null, count: total };
    return this.shape(selected, total);
  }

  private shape(data: Row[] | null, count?: number): Result {
    const counted = this.countRequested ? (count ?? data?.length ?? 0) : null;
    if (this.mode === "many" || data === null) return { data, error: null, count: counted };
    if (this.mode === "maybeSingle") {
      if (data.length > 1) return { data: null, error: { code: "PGRST116", message: "multiple rows" } };
      return { data: data[0] ?? null, error: null };
    }
    if (data.length !== 1) return { data: null, error: { code: "PGRST116", message: `expected 1 row, got ${data.length}` } };
    return { data: data[0], error: null };
  }
}

/** Typed escape hatch: production code expects a SupabaseClient. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asClient = (fake: FakeSupabase) => fake as any;
