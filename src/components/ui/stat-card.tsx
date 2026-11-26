import type { LucideIcon } from "lucide-react";

import { AmountText, type MoneyTone } from "@/components/ui/amount-display";
import { cn } from "@/lib/utils";

/** Label over a number. Flat: no box around it (owner rule, PLAN.md section 3). */
export function StatCard({
  label,
  value,
  tone = "neutral",
  hint,
  icon: Icon,
  compact = false,
  className,
}: {
  label: string;
  value: number;
  tone?: MoneyTone;
  hint?: string;
  icon?: LucideIcon;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
        {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
        <span className="truncate">{label}</span>
      </div>
      <AmountText value={value} tone={tone} compact={compact} className="mt-1 block truncate text-[20px] font-bold" />
      {hint ? <p className="mt-0.5 truncate text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}
