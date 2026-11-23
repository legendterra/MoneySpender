import * as React from "react";

import { cn } from "@/lib/utils";

export const inputClassName =
  "min-h-12 w-full rounded-chip border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] font-medium text-text outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ring)_22%,transparent)] aria-[invalid=true]:border-expense disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  ({ className, ...props }, ref) => {
    return <input ref={ref} className={cn(inputClassName, className)} {...props} />;
  },
);

Input.displayName = "Input";
