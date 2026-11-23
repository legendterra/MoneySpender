"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Accessible name; icon-only buttons must always have one. */
  label: string;
  variant?: "ghost" | "secondary" | "primary";
  size?: "sm" | "md" | "lg";
};

const variants = {
  ghost: "bg-transparent text-muted hover:bg-surface-2 hover:text-text",
  secondary: "border border-line bg-surface text-text hover:border-line-strong",
  primary: "bg-primary text-on-primary",
} as const;

// Visual size can be smaller than 44px; the ::before layer keeps the hit area >= 44px.
const sizes = {
  sm: "size-9 rounded-chip [&_svg]:size-[18px]",
  md: "size-11 rounded-control [&_svg]:size-5",
  lg: "size-12 rounded-control [&_svg]:size-[22px]",
} as const;

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, variant = "ghost", size = "md", className, children, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          "relative inline-grid shrink-0 place-items-center transition-colors outline-none before:absolute before:left-1/2 before:top-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
