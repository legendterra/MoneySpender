import { describe, expect, it } from "vitest";

import {
  addDaysToKey,
  addMonthsToKey,
  daysLeftInMonth,
  formatMoney,
  jakartaDateKey,
} from "@/components/ui/format";

describe("formatMoney", () => {
  it("formats rupiah the Indonesian way", () => {
    expect(formatMoney(142000)).toBe("Rp142.000");
    expect(formatMoney(0)).toBe("Rp0");
    expect(formatMoney(-58000)).toBe("\u2212Rp58.000");
    expect(formatMoney(200000, { sign: "always" })).toBe("+Rp200.000");
  });

  it("formats compact amounts per locale", () => {
    expect(formatMoney(8_500_000, { compact: true })).toBe("Rp8,5\u00a0jt");
    expect(formatMoney(8_500_000, { compact: true, locale: "en" })).toBe("IDR 8.5M");
    expect(formatMoney(142_000, { locale: "en" })).toBe("IDR 142,000");
    expect(formatMoney(950, { compact: true })).toBe("Rp950");
  });
});

describe("Jakarta date helpers", () => {
  it("uses the WIB calendar day, not UTC", () => {
    // 2026-11-19 18:30 UTC is already 2026-11-20 01:30 in Jakarta.
    expect(jakartaDateKey(new Date(Date.UTC(2026, 10, 19, 18, 30)))).toBe("2026-11-20");
    // 2026-11-20 16:59 UTC is 23:59 WIB, still the 20th.
    expect(jakartaDateKey(new Date(Date.UTC(2026, 10, 20, 16, 59)))).toBe("2026-11-20");
  });

  it("does calendar arithmetic on keys", () => {
    expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysToKey("2028-02-28", 1)).toBe("2028-02-29");
    expect(addMonthsToKey("2026-01", -1)).toBe("2025-12");
    expect(addMonthsToKey("2026-12", 1)).toBe("2027-01");
  });

  it("counts days left including today", () => {
    expect(daysLeftInMonth("2026-11-20")).toBe(11);
    expect(daysLeftInMonth("2026-11-30")).toBe(1);
    expect(daysLeftInMonth("2026-02-01")).toBe(28);
  });
});
