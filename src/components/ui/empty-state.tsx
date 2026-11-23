import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-10",
        className,
      )}
    >
      {Icon ? (
        <div className="grid size-12 place-items-center rounded-control bg-surface-2 text-muted">
          <Icon className="size-[22px]" aria-hidden="true" />
        </div>
      ) : null}
      <div className="grid max-w-xs gap-1">
        <p className="text-[15px] font-semibold text-text">{title}</p>
        {body ? <p className="text-[13px] leading-5 text-muted">{body}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
