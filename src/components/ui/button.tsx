"use client";

import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    children?: React.ReactNode;
    isLoading?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, fullWidth, isLoading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

export { buttonVariants };
