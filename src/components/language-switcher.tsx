"use client";

import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

export function LanguageSwitcher() {
  const locale = useLocale();
  const next = locale === "id" ? "en" : "id";

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={next === "en" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
      onClick={() => {
        document.cookie = `locale=${next}; path=/; max-age=${YEAR_SECONDS}; samesite=lax`;
        window.location.reload();
      }}
    >
      {next === "en" ? "EN" : "ID"}
    </Button>
  );
}
