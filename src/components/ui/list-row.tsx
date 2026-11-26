import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type RowTone = "neutral" | "income" | "expense" | "debt" | "transfer" | "primary";

const avatarTone: Record<RowTone, string> = {
  neutral: "text-muted",
  income: "text-income",
  expense: "text-expense",
  debt: "text-debt",
  transfer: "text-transfer",
  primary: "text-primary-ink",
};

/**
 * Leading mark of a row: an icon (or an initial) colored by money meaning.
 * Flat: no tile behind it (owner rule, PLAN.md section 3).
 */
export function RowAvatar({
  label,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label?: string;
  icon?: LucideIcon;
  tone?: RowTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center text-[15px] font-semibold",
        !Icon && "rounded-full ring-1 ring-line-strong ring-inset text-[13px]",
        avatarTone[tone],
        className,
      )}
    >
      {Icon ? (
        <Icon className="size-5" strokeWidth={1.9} />
      ) : (
        (label ?? "?").trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}

type ListRowProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Secondary line under the trailing element, e.g. a time. */
  trailingSub?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
};

/** One plain row. Place rows inside a container with `divide-y divide-line`. */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  trailingSub,
  href,
  onClick,
  className,
}: ListRowProps) {
  const body = (
    <>
      {leading}
      <span className="grid min-w-0 flex-1 gap-0.5 text-left">
        <span className="truncate text-[14px] font-medium text-text">{title}</span>
        {subtitle ? <span className="truncate text-[12px] text-muted">{subtitle}</span> : null}
      </span>
      {trailing || trailingSub ? (
        <span className="grid shrink-0 justify-items-end gap-0.5 text-right">
          {trailing ? <span className="text-[14px] font-semibold">{trailing}</span> : null}
          {trailingSub ? <span className="text-[12px] text-muted">{trailingSub}</span> : null}
        </span>
      ) : null}
    </>
  );

  const base = cn("flex min-h-14 w-full items-center gap-3 py-2.5", className);
  // Hover/focus feedback only; at rest the row sits flat on the page.
  const interactive =
    "outline-none transition-colors hover:bg-surface-2/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring";

  if (href) {
    return (
      <Link href={href} className={cn(base, interactive)}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, interactive)}>
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
}
