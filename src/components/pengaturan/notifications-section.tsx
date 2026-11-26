"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { TextChoice } from "@/components/flat/controls";
import { SettingRow, SettingsSection, writeError } from "@/components/pengaturan/section";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toUiLocale } from "@/components/ui/format";
import { haptic } from "@/lib/haptics";
import {
  formatHour,
  previewSlots,
  pushReadiness,
  readPushEnvironment,
  toReminderRow,
  validateNotificationSettings,
  type NotificationIssue,
  type NotificationSettings,
  type PushReadiness,
} from "@/lib/notification-settings";
import { disablePush, enablePush, hasDeviceSubscription, sendTestPush } from "@/lib/push-client";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { DigestInterval, ReminderPreferences } from "@/lib/types";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/** Reads browser push state after mount (null while unknown). */
function useDeviceState() {
  const [state, setState] = React.useState<{ readiness: PushReadiness; subscribed: boolean } | null>(null);
  const refresh = React.useCallback(async () => {
    const readiness = pushReadiness(readPushEnvironment());
    const subscribed = readiness === "ready" ? await hasDeviceSubscription().catch(() => false) : false;
    setState({ readiness, subscribed });
  }, []);
  React.useEffect(() => {
    // Browser-only APIs: read them once after hydration.
    void refresh();
  }, [refresh]);
  return { state, refresh };
}

export function NotificationsSection({
  userId,
  reminder,
  deviceCount,
}: {
  userId: string;
  reminder: ReminderPreferences;
  /** push_subscriptions rows for the account (all devices). */
  deviceCount: number;
}) {
  const t = useTranslations("pengaturan");
  const locale = toUiLocale(useLocale());
  const router = useRouter();
  const device = useDeviceState();
  const [busy, setBusy] = React.useState<"master" | "test" | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [settings, setSettings] = React.useState<NotificationSettings>({
    digest_enabled: reminder.digest_enabled,
    digest_every_hours: reminder.digest_every_hours,
    active_start: reminder.active_start,
    active_end: reminder.active_end,
    hide_amounts: reminder.hide_amounts,
    budget_alerts_enabled: reminder.budget_alerts_enabled,
  });
  const [issue, setIssue] = React.useState<NotificationIssue | null>(null);
  const masterId = React.useId();

  const subscribedHere = device.state?.subscribed ?? false;
  const masterOn = reminder.push_enabled && subscribedHere;
  const otherDevices = Math.max(0, deviceCount - (subscribedHere ? 1 : 0));

  async function toggleMaster(next: boolean) {
    setBusy("master");
    const result = next ? await enablePush() : await disablePush({ keepAccountEnabled: otherDevices > 0 });
    setBusy(null);
    await device.refresh();
    if (result.ok) {
      haptic(next ? "success" : "tap");
      toast.success(next ? t("pushOn") : t("pushOff"));
      router.refresh();
      return;
    }
    const messages: Record<string, string> = {
      denied: t("pushDenied"),
      dismissed: t("pushDismissed"),
      "ios-install": t("pushIosInstall"),
      unsupported: t("pushUnsupported"),
      "no-key": t("pushNoKey"),
    };
    toast.error(messages[result.reason] ?? t("pushFailed"), result.message ? { description: result.message } : undefined);
  }

  async function persist(next: NotificationSettings) {
    const checked = validateNotificationSettings(next);
    setSettings(next);
    if (!checked.ok) {
      setIssue(checked.errors.active_end ?? checked.errors.active_start ?? checked.errors.digest_every_hours ?? null);
      return;
    }
    setIssue(null);
    setSaving(true);
    const previous = settings;
    const { error } = await createBrowserSupabaseClient()
      .from("reminder_preferences")
      .upsert(toReminderRow(userId, checked.value), { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      setSettings(previous);
      toast.error(t("saveFailed"), { description: writeError("upsert", "reminder_preferences", error) });
      return;
    }
    router.refresh();
  }

  async function test() {
    setBusy("test");
    const result = await sendTestPush();
    setBusy(null);
    if (result.ok) {
      toast.success(t("testSent", { count: result.sent }));
    } else {
      toast.error(result.status === 429 ? t("testRateLimited") : t("testFailed"), { description: result.message });
    }
  }

  const slots = previewSlots(settings).map((hour) => formatHour(hour, locale));
  const readiness = device.state?.readiness;
  const hourOptions = (from: number, to: number) =>
    HOURS.filter((hour) => hour >= from && hour <= to).map((hour) => (
      <option key={hour} value={hour}>
        {formatHour(hour, locale)}
      </option>
    ));

  return (
    <SettingsSection id="notifikasi" title={t("notifTitle")} description={t("notifBody")}>
      <div className="divide-y divide-line border-y border-line">
        <SettingRow
          label={t("masterLabel")}
          htmlFor={masterId}
          hint={
            masterOn
              ? otherDevices
                ? t("masterOnMore", { count: otherDevices })
                : t("masterOnHint")
              : otherDevices
                ? t("masterOffOthers", { count: otherDevices })
                : t("masterOffHint")
          }
          control={
            <Switch
              id={masterId}
              checked={masterOn}
              onCheckedChange={(next) => void toggleMaster(next)}
              disabled={busy !== null || !device.state || readiness === "unsupported" || readiness === "ios-install"}
            />
          }
        >
          {readiness && readiness !== "ready" ? (
            <div className="flex gap-2.5 text-[13px] leading-5 text-text">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-debt" aria-hidden="true" />
              <p>
                {readiness === "ios-install" ? t("pushIosInstall") : readiness === "denied" ? t("pushDenied") : t("pushUnsupported")}{" "}
                {readiness === "ios-install" ? (
                  <Link href="/install" className="font-semibold text-text underline underline-offset-2">
                    {t("installGuideLink")}
                  </Link>
                ) : null}
              </p>
            </div>
          ) : null}
        </SettingRow>

        <SettingRow
          label={t("digestLabel")}
          hint={t("digestHint")}
          control={
            <Switch
              checked={settings.digest_enabled}
              onCheckedChange={(digest_enabled) => void persist({ ...settings, digest_enabled })}
              label={t("digestLabel")}
              disabled={saving}
            />
          }
        />

        <div className={cn("grid gap-4 py-3.5", !settings.digest_enabled && "opacity-55")}>
          <div className="grid gap-2">
            <span className="text-[14px] font-medium text-text">{t("intervalLabel")}</span>
            <TextChoice
              label={t("intervalLabel")}
              value={String(settings.digest_every_hours) as `${DigestInterval}`}
              onChange={(value) => void persist({ ...settings, digest_every_hours: Number(value) as DigestInterval })}
              options={[
                { value: "2", label: t("every2") },
                { value: "3", label: t("every3") },
                { value: "4", label: t("every4") },
                { value: "0", label: t("threeTimes") },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="text-[13px] font-semibold text-text">{t("activeFrom")}</span>
              <Select
                value={settings.active_start}
                onChange={(event) => void persist({ ...settings, active_start: Number(event.target.value) })}
              >
                {hourOptions(0, 22)}
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-[13px] font-semibold text-text">{t("activeTo")}</span>
              <Select
                value={settings.active_end}
                aria-invalid={Boolean(issue) || undefined}
                onChange={(event) => void persist({ ...settings, active_end: Number(event.target.value) })}
              >
                {hourOptions(1, 23)}
              </Select>
            </label>
          </div>
          {issue ? (
            <p role="alert" className="text-[12px] font-medium text-expense">
              {issue === "window_too_short" ? t("windowTooShort") : t("windowOrder")}
            </p>
          ) : (
            <p className="text-[12px] leading-[18px] text-muted">{t("slotsPreview", { hours: slots.join(", ") })}</p>
          )}
        </div>

        <SettingRow
          label={t("hideAmountsLabel")}
          hint={t("hideAmountsHint")}
          control={
            <Switch
              checked={settings.hide_amounts}
              onCheckedChange={(hide_amounts) => void persist({ ...settings, hide_amounts })}
              label={t("hideAmountsLabel")}
              disabled={saving}
            />
          }
        />
        <SettingRow
          label={t("budgetAlertsLabel")}
          hint={t("budgetAlertsHint")}
          control={
            <Switch
              checked={settings.budget_alerts_enabled}
              onCheckedChange={(budget_alerts_enabled) => void persist({ ...settings, budget_alerts_enabled })}
              label={t("budgetAlertsLabel")}
              disabled={saving}
            />
          }
        />
        <div className="flex flex-wrap items-center gap-3 pt-4">
          <Button variant="secondary" size="sm" onClick={() => void test()} isLoading={busy === "test"} disabled={!masterOn || busy !== null}>
            <Send aria-hidden="true" />
            {t("testButton")}
          </Button>
          <span className="text-[12px] text-muted">{masterOn ? t("testHint") : t("testNeedsOn")}</span>
        </div>
      </div>
    </SettingsSection>
  );
}
