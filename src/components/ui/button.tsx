"use client";

import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "framer-motion";
import { LoaderCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";

type ButtonProps = HTMLMotionProps<"button"> &
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
    <motion.button
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </motion.button>
  );
}

export { buttonVariants };
