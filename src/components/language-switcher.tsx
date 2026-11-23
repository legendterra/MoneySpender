"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setAccountLocale } from "@/lib/locale-client";

export function LanguageSwitcher() {
  const locale = useLocale();
  const next = locale === "id" ? "en" : "id";
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      aria-label={next === "en" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
      onClick={async () => {
        setBusy(true);
        // Saves profiles.locale when signed in; always sets the cookie.
        const result = await setAccountLocale(next);
        if (!result.ok) {
          toast.error(result.error);
          window.setTimeout(() => window.location.reload(), 2500);
          return;
        }
        window.location.reload();
      }}
    >
      {next === "en" ? "EN" : "ID"}
    </Button>
  );
}
