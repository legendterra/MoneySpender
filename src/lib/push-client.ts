"use client";

import { readPushEnvironment, pushReadiness, type PushReadiness } from "@/lib/notification-settings";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { urlBase64ToUint8Array } from "@/lib/utils";

// Browser side of web push: permission prompt, PushManager subscription and the
// /api/push/* routes, plus reminder_preferences.push_enabled. Shared by
// Pengaturan > Notifikasi and the onboarding notification step.

export type PushResult =
  | { ok: true }
  | { ok: false; reason: PushReadiness | "dismissed" | "no-key" | "error"; message?: string };

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  const reg = existing ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  return reg;
}

async function setPushEnabled(enabled: boolean) {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi login berakhir. Masuk lagi lalu coba ulang.");
  const { error } = await supabase
    .from("reminder_preferences")
    .upsert({ user_id: user.id, push_enabled: enabled }, { onConflict: "user_id" });
  if (error) throw new Error(`Supabase upsert on "reminder_preferences.push_enabled" failed: ${error.message}`);
}

/** Current state of this device: does it hold a push subscription? */
export async function hasDeviceSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) return false;
  return Boolean(await reg.pushManager.getSubscription());
}

/** Asks permission (if needed), subscribes this device and turns push on for the account. */
export async function enablePush(): Promise<PushResult> {
  const readiness = pushReadiness(readPushEnvironment());
  if (readiness !== "ready") return { ok: false, reason: readiness };

  try {
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission === "denied") return { ok: false, reason: "denied" };
    if (permission !== "granted") return { ok: false, reason: "dismissed" };

    const keyResponse = await fetch("/api/push/public-key");
    const { publicKey } = (await keyResponse.json().catch(() => ({}))) as { publicKey?: string | null };
    if (!publicKey) return { ok: false, reason: "no-key" };

    const reg = await registration();
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const saved = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
    if (!saved.ok) {
      const body = (await saved.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `POST /api/push/subscribe failed (${saved.status}).`);
    }

    await setPushEnabled(true);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Removes this device's subscription. Push stays on for the account when other
 * devices are still subscribed (`keepAccountEnabled`), otherwise it is turned off.
 */
export async function disablePush({ keepAccountEnabled = false } = {}): Promise<PushResult> {
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const subscription = await reg?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `POST /api/push/unsubscribe failed (${response.status}).`);
        }
        await subscription.unsubscribe();
      }
    }
    if (!keepAccountEnabled) await setPushEnabled(false);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

export type TestPushResult = { ok: true; sent: number } | { ok: false; status: number; message: string };

/** POST /api/push/test: sends to the signed-in user's own devices only. */
export async function sendTestPush(): Promise<TestPushResult> {
  const response = await fetch("/api/push/test", { method: "POST" });
  const body = (await response.json().catch(() => null)) as { sent?: number; error?: string; errors?: string[] } | null;
  if (!response.ok) {
    return { ok: false, status: response.status, message: body?.error ?? `POST /api/push/test failed (${response.status}).` };
  }
  if (!body?.sent) {
    return { ok: false, status: 200, message: body?.errors?.[0] ?? "No device accepted the test notification." };
  }
  return { ok: true, sent: body.sent };
}
