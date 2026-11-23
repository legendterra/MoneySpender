"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { addMonthsToKey, formatMonthLabel, jakartaMonthKey, toUiLocale } from "@/components/ui/format";
import { cn } from "@/lib/utils";

const arrow =
  "relative grid size-9 place-items-center rounded-chip text-muted transition-colors outline-none before:absolute before:-inset-1 before:content-[''] hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-ring aria-disabled:pointer-events-none aria-disabled:opacity-35";

/**
 * Previous / current / next month. Use `basePath` for link navigation (server pages,
 * builds `?month=YYYY-MM`), or `onChange` for client state.
 */
export function MonthSwitcher({
  value,
  basePath,
  onChange,
  max = jakartaMonthKey(),
  min,
  className,
}: {
  value: string;
  basePath?: string;
  onChange?: (month: string) => void;
  /** Latest selectable month, default: current month in WIB. */
  max?: string;
  min?: string;
  className?: string;
}) {
  const locale = toUiLocale(useLocale());
  const t = useTranslations("ui");
  const prev = addMonthsToKey(value, -1);
  const next = addMonthsToKey(value, 1);
  const prevDisabled = Boolean(min && prev < min);
  const nextDisabled = next > max;
  const label = formatMonthLabel(value, locale);

  function control(month: string, disabled: boolean, labelText: string, icon: React.ReactNode) {
    if (basePath && !onChange) {
      return (
        <Link
          href={`${basePath}?month=${month}`}
          aria-label={labelText}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : undefined}
          className={arrow}
          scroll={false}
        >
          {icon}
        </Link>
      );
    }
    return (
      <button
        type="button"
        aria-label={labelText}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onClick={() => onChange?.(month)}
        className={arrow}
      >
        {icon}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex h-10 items-center gap-0.5 rounded-control border border-line bg-surface px-0.5",
        className,
      )}
    >
      {control(prev, prevDisabled, t("prevMonth"), <ChevronLeft className="size-[18px]" aria-hidden="true" />)}
      <span
        aria-live="polite"
        className="min-w-[7.5rem] px-1 text-center text-[13px] font-semibold text-text tabular-nums capitalize"
      >
        {label}
      </span>
      {control(next, nextDisabled, t("nextMonth"), <ChevronRight className="size-[18px]" aria-hidden="true" />)}
    </div>
  );
}
