import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "min-h-12 w-full rounded-2xl border border-border bg-background-elevated px-4 py-3 text-sm font-medium text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-success/20",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
