/**
 * Returns a same-origin path for a user-supplied `next` value, or `fallback`.
 * Resolving against the origin with the WHATWG URL parser covers `//evil.com`,
 * `/\evil.com`, `/%09/evil.com`, tabs/newlines and absolute URLs.
 */
export function safeRedirectPath(next: string | null | undefined, origin: string, fallback = "/dashboard") {
  if (!next) return fallback;
  try {
    const base = new URL(origin);
    const url = new URL(next, base);
    if (url.origin !== base.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
