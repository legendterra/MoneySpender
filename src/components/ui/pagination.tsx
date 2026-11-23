import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { pageHref, pageWindow } from "@/lib/paging";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  pathname: string;
  /** Current query params to keep (filters, search). */
  query?: Record<string, string | undefined>;
  param?: string;
  className?: string;
};

const cell =
  "inline-grid min-h-11 min-w-11 place-items-center rounded-control px-2 text-sm font-semibold tabular-nums transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Link-based pager: works in Server Components, keeps filters in the URL, no layout shift. */
export function Pagination({ page, totalPages, pathname, query, param = "page", className }: PaginationProps) {
  const t = useTranslations("ui");
  if (totalPages <= 1) return null;

  const href = (p: number) => pageHref(pathname, p, query, param);
  const prev = page > 1 ? href(page - 1) : null;
  const next = page < totalPages ? href(page + 1) : null;

  return (
    <nav aria-label={t("pagination")} className={cn("flex items-center justify-between gap-2 pt-2", className)}>
      {prev ? (
        <Link href={prev} scroll={false} className={cn(cell, "gap-1 text-text hover:bg-surface-2")} aria-label={t("pagePrev")}>
          <ChevronLeft className="size-[18px]" aria-hidden />
        </Link>
      ) : (
        <span className={cn(cell, "text-muted opacity-40")} aria-hidden>
          <ChevronLeft className="size-[18px]" />
        </span>
      )}

      <ol className="flex items-center gap-1">
        {pageWindow(page, totalPages).map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} className="px-1 text-muted" aria-hidden>
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={href(p)}
                scroll={false}
                aria-current={p === page ? "page" : undefined}
                aria-label={t("pageOf", { page: p, total: totalPages })}
                className={cn(cell, p === page ? "bg-surface-2 text-text ring-1 ring-line-strong" : "text-muted hover:bg-surface-2 hover:text-text")}
              >
                {p}
              </Link>
            </li>
          ),
        )}
      </ol>

      {next ? (
        <Link href={next} scroll={false} className={cn(cell, "gap-1 text-text hover:bg-surface-2")} aria-label={t("pageNext")}>
          <ChevronRight className="size-[18px]" aria-hidden />
        </Link>
      ) : (
        <span className={cn(cell, "text-muted opacity-40")} aria-hidden>
          <ChevronRight className="size-[18px]" />
        </span>
      )}
    </nav>
  );
}
