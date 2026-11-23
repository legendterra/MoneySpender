"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

// Local flat primitives for the screens in this branch (PLAN.md section 3,
// owner rule: no cards). Structure = type, whitespace and 1px row dividers.

const tabBase =
  "relative -mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 px-0.5 text-[14px] whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const tabOn = "border-text font-semibold text-text";
const tabOff = "border-transparent font-medium text-muted hover:text-text";

/** Text tabs that navigate (URL state). Active = underline + text color. */
export function LinkTabs({
  items,
  value,
  label,
  className,
}: {
  items: Array<{ value: string; label: string; href: string }>;
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("scrollbar-none flex gap-5 overflow-x-auto border-b border-line", className)}>
      {items.map((item) => (
        <Link
          key={item.value}
          href={item.href}
          scroll={false}
          aria-current={item.value === value ? "page" : undefined}
          className={cn(tabBase, item.value === value ? tabOn : tabOff)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Single choice in text-tab style (radiogroup), for forms and sheets. */
export function TextChoice<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Array<{ value: T; label: string; tone?: "income" | "expense" }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  function move(from: number, delta: number) {
    const next = (from + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex gap-5 border-b border-line", className)}>
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(index, -1);
              }
            }}
            className={cn(
              tabBase,
              active ? tabOn : tabOff,
              active && option.tone === "income" && "border-income text-income",
              active && option.tone === "expense" && "border-expense text-expense",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Vertical single-choice list with a check mark (language, theme). */
export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
}: {
  options: Array<{ value: T; label: string; hint?: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="divide-y divide-line">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className="flex min-h-12 w-full items-center gap-3 py-2 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          >
            <span className="grid min-w-0 flex-1">
              <span className={cn("text-[15px]", active ? "font-semibold text-text" : "text-text")}>{option.label}</span>
              {option.hint ? <span className="text-[12px] text-muted">{option.hint}</span> : null}
            </span>
            {active ? <Check className="size-[18px] shrink-0 text-primary-ink" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Previous / label / next without a box. Links when hrefs are given. */
export function PlainStepper({
  label,
  prev,
  next,
  prevLabel,
  nextLabel,
  className,
}: {
  label: string;
  prev: { href: string } | null;
  next: { href: string } | null;
  prevLabel: string;
  nextLabel: string;
  className?: string;
}) {
  const arrow =
    "relative grid size-9 place-items-center rounded-chip text-muted transition-colors outline-none before:absolute before:-inset-1 before:content-[''] hover:text-text focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {prev ? (
        <Link href={prev.href} scroll={false} aria-label={prevLabel} className={arrow}>
          <ChevronLeft className="size-[18px]" aria-hidden="true" />
        </Link>
      ) : (
        <span className={cn(arrow, "opacity-30")} aria-hidden="true">
          <ChevronLeft className="size-[18px]" />
        </span>
      )}
      <span aria-live="polite" className="min-w-[7rem] text-center text-[14px] font-semibold text-text tabular-nums capitalize">
        {label}
      </span>
      {next ? (
        <Link href={next.href} scroll={false} aria-label={nextLabel} className={arrow}>
          <ChevronRight className="size-[18px]" aria-hidden="true" />
        </Link>
      ) : (
        <span className={cn(arrow, "opacity-30")} aria-hidden="true">
          <ChevronRight className="size-[18px]" />
        </span>
      )}
    </div>
  );
}
