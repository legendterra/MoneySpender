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
        "min-h-12 w-full appearance-none rounded-2xl border border-[rgba(108,120,158,0.24)] bg-white/36 px-4 py-3 text-sm font-medium text-foreground outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition focus:border-accent/50 focus:bg-white/52 focus:ring-4 focus:ring-success/20 dark:bg-white/8 dark:focus:bg-white/12",
        className,
        "[background-image:linear-gradient(45deg,transparent_50%,var(--foreground)_50%),linear-gradient(135deg,var(--foreground)_50%,transparent_50%)] [background-position:calc(100%-22px)_calc(50%-2px),calc(100%-16px)_calc(50%-2px)] [background-size:6px_6px,6px_6px] [background-repeat:no-repeat]",
      )}
      {...props}
    />
  );
});

Select.displayName = "Select";
