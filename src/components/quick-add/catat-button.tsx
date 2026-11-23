"use client";

import { Plus } from "lucide-react";

import { useCatat } from "@/components/quick-add/catat-provider";
import type { CatatMode } from "@/components/quick-add/types";
import { Button } from "@/components/ui/button";

/** Button that opens the global Catat sheet. */
export function CatatButton({
  children,
  mode = "expense",
  variant = "primary",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  mode?: CatatMode;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { open } = useCatat();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      aria-haspopup="dialog"
      onClick={() => open(mode)}
    >
      <Plus aria-hidden="true" />
      {children}
    </Button>
  );
}
