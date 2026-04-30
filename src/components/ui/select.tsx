import * as React from "react";

import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentPropsWithoutRef<"select">
>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "min-h-12 w-full appearance-none rounded-2xl border border-border bg-background-elevated px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-accent focus:ring-4 focus:ring-success/20",
        className,
        "[background-image:linear-gradient(45deg,transparent_50%,var(--foreground)_50%),linear-gradient(135deg,var(--foreground)_50%,transparent_50%)] [background-position:calc(100%-22px)_calc(50%-2px),calc(100%-16px)_calc(50%-2px)] [background-size:6px_6px,6px_6px] [background-repeat:no-repeat]",
      )}
      {...props}
    />
  );
});

Select.displayName = "Select";
