"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

/** App-wide toasts (sonner), themed with the design tokens. Import `toast` from "sonner". */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      position="top-center"
      theme={resolvedTheme === "light" ? "light" : "dark"}
      offset={{ top: "max(12px, env(safe-area-inset-top))" }}
      mobileOffset={{ top: "max(12px, env(safe-area-inset-top))" }}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-control !border !border-line !bg-surface !text-text !shadow-pop !font-sans !text-[14px] !gap-2.5",
          description: "!text-muted !text-[13px]",
          success: "[&_[data-icon]]:!text-income",
          error: "[&_[data-icon]]:!text-expense",
          warning: "[&_[data-icon]]:!text-debt",
          info: "[&_[data-icon]]:!text-transfer",
          actionButton: "!bg-primary !text-on-primary !font-semibold !rounded-chip",
          cancelButton: "!bg-surface-2 !text-text !rounded-chip",
          closeButton: "!bg-surface !border-line !text-muted",
        },
      }}
    />
  );
}
