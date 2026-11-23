"use client";

import * as React from "react";

import { inputClassName } from "@/components/ui/input";
import { currencyPrefix, formatAmountNumber, toUiLocale } from "@/components/ui/format";
import { AMOUNT_MAX_DIGITS } from "@/components/ui/keypad-logic";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";

/** Integer rupiah text field: digits only, grouped while typing, numeric keyboard on phones. */
export const AmountInput = React.forwardRef<
  HTMLInputElement,
  {
    value: number;
    onChange: (value: number) => void;
    id?: string;
    className?: string;
    invalid?: boolean;
    "aria-describedby"?: string;
    autoFocus?: boolean;
  }
>(function AmountInput({ value, onChange, id, className, invalid, autoFocus, ...rest }, ref) {
  const locale = toUiLocale(useLocale());
  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] font-semibold text-muted"
      >
        {currencyPrefix(locale).trim()}
      </span>
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        aria-describedby={rest["aria-describedby"]}
        value={value > 0 ? formatAmountNumber(value, locale) : ""}
        placeholder="0"
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, AMOUNT_MAX_DIGITS);
          onChange(digits ? Number(digits) : 0);
        }}
        className={cn(inputClassName, locale === "en" ? "pl-14" : "pl-11", "tabular-nums")}
      />
    </div>
  );
});
