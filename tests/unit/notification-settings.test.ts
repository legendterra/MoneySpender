import { describe, expect, it } from "vitest";

import {
  formatHour,
  previewSlots,
  pushReadiness,
  toReminderRow,
  validateNotificationSettings,
  type PushEnvironment,
} from "@/lib/notification-settings";
import { normalizeReminder } from "@/lib/finance-data";

const valid = {
  digest_enabled: true,
  digest_every_hours: 3,
  active_start: 9,
  active_end: 21,
  hide_amounts: false,
  budget_alerts_enabled: true,
};

describe("validateNotificationSettings", () => {
  it("accepts the defaults and every allowed interval", () => {
    for (const interval of [0, 2, 3, 4]) {
      const result = validateNotificationSettings({ ...valid, digest_every_hours: interval });
      expect(result.ok).toBe(true);
    }
  });

  it("rejects unknown intervals, bad hours and a reversed window", () => {
    expect(validateNotificationSettings({ ...valid, digest_every_hours: 5 })).toEqual({
      ok: false,
      errors: { digest_every_hours: "invalid_interval" },
    });
    expect(validateNotificationSettings({ ...valid, active_start: 24, active_end: 2.5 })).toEqual({
      ok: false,
      errors: { active_start: "invalid_hour", active_end: "invalid_hour" },
    });
    expect(validateNotificationSettings({ ...valid, active_start: 21, active_end: 9 })).toEqual({
      ok: false,
      errors: { active_end: "window_order" },
    });
    expect(validateNotificationSettings({ ...valid, active_start: 9, active_end: 9 })).toMatchObject({
      errors: { active_end: "window_order" },
    });
  });

  it("requires the window to fit two slots for an N-hour interval, not for three times a day", () => {
    expect(validateNotificationSettings({ ...valid, digest_every_hours: 4, active_start: 9, active_end: 12 })).toEqual({
      ok: false,
      errors: { active_end: "window_too_short" },
    });
    expect(validateNotificationSettings({ ...valid, digest_every_hours: 4, active_start: 9, active_end: 13 }).ok).toBe(true);
    expect(validateNotificationSettings({ ...valid, digest_every_hours: 0, active_start: 9, active_end: 10 }).ok).toBe(true);
  });

  it("rejects missing booleans and non-objects", () => {
    expect(validateNotificationSettings({ ...valid, hide_amounts: "yes" })).toMatchObject({
      ok: false,
      errors: { hide_amounts: "not_boolean" },
    });
    const empty = validateNotificationSettings(null);
    expect(empty.ok).toBe(false);
  });
});

describe("notification mapping", () => {
  it("stores budget alerts in the legacy evening column and reads them back", () => {
    const row = toReminderRow("u1", { ...valid, digest_every_hours: 2, budget_alerts_enabled: false });
    expect(row).toEqual({
      user_id: "u1",
      digest_enabled: true,
      digest_every_hours: 2,
      active_start: 9,
      active_end: 21,
      hide_amounts: false,
      reminder_evening_enabled: false,
    });
    expect(normalizeReminder(row).budget_alerts_enabled).toBe(false);
    expect(normalizeReminder({}).budget_alerts_enabled).toBe(true);
  });

  it("previews the WIB hours and formats them per locale", () => {
    expect(previewSlots({ digest_every_hours: 3, active_start: 9, active_end: 21 })).toEqual([9, 12, 15, 18, 21]);
    expect(previewSlots({ digest_every_hours: 0, active_start: 8, active_end: 22 })).toEqual([8, 15, 22]);
    expect(previewSlots({ digest_every_hours: 4, active_start: 9, active_end: 20 })).toEqual([9, 13, 17]);
    expect(formatHour(9)).toBe("09.00");
    expect(formatHour(21, "en")).toBe("21:00");
  });
});

describe("pushReadiness", () => {
  const desktop: PushEnvironment = {
    hasServiceWorker: true,
    hasPushManager: true,
    hasNotification: true,
    isIos: false,
    isStandalone: false,
    permission: "default",
  };

  it("is ready on a capable browser and reports a blocked permission", () => {
    expect(pushReadiness(desktop)).toBe("ready");
    expect(pushReadiness({ ...desktop, permission: "denied" })).toBe("denied");
  });

  it("asks iPhone users to install the app first, then works when installed", () => {
    const iosTab = { ...desktop, isIos: true, hasPushManager: false, hasNotification: false };
    expect(pushReadiness(iosTab)).toBe("ios-install");
    expect(pushReadiness({ ...desktop, isIos: true, isStandalone: true })).toBe("ready");
  });

  it("reports unsupported browsers", () => {
    expect(pushReadiness({ ...desktop, hasPushManager: false })).toBe("unsupported");
  });
});
