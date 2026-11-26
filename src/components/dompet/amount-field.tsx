"use client";

import * as React from "react";
import { useLocale } from "next-intl";

import { currencyPrefix, formatAmountNumber, parseAmountInput, toUiLocale } from "@/components/ui/format";
import { inputClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Text field for whole rupiah that groups digits while typing ("1.250.000").
 * `negative` flips the sign (credit cards start below zero); the value is an integer.
 */
export const AmountField = React.forwardRef<
  HTMLInputElement,
  {
    value: number;
    onChange: (value: number) => void;
    negative?: boolean;
    id?: string;
    "aria-describedby"?: string;
    enterKeyHint?: React.InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
    className?: string;
  }
>(function AmountField({ value, onChange, negative = false, className, ...props }, ref) {
  const locale = toUiLocale(useLocale());
  const abs = Math.abs(value);
  const text = abs ? formatAmountNumber(abs, locale) : "";

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] font-semibold text-muted"
      >
        {negative ? "\u2212" : ""}
        {currencyPrefix(locale).trim()}
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        placeholder="0"
        onChange={(event) => {
          const parsed = parseAmountInput(event.target.value) ?? 0;
          onChange(negative ? -parsed : parsed);
        }}
        className={cn(
          inputClassName,
          "tabular-nums",
          locale === "en" ? (negative ? "pl-16" : "pl-14") : negative ? "pl-14" : "pl-12",
          className,
        )}
        {...props}
      />
    </div>
  );
});
