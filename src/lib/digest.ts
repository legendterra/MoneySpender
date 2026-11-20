import type { AppLocale } from "@/i18n/locales";
import type { AllowanceResult } from "@/lib/allowance";

// Pure slot selection + message building for the hourly digest (PLAN.md section 7).
// Push texts are server-side and follow profiles.locale, not next-intl.

export type DigestSchedule = {
  /** 0 = three times a day: active_start, round((start + end) / 2), active_end. */
  digest_every_hours: number;
  active_start: number;
  active_end: number;
};

export type SlotPosition = "first" | "middle" | "last";
export type DigestKind = "morning" | "midday" | "no_records" | "recap" | "over";
export type MessageKind = DigestKind | "budget" | "test";

export type PushMessage = { kind: MessageKind; title: string; body: string };

const DEFAULT_SCHEDULE = { every: 3, start: 9, end: 21 };

export function normalizeSchedule(schedule: DigestSchedule) {
  const every = Number(schedule.digest_every_hours);
  const start = Number(schedule.active_start);
  const end = Number(schedule.active_end);
  const validWindow =
    Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end <= 23 && start < end;
  return {
    every: [0, 2, 3, 4].includes(every) ? every : DEFAULT_SCHEDULE.every,
    start: validWindow ? start : DEFAULT_SCHEDULE.start,
    end: validWindow ? end : DEFAULT_SCHEDULE.end,
  };
}

/** WIB hours that get a digest, ascending. Never outside [active_start, active_end]. */
export function digestSlots(schedule: DigestSchedule): number[] {
  const { every, start, end } = normalizeSchedule(schedule);
  if (every === 0) return [...new Set([start, Math.round((start + end) / 2), end])];
  const slots: number[] = [];
  for (let hour = start; hour <= end; hour += every) slots.push(hour);
  return slots;
}

export function isWithinActiveWindow(schedule: DigestSchedule, hour: number) {
  const { start, end } = normalizeSchedule(schedule);
  return hour >= start && hour <= end;
}

/** Position of `hour` among the slots, or null when no digest is due. A single slot counts as "first". */
export function slotPosition(schedule: DigestSchedule, hour: number): SlotPosition | null {
  const slots = digestSlots(schedule);
  const index = slots.indexOf(hour);
  if (index < 0) return null;
  if (index === 0) return "first";
  return index === slots.length - 1 ? "last" : "middle";
}

export const NO_RECORDS_FROM_HOUR = 12;

export function chooseDigestKind(input: {
  position: SlotPosition;
  hour: number;
  hasRecordsToday: boolean;
  remainingToday: number;
}): DigestKind {
  if (input.remainingToday < 0) return "over";
  if (input.position === "first") return "morning";
  if (input.position === "last") return "recap";
  return !input.hasRecordsToday && input.hour >= NO_RECORDS_FROM_HOUR ? "no_records" : "midday";
}

export function formatPushAmount(amount: number, locale: AppLocale, currency = "IDR") {
  const value = Math.round(Number(amount) || 0);
  const sign = value < 0 ? "-" : "";
  const digits = new Intl.NumberFormat(locale === "en" ? "en-US" : "id-ID", { maximumFractionDigits: 0 }).format(
    Math.abs(value),
  );
  if (currency === "IDR") return locale === "en" ? `${sign}IDR ${digits}` : `${sign}Rp${digits}`;
  return `${sign}${currency} ${digits}`;
}

type Vars = {
  allowance: string;
  spendable: string;
  daysLeft: number;
  remaining: string;
  spent: string;
  over: string;
  tomorrow: string | null;
  hour: string;
};

type Copy = { title: string; body: (v: Vars) => string; hidden: string };

export const DIGEST_TEXTS: Record<AppLocale, Record<DigestKind, Copy> & {
  budget: { title: (category: string, threshold: number) => string; body: (category: string, ratio: number, threshold: number) => string };
  test: { title: string; body: string };
}> = {
  id: {
    morning: {
      title: "Jatah aman hari ini",
      body: (v) => `Jatah aman hari ini ${v.allowance}. Sisa uang bulan ini ${v.spendable} untuk ${v.daysLeft} hari.`,
      hidden: "Jatah aman hari ini sudah dihitung. Buka MoneySpender untuk melihatnya.",
    },
    midday: {
      title: "Sisa jatah hari ini",
      body: (v) => `Sisa jatah hari ini ${v.remaining}. Sudah terpakai ${v.spent}.`,
      hidden: "Cek sisa jatah hari ini di MoneySpender.",
    },
    no_records: {
      title: "Belum ada catatan hari ini",
      body: (v) => `Sudah jam ${v.hour}.00 dan belum ada transaksi tercatat. Catat sekarang biar jatahmu tetap akurat.`,
      hidden: "Belum ada transaksi tercatat hari ini. Catat sekarang biar jatahmu tetap akurat.",
    },
    recap: {
      title: "Rekap hari ini",
      body: (v) =>
        v.tomorrow === null
          ? `Hari ini terpakai ${v.spent} dari jatah ${v.allowance}. Besok mulai bulan baru.`
          : `Hari ini terpakai ${v.spent} dari jatah ${v.allowance}. Jatah besok ${v.tomorrow}.`,
      hidden: "Rekap hari ini sudah siap. Buka MoneySpender untuk melihatnya.",
    },
    over: {
      title: "Lewat jatah hari ini",
      body: (v) =>
        v.tomorrow === null
          ? `Pengeluaran hari ini ${v.over} di atas jatah. Besok mulai bulan baru.`
          : `Pengeluaran hari ini ${v.over} di atas jatah. Jatah besok jadi ${v.tomorrow}.`,
      hidden: "Pengeluaran hari ini sudah melewati jatah. Buka MoneySpender untuk detailnya.",
    },
    budget: {
      title: (category, threshold) => `Budget ${category} ${threshold}%`,
      body: (category, ratio, threshold) =>
        threshold >= 100
          ? `Budget ${category} bulan ini sudah habis (${ratio}%).`
          : `Budget ${category} bulan ini sudah terpakai ${ratio}%.`,
    },
    test: {
      title: "Notifikasi aktif",
      body: "Ini notifikasi uji dari MoneySpender. Kalau kamu melihat ini, pengingat sudah siap.",
    },
  },
  en: {
    morning: {
      title: "Today's safe-to-spend",
      body: (v) => `You can safely spend ${v.allowance} today. ${v.spendable} left for the rest of the month (${v.daysLeft} days).`,
      hidden: "Today's safe-to-spend is ready. Open MoneySpender to see it.",
    },
    midday: {
      title: "Left for today",
      body: (v) => `${v.remaining} left for today. Spent so far: ${v.spent}.`,
      hidden: "Check what is left for today in MoneySpender.",
    },
    no_records: {
      title: "Nothing recorded today",
      body: (v) => `It's ${v.hour}:00 and nothing has been recorded yet. Log it now to keep your allowance accurate.`,
      hidden: "Nothing has been recorded today. Log it now to keep your allowance accurate.",
    },
    recap: {
      title: "Today's recap",
      body: (v) =>
        v.tomorrow === null
          ? `You spent ${v.spent} of your ${v.allowance} allowance today. A new month starts tomorrow.`
          : `You spent ${v.spent} of your ${v.allowance} allowance today. Tomorrow: ${v.tomorrow}.`,
      hidden: "Today's recap is ready. Open MoneySpender to see it.",
    },
    over: {
      title: "Over today's allowance",
      body: (v) =>
        v.tomorrow === null
          ? `You're ${v.over} over today's allowance. A new month starts tomorrow.`
          : `You're ${v.over} over today's allowance. Tomorrow's allowance is now ${v.tomorrow}.`,
      hidden: "You went over today's allowance. Open MoneySpender for details.",
    },
    budget: {
      title: (category, threshold) => `${category} budget ${threshold}%`,
      body: (category, ratio, threshold) =>
        threshold >= 100
          ? `Your ${category} budget for this month is used up (${ratio}%).`
          : `Your ${category} budget for this month is at ${ratio}%.`,
    },
    test: {
      title: "Notifications are on",
      body: "This is a test notification from MoneySpender. If you can see it, reminders are ready.",
    },
  },
};

export type DigestMessageInput = {
  locale: AppLocale;
  hideAmounts: boolean;
  position: SlotPosition;
  hour: number;
  hasRecordsToday: boolean;
  allowance: Pick<
    AllowanceResult,
    "allowanceToday" | "spentToday" | "remainingToday" | "tomorrowAllowance" | "spendable" | "daysLeft"
  >;
  currency?: string;
};

export function buildDigestMessage(input: DigestMessageInput): PushMessage {
  const { locale, allowance } = input;
  const kind = chooseDigestKind({
    position: input.position,
    hour: input.hour,
    hasRecordsToday: input.hasRecordsToday,
    remainingToday: allowance.remainingToday,
  });
  const copy = DIGEST_TEXTS[locale][kind];
  if (input.hideAmounts) return { kind, title: copy.title, body: copy.hidden };

  const money = (value: number) => formatPushAmount(value, locale, input.currency);
  const body = copy.body({
    allowance: money(allowance.allowanceToday),
    spendable: money(allowance.spendable),
    daysLeft: allowance.daysLeft,
    remaining: money(Math.max(0, allowance.remainingToday)),
    spent: money(allowance.spentToday),
    over: money(Math.max(0, -allowance.remainingToday)),
    tomorrow: allowance.tomorrowAllowance === null ? null : money(allowance.tomorrowAllowance),
    hour: String(input.hour).padStart(2, "0"),
  });
  return { kind, title: copy.title, body };
}

/** Percentages are not money amounts, so hide_amounts does not change budget alerts. */
export function buildBudgetAlertMessage(input: {
  locale: AppLocale;
  categoryName: string;
  ratio: number;
  threshold: number;
}): PushMessage {
  const copy = DIGEST_TEXTS[input.locale].budget;
  return {
    kind: "budget",
    title: copy.title(input.categoryName, input.threshold),
    body: copy.body(input.categoryName, input.ratio, input.threshold),
  };
}

export function buildTestMessage(locale: AppLocale): PushMessage {
  const copy = DIGEST_TEXTS[locale].test;
  return { kind: "test", title: copy.title, body: copy.body };
}
