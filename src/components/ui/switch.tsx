"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-13 items-center rounded-full border border-border transition",
        checked ? "bg-accent" : "bg-background-strong",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        className="block size-5 rounded-full bg-white shadow-lg"
        style={{
          marginLeft: 4,
          transform: `translateX(${checked ? 22 : 0}px)`,
          transition: "transform 200ms ease-out",
        }}
      />
    </button>
  );
}
