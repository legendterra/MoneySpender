import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  meta,
  action,
  className,
  as: Heading = "h2",
  id,
}: {
  title: string;
  /** Right-aligned secondary info, e.g. a day total. */
  meta?: React.ReactNode;
  /** Right-aligned link, shown instead of meta when both are given on narrow widths. */
  action?: { label: string; href: string };
  className?: string;
  as?: "h2" | "h3";
  id?: string;
}) {
  return (
    <div className={cn("flex min-h-9 items-center justify-between gap-3", className)}>
      <Heading id={id} className="text-[15px] font-semibold tracking-tight text-text">
        {title}
      </Heading>
      <div className="flex min-w-0 items-center gap-3">
        {meta ? <div className="truncate text-[13px] font-medium text-muted tabular-nums">{meta}</div> : null}
        {action ? (
          <Link
            href={action.href}
            className="-mr-2 inline-flex min-h-11 items-center gap-0.5 rounded-chip px-2 text-[13px] font-semibold text-primary-ink outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {action.label}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
