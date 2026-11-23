// Client-safe locale constants (request.ts imports server-only modules).
export const SUPPORTED_LOCALES = ["id", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "id";
export const LOCALE_COOKIE = "locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(...candidates: unknown[]): AppLocale {
  return (candidates.find(isAppLocale) as AppLocale | undefined) ?? DEFAULT_LOCALE;
}
