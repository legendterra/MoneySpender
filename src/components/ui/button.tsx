"use client";

import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    children?: React.ReactNode;
    isLoading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  fullWidth,
  isLoading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        buttonVariants({ variant, size, fullWidth }),
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export { buttonVariants };
