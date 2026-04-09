"use client";

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
