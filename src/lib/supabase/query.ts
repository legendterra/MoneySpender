// One place that turns Supabase results into data or a descriptive Error, so
// schema drift (missing column/table, bad enum) surfaces instead of rendering
// an empty page.

export type SupabaseErrorLike = {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type SupabaseResultLike<T> = {
  data: T | null;
  error: SupabaseErrorLike | null;
  count?: number | null;
};

export class SupabaseQueryError extends Error {
  readonly table: string;
  readonly operation: string;
  readonly code: string | null;

  constructor(table: string, operation: string, error: SupabaseErrorLike) {
    const code = error.code ? ` [${error.code}]` : "";
    const hint = error.hint ? ` Hint: ${error.hint}` : "";
    super(`Supabase ${operation} on "${table}" failed${code}: ${error.message}.${hint}`);
    this.name = "SupabaseQueryError";
    this.table = table;
    this.operation = operation;
    this.code = error.code ?? null;
  }
}

/** Throws a SupabaseQueryError naming the table, otherwise returns data (possibly null). */
export function expectData<T>(table: string, result: SupabaseResultLike<T>, operation = "select"): T | null {
  if (result.error) throw new SupabaseQueryError(table, operation, result.error);
  return result.data ?? null;
}

/** Same as expectData for list queries: never returns null. */
export function expectRows<T>(table: string, result: SupabaseResultLike<T[]>, operation = "select"): T[] {
  return expectData(table, result, operation) ?? [];
}

export function expectCount(table: string, result: SupabaseResultLike<unknown>): number {
  if (result.error) throw new SupabaseQueryError(table, "count", result.error);
  return result.count ?? 0;
}

/** PostgREST/Postgres codes meaning "column or table does not exist yet". */
export function isMissingSchemaError(error: SupabaseErrorLike | null | undefined) {
  if (!error?.code) return false;
  return ["42703", "42P01", "PGRST204", "PGRST205"].includes(error.code);
}

export function isUniqueViolation(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "23505";
}

type RangeableQuery<T> = PromiseLike<SupabaseResultLike<T[]>> & {
  range(from: number, to: number): PromiseLike<SupabaseResultLike<T[]>>;
};

/**
 * Fetches every row of a query in pages (PostgREST caps responses at
 * `max-rows`, 1000 on Supabase). `build` must return a fresh, ordered query.
 */
export async function selectAllRows<T>(
  table: string,
  build: () => RangeableQuery<T>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = expectRows(table, await build().range(from, from + pageSize - 1));
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
