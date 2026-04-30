import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "min-h-12 w-full rounded-2xl border border-[rgba(108,120,158,0.24)] bg-white/36 px-4 py-3 text-sm font-medium text-foreground outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition placeholder:text-muted/70 focus:border-accent/50 focus:bg-white/52 focus:ring-4 focus:ring-success/20 dark:bg-white/8 dark:focus:bg-white/12",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
