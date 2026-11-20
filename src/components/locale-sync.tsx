"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import { type AppLocale } from "@/i18n/locales";
import { writeLocaleCookie } from "@/lib/locale-client";

let attempted = false;

/**
 * Keeps the `locale` cookie equal to profiles.locale after any kind of login
 * (password, magic link, OAuth, another device). Renders nothing.
 */
export function LocaleSync({ accountLocale }: { accountLocale: AppLocale }) {
  const renderedLocale = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (attempted || renderedLocale === accountLocale) return;
    // Once per page load: avoids a refresh loop when cookies are blocked.
    attempted = true;
    writeLocaleCookie(accountLocale);
    router.refresh();
  }, [accountLocale, renderedLocale, router]);

  return null;
}
