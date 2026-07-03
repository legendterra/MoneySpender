import { describe, expect, it } from "vitest";

import {
  calculateRate,
  cn,
  formatCurrency,
  formatDate,
  getMonthRange,
  toMonthInput,
  urlBase64ToUint8Array,
} from "@/lib/utils";

describe("cn", () => {
  it("merges conflicting tailwind classes, last one wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });
});

describe("formatCurrency", () => {
  it("formats IDR without decimals using dot thousands separators", () => {
    const result = formatCurrency(1_250_000);
    expect(result).toContain("Rp");
    expect(result).toContain("1.250.000");
  });

  it("treats null-ish values as zero", () => {
    expect(formatCurrency(Number.NaN ? 0 : (null as unknown as number))).toContain("0");
  });

  it("formats supported currencies with their own locale", () => {
    expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
    expect(formatCurrency(1000, "JPY")).toBe("￥1,000");
  });

  it("falls back to Indonesian formatting for unknown currency codes", () => {
    expect(formatCurrency(500, "XYZ")).toContain("500");
  });
});

describe("formatDate", () => {
  it("renders ISO dates as dd/MM/yyyy", () => {
    expect(formatDate("2026-07-04")).toBe("04/07/2026");
  });

  it("returns the raw string when unparseable", () => {
    expect(formatDate("bukan-tanggal")).toBe("bukan-tanggal");
  });
});

describe("toMonthInput", () => {
  it("pads single-digit months", () => {
    expect(toMonthInput(new Date(2026, 6, 4))).toBe("2026-07");
    expect(toMonthInput(new Date(2026, 0, 15))).toBe("2026-01");
  });
});

describe("getMonthRange", () => {
  // Expectations are literal strings on purpose: building them via
  // toISOString() would mask the UTC-offset bug this guards against.
  it("returns the first and last day of a normal month", () => {
    expect(getMonthRange("2026-03")).toEqual({ start: "2026-03-01", end: "2026-03-31" });
  });

  it("handles February, including leap years", () => {
    expect(getMonthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(getMonthRange("2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
  });

  it("handles December without rolling into the next year", () => {
    expect(getMonthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });
});

describe("calculateRate", () => {
  it("returns 0 when there is no income", () => {
    expect(calculateRate(0, 500)).toBe(0);
  });

  it("returns the saving percentage", () => {
    expect(calculateRate(100, 25)).toBe(75);
  });

  it("clamps to 0 when expenses exceed income", () => {
    expect(calculateRate(100, 250)).toBe(0);
  });
});

describe("urlBase64ToUint8Array", () => {
  it("decodes url-safe base64", () => {
    // "hello" in url-safe base64
    const bytes = urlBase64ToUint8Array("aGVsbG8");
    expect([...bytes]).toEqual([104, 101, 108, 108, 111]);
  });
});
