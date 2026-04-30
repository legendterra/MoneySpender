"use client";

import { useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

export function ThemeToggle({ className, style }: { className?: string; style?: CSSProperties }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-11 w-11 rounded-2xl border border-border bg-background-elevated",
          className,
        )}
        style={style}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background-elevated text-foreground shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:bg-background-strong",
        className,
      )}
      style={style}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Aktifkan day mode" : "Aktifkan night mode"}
    >
      {isDark ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
    </button>
  );
}
