export const DEFAULT_PAGE_SIZE = 20;

/** Parses a `?page=` value into a page number >= 1. */
export function parsePage(value: string | string[] | undefined | null): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

export function totalPages(totalItems: number, pageSize = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, totalItems) / pageSize));
}

/** Clamps a page into [1, totalPages]. */
export function clampPage(page: number, pages: number): number {
  return Math.min(Math.max(1, Math.floor(page)), Math.max(1, pages));
}

/** Inclusive row range for Supabase `.range(from, to)`. */
export function pageRange(page: number, pageSize = DEFAULT_PAGE_SIZE): { from: number; to: number } {
  const safe = Math.max(1, Math.floor(page));
  const from = (safe - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

/** Slices an in-memory list for one page. */
export function paginate<T>(items: readonly T[], page: number, pageSize = DEFAULT_PAGE_SIZE) {
  const pages = totalPages(items.length, pageSize);
  const current = clampPage(page, pages);
  const { from } = pageRange(current, pageSize);
  return { items: items.slice(from, from + pageSize), page: current, totalPages: pages, totalItems: items.length };
}

/**
 * Page numbers to show, with `null` for a gap: [1, null, 4, 5, 6, null, 12].
 * Always shows the first, the last and `siblings` pages around the current one.
 */
export function pageWindow(page: number, pages: number, siblings = 1): Array<number | null> {
  const current = clampPage(page, pages);
  const wanted = new Set<number>([1, pages]);
  for (let p = current - siblings; p <= current + siblings; p += 1) {
    if (p >= 1 && p <= pages) wanted.add(p);
  }
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: Array<number | null> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(p - sorted[i - 1] === 2 ? p - 1 : null);
    out.push(p);
  });
  return out;
}

/** Builds `pathname?…&page=N`, keeping other query params and dropping `page=1`. */
export function pageHref(
  pathname: string,
  page: number,
  query: Record<string, string | undefined> = {},
  param = "page",
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key !== param && value) params.set(key, value);
  }
  if (page > 1) params.set(param, String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
