import { digestSlots } from "@/lib/digest";
import { BUDGET_ALERTS_COLUMN } from "@/lib/finance-data";
import type { DigestInterval } from "@/lib/types";

// Validation and mapping for Pengaturan > Notifikasi (PLAN.md section 7).
// Pure: used by the settings form, the onboarding step and unit tests.

export const DIGEST_INTERVALS: DigestInterval[] = [2, 3, 4, 0];

export type NotificationSettings = {
  digest_enabled: boolean;
  digest_every_hours: DigestInterval;
  active_start: number;
  active_end: number;
  hide_amounts: boolean;
  budget_alerts_enabled: boolean;
};

export type NotificationField = keyof NotificationSettings;
export type NotificationIssue = "not_boolean" | "invalid_interval" | "invalid_hour" | "window_order" | "window_too_short";

export type NotificationValidation =
  | { ok: true; value: NotificationSettings }
  | { ok: false; errors: Partial<Record<NotificationField, NotificationIssue>> };

const BOOLEAN_FIELDS = ["digest_enabled", "hide_amounts", "budget_alerts_enabled"] as const;

function isHour(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23;
}

/**
 * Checks a settings object against the DB constraints of reminder_preferences:
 * interval in (0,2,3,4), hours 0-23 with start < end. With an interval of N
 * hours the window must fit at least two slots, so a digest is more than one ping.
 */
export function validateNotificationSettings(input: unknown): NotificationValidation {
  const errors: Partial<Record<NotificationField, NotificationIssue>> = {};
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  for (const field of BOOLEAN_FIELDS) {
    if (typeof raw[field] !== "boolean") errors[field] = "not_boolean";
  }

  const interval = raw.digest_every_hours;
  if (typeof interval !== "number" || !DIGEST_INTERVALS.includes(interval as DigestInterval)) {
    errors.digest_every_hours = "invalid_interval";
  }

  const start = raw.active_start;
  const end = raw.active_end;
  if (!isHour(start)) errors.active_start = "invalid_hour";
  if (!isHour(end)) errors.active_end = "invalid_hour";
  if (isHour(start) && isHour(end)) {
    if (start >= end) {
      errors.active_end = "window_order";
    } else if (typeof interval === "number" && interval > 0 && end - start < interval) {
      errors.active_end = "window_too_short";
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      digest_enabled: raw.digest_enabled as boolean,
      digest_every_hours: interval as DigestInterval,
      active_start: start as number,
      active_end: end as number,
      hide_amounts: raw.hide_amounts as boolean,
      budget_alerts_enabled: raw.budget_alerts_enabled as boolean,
    },
  };
}

/** reminder_preferences upsert payload (budget alerts live in BUDGET_ALERTS_COLUMN). */
export function toReminderRow(userId: string, settings: NotificationSettings) {
  return {
    user_id: userId,
    digest_enabled: settings.digest_enabled,
    digest_every_hours: settings.digest_every_hours,
    active_start: settings.active_start,
    active_end: settings.active_end,
    hide_amounts: settings.hide_amounts,
    [BUDGET_ALERTS_COLUMN]: settings.budget_alerts_enabled,
  };
}

/** WIB hours that would receive a digest with these settings. */
export function previewSlots(settings: Pick<NotificationSettings, "digest_every_hours" | "active_start" | "active_end">) {
  return digestSlots(settings);
}

/** "09.00" (id) / "09:00" (en). */
export function formatHour(hour: number, locale: "id" | "en" = "id") {
  return `${String(hour).padStart(2, "0")}${locale === "en" ? ":" : "."}00`;
}

export type PushEnvironment = {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  isIos: boolean;
  /** Running as an installed app (display-mode: standalone / navigator.standalone). */
  isStandalone: boolean;
  permission: "default" | "granted" | "denied" | null;
};

export type PushReadiness = "ready" | "denied" | "ios-install" | "unsupported";

/**
 * What the notification switch can do here. iPhone Safari only exposes web push
 * to the installed app (iOS 16.4+), so a browser tab on iOS needs installing first.
 */
export function pushReadiness(env: PushEnvironment): PushReadiness {
  const capable = env.hasServiceWorker && env.hasPushManager && env.hasNotification;
  if (env.isIos && !env.isStandalone) return "ios-install";
  if (!capable) return "unsupported";
  if (env.permission === "denied") return "denied";
  return "ready";
}

/** Reads the PushEnvironment from the browser (client only). */
export function readPushEnvironment(): PushEnvironment {
  const nav = navigator as Navigator & { standalone?: boolean };
  const ua = nav.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && nav.maxTouchPoints > 1);
  return {
    hasServiceWorker: "serviceWorker" in nav,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
    isIos,
    isStandalone: window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true,
    permission: "Notification" in window ? Notification.permission : null,
  };
}
