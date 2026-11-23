"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type SegmentTone = "neutral" | "income" | "expense" | "debt" | "transfer";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  tone?: SegmentTone;
};

const activeText: Record<SegmentTone, string> = {
  neutral: "text-text",
  income: "text-income",
  expense: "text-expense",
  debt: "text-debt",
  transfer: "text-transfer",
};

/**
 * Single-choice segmented control (radiogroup). Arrow keys move the selection,
 * as in the WAI-ARIA radio group pattern.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
  layoutId,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  size?: "sm" | "md";
  className?: string;
  /** Unique per mounted instance so thumbs do not animate between controls. */
  layoutId?: string;
}) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const autoId = React.useId();
  const thumbId = layoutId ?? `seg-${autoId}`;

  function move(from: number, delta: number) {
    const next = (from + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex w-full rounded-[12px] border border-line bg-seg-track p-[3px]",
        className,
      )}
    >
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
              "relative flex-1 rounded-[9px] font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
              size === "sm" ? "min-h-9 text-[12px]" : "min-h-10 text-[13px]",
              active ? activeText[option.tone ?? "neutral"] : "text-muted hover:text-text",
            )}
          >
            {active ? (
              <motion.span
                layoutId={thumbId}
                aria-hidden="true"
                className="absolute inset-0 rounded-[9px] bg-seg-thumb shadow-[0_1px_2px_rgb(0_0_0/0.12)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
