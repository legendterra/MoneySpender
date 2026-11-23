"use client";

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type AppLocale } from "@/i18n/locales";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function writeLocaleCookie(locale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}

export type SetAccountLocaleResult = { ok: true; persisted: boolean } | { ok: false; error: string };

/**
 * Saves the language on the account (profiles.locale) when signed in and
 * mirrors it to the `locale` cookie that src/i18n/request.ts reads. The
 * cookie is always written so the UI switches even if the save fails; the
 * caller refreshes (router.refresh / reload) afterwards.
 */
export async function setAccountLocale(locale: AppLocale): Promise<SetAccountLocaleResult> {
  writeLocaleCookie(locale);

  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: true, persisted: false };

  const { error } = await supabase.from("profiles").update({ locale }).eq("id", user.id);
  if (error) {
    return { ok: false, error: `Supabase update on "profiles.locale" failed: ${error.message}` };
  }
  return { ok: true, persisted: true };
}
