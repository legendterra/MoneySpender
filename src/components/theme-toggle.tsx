"use client";

import type { CSSProperties } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { IconButton } from "@/components/ui/icon-button";
import { useIsClient } from "@/components/ui/use-media-query";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className, style }: { className?: string; style?: CSSProperties }) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("ui");
  const mounted = useIsClient();

  if (!mounted) {
    return <div aria-hidden="true" className={cn("size-11 rounded-control", className)} style={style} />;
  }

  const isDark = resolvedTheme !== "light";

  return (
    <IconButton
      label={isDark ? t("themeToLight") : t("themeToDark")}
      className={className}
      style={style}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunMedium aria-hidden="true" /> : <MoonStar aria-hidden="true" />}
    </IconButton>
  );
}
