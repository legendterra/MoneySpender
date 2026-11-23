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

/** Square avatar with an initial or icon, colored by money meaning. */
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
        "grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-2 text-[14px] font-bold",
        avatarTone[tone],
        className,
      )}
    >
      {Icon ? <Icon className="size-[18px]" /> : (label ?? "?").trim().charAt(0).toUpperCase()}
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

/** One row in a list. Place rows inside a container with `divide-y divide-line`. */
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

  const base = cn("flex min-h-14 w-full items-center gap-3 py-2", className);
  const interactive =
    "-mx-2 rounded-control px-2 outline-none transition-colors hover:bg-surface-2/70 focus-visible:outline-2 focus-visible:outline-ring w-[calc(100%+1rem)]";

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
