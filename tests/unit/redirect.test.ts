import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/redirect";

const ORIGIN = "https://money.moneyspender.net";

describe("safeRedirectPath (auth callback open-redirect guard)", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(safeRedirectPath("/dashboard", ORIGIN)).toBe("/dashboard");
    expect(safeRedirectPath("/history?month=2026-11#today", ORIGIN)).toBe("/history?month=2026-11#today");
    expect(safeRedirectPath(`${ORIGIN}/debts`, ORIGIN)).toBe("/debts");
  });

  it("falls back to /dashboard for missing values", () => {
    expect(safeRedirectPath(null, ORIGIN)).toBe("/dashboard");
    expect(safeRedirectPath("", ORIGIN)).toBe("/dashboard");
  });

  it.each([
    "//evil.com",
    "//evil.com/dashboard",
    "/\\evil.com",
    "\\\\evil.com",
    "/\t/evil.com",
    "\t//evil.com",
    "/\n/evil.com",
    "https://evil.com",
    "http://money.moneyspender.net/dashboard",
    "javascript:alert(1)",
    "https://money.moneyspender.net.evil.com/",
    "https://user@evil.com",
  ])("rejects %j", (next) => {
    expect(safeRedirectPath(next, ORIGIN)).toBe("/dashboard");
  });

  it("keeps encoded tricks on our own origin (they stay paths)", () => {
    // `/%09/evil.com` is not decoded by the URL parser, so it remains a local path.
    const tab = safeRedirectPath("/%09/evil.com", ORIGIN);
    expect(new URL(tab, ORIGIN).origin).toBe(ORIGIN);
    const slashes = safeRedirectPath("/%2F%2Fevil.com", ORIGIN);
    expect(new URL(slashes, ORIGIN).origin).toBe(ORIGIN);
  });
});
