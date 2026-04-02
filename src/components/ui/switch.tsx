"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-13 items-center rounded-full border border-border transition",
        checked ? "bg-accent" : "bg-background-strong",
        className,
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", bounce: 0.22, duration: 0.32 }}
        className="block size-5 rounded-full bg-white shadow-lg"
        style={{ marginLeft: checked ? 26 : 4 }}
      />
    </button>
  );
}
