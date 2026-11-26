"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type TabItem<T extends string> = {
  value: T;
  label: string;
  /** Short secondary text after the label, e.g. a total. */
  meta?: string;
  /** Link tabs (server-rendered sections); otherwise `onChange` is called. */
  href?: string;
};

/**
 * Text tabs with an underline under the active one (owner rule, PLAN.md section 3:
 * no pill or segmented boxes for switching sections). Arrow keys move between tabs.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
  layoutId,
}: {
  items: TabItem<T>[];
  value: T;
  onChange?: (value: T) => void;
  /** Accessible name of the tab list. */
  label: string;
  className?: string;
  /** Unique per mounted instance so the underline does not jump between lists. */
  layoutId?: string;
}) {
  const refs = React.useRef<Array<HTMLElement | null>>([]);
  const autoId = React.useId();
  const underlineId = layoutId ?? `tabs-${autoId}`;

  function move(from: number, delta: number) {
    const next = (from + delta + items.length) % items.length;
    refs.current[next]?.focus();
    if (!items[next].href) onChange?.(items[next].value);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("scrollbar-none flex gap-6 overflow-x-auto border-b border-line", className)}
    >
      {items.map((item, index) => {
        const active = item.value === value;
        const content = (
          <>
            <span>{item.label}</span>
            {item.meta ? (
              <span className={cn("ml-1.5 text-[13px] font-medium tabular-nums", active ? "text-muted" : "text-muted/80")}>
                {item.meta}
              </span>
            ) : null}
            {active ? (
              <motion.span
                layoutId={underlineId}
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary-ink"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            ) : null}
          </>
        );
        const shared = {
          role: "tab" as const,
          "aria-selected": active,
          tabIndex: active ? 0 : -1,
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              move(index, 1);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              move(index, -1);
            }
          },
          className: cn(
            "relative inline-flex min-h-11 shrink-0 items-center whitespace-nowrap text-[15px] font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            active ? "text-text" : "text-muted hover:text-text",
          ),
        };
        return item.href ? (
          <Link
            key={item.value}
            href={item.href}
            scroll={false}
            ref={(node) => {
              refs.current[index] = node;
            }}
            {...shared}
          >
            {content}
          </Link>
        ) : (
          <button
            key={item.value}
            type="button"
            ref={(node) => {
              refs.current[index] = node;
            }}
            onClick={() => onChange?.(item.value)}
            {...shared}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
