import * as React from "react";

import { inputClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea ref={ref} className={cn(inputClassName, "min-h-28 py-3", className)} {...props} />
  );
});

Textarea.displayName = "Textarea";
