import { describe, expect, it } from "vitest";

import {
  addDays,
  daysInMonth,
  daysLeftInMonth,
  hourWIB,
  isDateValue,
  isMonthValue,
  monthRange,
  monthValueWIB,
  shiftMonth,
  todayWIB,
} from "@/lib/dates";

describe("todayWIB / hourWIB (Asia/Jakarta, UTC+7)", () => {
  it("rolls over to the next day at 17:00 UTC", () => {
    expect(todayWIB(new Date("2026-11-19T16:59:59Z"))).toBe("2026-11-19");
    expect(todayWIB(new Date("2026-11-19T17:00:00Z"))).toBe("2026-11-20");
    expect(hourWIB(new Date("2026-11-19T17:00:00Z"))).toBe(0);
  });

  it("uses the WIB date between 00:00 and 06:59 WIB while UTC is still yesterday", () => {
    // 06:30 WIB on Nov 21 is 23:30 UTC on Nov 20 — toISOString().slice(0, 10) would say the 20th.
    const instant = new Date("2026-11-20T23:30:00Z");
    expect(instant.toISOString().slice(0, 10)).toBe("2026-11-20");
    expect(todayWIB(instant)).toBe("2026-11-21");
    expect(hourWIB(instant)).toBe(6);
  });

  it("returns 0-23 hours, never 24", () => {
    for (let utcHour = 0; utcHour < 24; utcHour++) {
      const hour = hourWIB(new Date(Date.UTC(2026, 10, 20, utcHour, 15)));
      expect(hour).toBe((utcHour + 7) % 24);
    }
  });
});

describe("monthValueWIB", () => {
  it("switches month at WIB midnight, not UTC midnight", () => {
    expect(monthValueWIB(new Date("2026-11-30T16:59:00Z"))).toBe("2026-11");
    expect(monthValueWIB(new Date("2026-11-30T17:00:00Z"))).toBe("2026-12");
    expect(monthValueWIB(new Date("2026-12-31T17:00:00Z"))).toBe("2027-01");
  });
});

describe("monthRange / daysInMonth", () => {
  it("uses the real last day of each month", () => {
    expect(monthRange("2026-11")).toEqual({ start: "2026-11-01", end: "2026-11-30" });
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
    expect(monthRange("2026-04")).toEqual({ start: "2026-04-01", end: "2026-04-30" });
  });

  it("handles February in common and leap years", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2100-02")).toBe(28);
    expect(monthRange("2028-02").end).toBe("2028-02-29");
  });

  it("rejects malformed months", () => {
    expect(() => monthRange("2026-1")).toThrow(/Invalid month/);
  });
});

describe("daysLeftInMonth", () => {
  it("includes today", () => {
    expect(daysLeftInMonth("2026-11-01")).toBe(30);
    expect(daysLeftInMonth("2026-11-20")).toBe(11);
    expect(daysLeftInMonth("2026-11-30")).toBe(1);
    expect(daysLeftInMonth("2028-02-29")).toBe(1);
  });

  it("accepts an instant and evaluates it in WIB", () => {
    // 2026-11-30 17:00 UTC is already Dec 1 in WIB.
    expect(daysLeftInMonth(new Date("2026-11-30T17:00:00Z"))).toBe(31);
  });
});

describe("shiftMonth / addDays / validators", () => {
  it("shifts across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 2)).toBe("2027-01");
    expect(shiftMonth("2026-06", -5)).toBe("2026-01");
  });

  it("adds days on calendar strings", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("validates month and date strings", () => {
    expect(isMonthValue("2026-11")).toBe(true);
    expect(isMonthValue("2026-13")).toBe(false);
    expect(isMonthValue(undefined)).toBe(false);
    expect(isDateValue("2026-02-29")).toBe(false);
    expect(isDateValue("2028-02-29")).toBe(true);
  });
});
