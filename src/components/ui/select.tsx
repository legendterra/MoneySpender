import * as React from "react";

import { inputClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentPropsWithoutRef<"select">
>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        inputClassName,
        "cursor-pointer appearance-none pr-10",
        "[background-image:linear-gradient(45deg,transparent_50%,var(--muted)_50%),linear-gradient(135deg,var(--muted)_50%,transparent_50%)] [background-position:calc(100%-20px)_calc(50%+1px),calc(100%-15px)_calc(50%+1px)] [background-repeat:no-repeat] [background-size:5px_5px,5px_5px]",
        className,
      )}
      {...props}
    />
  );
});

Select.displayName = "Select";
