import { describe, expect, it } from "vitest";

import {
  DIGEST_TEXTS,
  buildBudgetAlertMessage,
  buildDigestMessage,
  buildTestMessage,
  chooseDigestKind,
  digestSlots,
  formatPushAmount,
  isWithinActiveWindow,
  slotPosition,
  type DigestKind,
  type DigestMessageInput,
} from "@/lib/digest";

const window9to21 = (every: number) => ({ digest_every_hours: every, active_start: 9, active_end: 21 });

describe("digestSlots", () => {
  it("every 2 hours: start .. end inclusive", () => {
    expect(digestSlots(window9to21(2))).toEqual([9, 11, 13, 15, 17, 19, 21]);
  });

  it("every 3 hours (default)", () => {
    expect(digestSlots(window9to21(3))).toEqual([9, 12, 15, 18, 21]);
  });

  it("every 4 hours", () => {
    expect(digestSlots(window9to21(4))).toEqual([9, 13, 17, 21]);
  });

  it("interval 0 = three times a day: start, rounded midpoint, end", () => {
    expect(digestSlots(window9to21(0))).toEqual([9, 15, 21]);
    expect(digestSlots({ digest_every_hours: 0, active_start: 8, active_end: 21 })).toEqual([8, 15, 21]);
    // Midpoint collapsing into the end is not sent twice.
    expect(digestSlots({ digest_every_hours: 0, active_start: 9, active_end: 10 })).toEqual([9, 10]);
  });

  it("never schedules past active_end when the interval does not land on it", () => {
    expect(digestSlots({ digest_every_hours: 3, active_start: 8, active_end: 22 })).toEqual([8, 11, 14, 17, 20]);
    expect(digestSlots({ digest_every_hours: 4, active_start: 20, active_end: 23 })).toEqual([20]);
  });

  it("falls back to 09-21 every 3 hours for invalid settings", () => {
    expect(digestSlots({ digest_every_hours: 5, active_start: 9, active_end: 21 })).toEqual([9, 12, 15, 18, 21]);
    expect(digestSlots({ digest_every_hours: 2, active_start: 22, active_end: 6 })).toEqual([9, 11, 13, 15, 17, 19, 21]);
  });
});

describe("active window and slot position", () => {
  const schedule = window9to21(3);

  it("is inclusive on both ends and silent outside (quiet hours)", () => {
    expect(isWithinActiveWindow(schedule, 9)).toBe(true);
    expect(isWithinActiveWindow(schedule, 21)).toBe(true);
    expect(isWithinActiveWindow(schedule, 8)).toBe(false);
    expect(isWithinActiveWindow(schedule, 22)).toBe(false);
    expect(isWithinActiveWindow(schedule, 0)).toBe(false);
  });

  it("returns first / middle / last / null", () => {
    expect(slotPosition(schedule, 9)).toBe("first");
    expect(slotPosition(schedule, 12)).toBe("middle");
    expect(slotPosition(schedule, 18)).toBe("middle");
    expect(slotPosition(schedule, 21)).toBe("last");
    expect(slotPosition(schedule, 10)).toBeNull(); // inside window, not a slot
    expect(slotPosition(schedule, 3)).toBeNull(); // outside window
    expect(slotPosition(schedule, 23)).toBeNull();
  });

  it("treats a single slot as the first one", () => {
    expect(slotPosition({ digest_every_hours: 4, active_start: 20, active_end: 23 }, 20)).toBe("first");
  });
});

describe("chooseDigestKind", () => {
  const base = { hour: 9, hasRecordsToday: true, remainingToday: 10_000 };

  it("first = morning brief, middle = remaining, last = recap", () => {
    expect(chooseDigestKind({ ...base, position: "first" })).toBe("morning");
    expect(chooseDigestKind({ ...base, position: "middle", hour: 15 })).toBe("midday");
    expect(chooseDigestKind({ ...base, position: "last", hour: 21 })).toBe("recap");
  });

  it("middle slot without records: reminder only from 12:00", () => {
    expect(chooseDigestKind({ ...base, position: "middle", hour: 11, hasRecordsToday: false })).toBe("midday");
    expect(chooseDigestKind({ ...base, position: "middle", hour: 12, hasRecordsToday: false })).toBe("no_records");
    expect(chooseDigestKind({ ...base, position: "last", hour: 21, hasRecordsToday: false })).toBe("recap");
  });

  it("over-allowance wins in every slot", () => {
    for (const position of ["first", "middle", "last"] as const) {
      expect(chooseDigestKind({ ...base, position, remainingToday: -1 })).toBe("over");
    }
  });
});

describe("formatPushAmount", () => {
  it("uses Rp142.000 for id and IDR 142,000 for en", () => {
    expect(formatPushAmount(142_000, "id")).toBe("Rp142.000");
    expect(formatPushAmount(142_000, "en")).toBe("IDR 142,000");
    expect(formatPushAmount(-5_000, "id")).toBe("-Rp5.000");
    expect(formatPushAmount(10.6, "en", "USD")).toBe("USD 11");
  });
});

describe("buildDigestMessage", () => {
  const allowance = {
    allowanceToday: 100_000,
    spentToday: 30_000,
    remainingToday: 70_000,
    tomorrowAllowance: 107_000,
    spendable: 1_100_000,
    daysLeft: 11,
  };
  const message = (overrides: Partial<DigestMessageInput>) =>
    buildDigestMessage({
      locale: "id",
      hideAmounts: false,
      position: "first",
      hour: 9,
      hasRecordsToday: true,
      allowance,
      ...overrides,
    });

  it("morning brief (id + en) shows allowance and money left for the month", () => {
    const id = message({});
    expect(id.kind).toBe("morning");
    expect(id.title).toBe("Jatah aman hari ini");
    expect(id.body).toBe("Jatah aman hari ini Rp100.000. Sisa uang bulan ini Rp1.100.000 untuk 11 hari.");
    const en = message({ locale: "en" });
    expect(en.title).toBe("Today's safe-to-spend");
    expect(en.body).toBe("You can safely spend IDR 100,000 today. IDR 1,100,000 left for the rest of the month (11 days).");
  });

  it("middle slot shows remaining and spent", () => {
    expect(message({ position: "middle", hour: 15 }).body).toBe("Sisa jatah hari ini Rp70.000. Sudah terpakai Rp30.000.");
    expect(message({ position: "middle", hour: 15, locale: "en" }).body).toBe("IDR 70,000 left for today. Spent so far: IDR 30,000.");
  });

  it("no-records reminder after 12:00 in a middle slot", () => {
    const id = message({ position: "middle", hour: 15, hasRecordsToday: false });
    expect(id.kind).toBe("no_records");
    expect(id.body).toContain("jam 15.00");
    expect(message({ position: "middle", hour: 15, hasRecordsToday: false, locale: "en" }).body).toContain("It's 15:00");
  });

  it("last slot recap with tomorrow's allowance, and the month-end variant", () => {
    expect(message({ position: "last", hour: 21 }).body).toBe(
      "Hari ini terpakai Rp30.000 dari jatah Rp100.000. Jatah besok Rp107.000.",
    );
    expect(message({ position: "last", hour: 21, locale: "en" }).body).toBe(
      "You spent IDR 30,000 of your IDR 100,000 allowance today. Tomorrow: IDR 107,000.",
    );
    const monthEnd = message({ position: "last", hour: 21, allowance: { ...allowance, tomorrowAllowance: null, daysLeft: 1 } });
    expect(monthEnd.body).toContain("Besok mulai bulan baru.");
  });

  it("over-allowance text with tomorrow's adjusted allowance", () => {
    const over = { ...allowance, spentToday: 160_000, remainingToday: -60_000, tomorrowAllowance: 94_000 };
    const id = message({ position: "middle", hour: 15, allowance: over });
    expect(id.kind).toBe("over");
    expect(id.title).toBe("Lewat jatah hari ini");
    expect(id.body).toBe("Pengeluaran hari ini Rp60.000 di atas jatah. Jatah besok jadi Rp94.000.");
    expect(message({ position: "first", locale: "en", allowance: over }).body).toBe(
      "You're IDR 60,000 over today's allowance. Tomorrow's allowance is now IDR 94,000.",
    );
  });

  it("hide_amounts removes every amount from every variant (id + en)", () => {
    const variants: Array<Partial<DigestMessageInput>> = [
      { position: "first" },
      { position: "middle", hour: 15 },
      { position: "middle", hour: 15, hasRecordsToday: false },
      { position: "last", hour: 21 },
      { position: "middle", hour: 15, allowance: { ...allowance, remainingToday: -60_000 } },
    ];
    for (const locale of ["id", "en"] as const) {
      for (const variant of variants) {
        const result = message({ ...variant, locale, hideAmounts: true });
        expect(result.body).not.toMatch(/Rp|IDR|\d{2,}/);
        expect(result.body).toBe(DIGEST_TEXTS[locale][result.kind as DigestKind].hidden);
      }
    }
  });
});

describe("budget and test messages", () => {
  it("budget 80% / 100% in id and en", () => {
    expect(buildBudgetAlertMessage({ locale: "id", categoryName: "Makan", ratio: 85, threshold: 80 })).toEqual({
      kind: "budget",
      title: "Budget Makan 80%",
      body: "Budget Makan bulan ini sudah terpakai 85%.",
    });
    expect(buildBudgetAlertMessage({ locale: "en", categoryName: "Food", ratio: 104, threshold: 100 }).body).toBe(
      "Your Food budget for this month is used up (104%).",
    );
  });

  it("test notification text per locale", () => {
    expect(buildTestMessage("id").title).toBe("Notifikasi aktif");
    expect(buildTestMessage("en").title).toBe("Notifications are on");
  });
});
