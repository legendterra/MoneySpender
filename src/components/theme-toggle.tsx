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
          "h-11 w-11 rounded-full border border-border bg-background-elevated",
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
        "inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(108,120,158,0.26)] bg-white/30 text-foreground shadow-[0_10px_28px_rgba(54,74,155,0.08)] transition hover:-translate-y-0.5 hover:border-white/80 hover:bg-white/50 dark:bg-white/8 dark:hover:bg-white/12",
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
