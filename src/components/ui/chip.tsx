"use client";

import * as React from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ChipProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: React.ReactNode;
  /** Toggle state; rendered as aria-pressed. Leave undefined for action chips. */
  selected?: boolean;
  /**
   * "plain" (default) = flat text filter on the page, no box (owner rule, PLAN.md section 3).
   * Inside sheets: "choice" = category style, "meta" = wallet/date pickers, "dashed" = add/template.
   */
  variant?: "plain" | "choice" | "meta" | "dashed";
  icon?: LucideIcon;
  chevron?: boolean;
};

// 36px visual height; ::before extends the hit target to 44px.
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { children, selected, variant = "plain", icon: Icon, chevron, className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cn(
        "relative inline-flex h-9 max-w-full shrink-0 items-center gap-1.5 rounded-chip text-[13px] font-medium whitespace-nowrap transition-colors outline-none before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        variant === "plain"
          ? cn("px-1", selected ? "font-semibold text-primary-ink" : "text-muted hover:text-text")
          : "border px-3",
        variant === "choice" &&
          (selected
            ? "border-primary-edge bg-primary-soft font-semibold text-primary-ink"
            : "border-line bg-transparent text-muted hover:border-line-strong hover:text-text"),
        variant === "meta" &&
          "border-line bg-surface-2 text-text hover:border-line-strong [&_svg]:text-muted",
        variant === "dashed" &&
          "border-dashed border-line-strong bg-transparent text-muted hover:text-text",
        className,
      )}
      {...props}
    >
      {Icon ? <Icon aria-hidden="true" /> : null}
      <span className="min-w-0 truncate">{children}</span>
      {chevron ? <ChevronDown aria-hidden="true" className="-mr-0.5 !size-3.5" /> : null}
    </button>
  );
});

export const ChipGroup = React.forwardRef<
  HTMLDivElement,
  {
    /** Accessible group name, e.g. "Kategori". */
    label: string;
    children: React.ReactNode;
    /** Single horizontally scrolling line instead of wrapping. */
    scroll?: boolean;
    className?: string;
  }
>(function ChipGroup({ label, children, scroll = false, className }, ref) {
  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className={cn(
        "flex gap-2",
        scroll
          ? "scrollbar-none -mx-4 overflow-x-auto px-4 py-1 [scroll-padding-inline:1rem]"
          : "flex-wrap",
        className,
      )}
    >
      {children}
    </div>
  );
});
