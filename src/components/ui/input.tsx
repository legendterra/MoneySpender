import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "min-h-12 w-full rounded-2xl border border-border bg-background-strong px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent/50 focus:ring-2 focus:ring-accent/20",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
