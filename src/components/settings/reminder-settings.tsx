"use client";

import { useState } from "react";
import { BellRing, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { ReminderPreferences } from "@/lib/types";
import { urlBase64ToUint8Array } from "@/lib/utils";

export function ReminderSettings({ reminder }: { reminder: ReminderPreferences }) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [state, setState] = useState<ReminderPreferences>(reminder);

  async function persist(nextState: ReminderPreferences) {
    setIsBusy(true);
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sesi login berakhir.");
      setIsBusy(false);
      return;
    }

    const { error } = await supabase.from("reminder_preferences").upsert({
      user_id: user.id,
      reminder_morning_enabled: nextState.reminder_morning_enabled,
      reminder_evening_enabled: nextState.reminder_evening_enabled,
      push_enabled: nextState.push_enabled,
    });

    setIsBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setState(nextState);
    router.refresh();
  }

  async function ensurePushSubscription(enabled: boolean) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Browser ini belum mendukung web push.");
      return false;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const existingSubscription = await registration.pushManager.getSubscription();

    if (!enabled) {
      if (existingSubscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existingSubscription.endpoint }),
        });
        await existingSubscription.unsubscribe();
      }

      return true;
    }

    let permissionResult = Notification.permission;
    if (permissionResult !== "granted") {
      permissionResult = await Notification.requestPermission();
    }

    if (permissionResult !== "granted") {
      toast.error("Izin notifikasi belum diberikan.");
      return false;
    }

    const response = await fetch("/api/push/public-key");
    const { publicKey } = (await response.json()) as { publicKey?: string };

    if (!publicKey) {
      toast.error("VAPID public key belum dikonfigurasi.");
      return false;
    }

    const subscription =
      existingSubscription ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const responseSubscribe = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    if (!responseSubscribe.ok) {
      throw new Error("Gagal menyimpan subscription notifikasi.");
    }

    return true;
  }

  async function handleToggle(key: keyof ReminderPreferences, value: boolean) {
    const nextState = { ...state, [key]: value };

    if (key === "push_enabled") {
      try {
        const ready = await ensurePushSubscription(value);

        if (!ready) {
          return;
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal mengatur notifikasi.");
        return;
      }
    }

    await persist(nextState);
  }

  return (
    <Panel className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">Reminder</p>
          <h2 className="text-2xl font-bold text-foreground">Biar tidak lupa catat</h2>
        </div>
        <div className="rounded-md bg-accent-soft p-3 text-accent-strong">
          <BellRing className="size-5" />
        </div>
      </div>
      <div className="space-y-3">
        {[
          {
            key: "push_enabled" as const,
            title: "Aktifkan web push",
            description:
              "Nyalakan kalau mau reminder muncul dari browser/PWA.",
          },
          {
            key: "reminder_morning_enabled" as const,
            title: "Pengingat pagi",
            description: "Sekitar 07.00 WIB, cocok buat rencana hari ini.",
          },
          {
            key: "reminder_evening_enabled" as const,
            title: "Pengingat malam",
            description: "Sekitar 19.00 WIB, cocok buat rekap belanja hari ini.",
          },
        ].map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-4 rounded-md border border-border bg-background-strong px-4 py-4"
          >
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="text-xs leading-6 text-muted">{item.description}</p>
            </div>
            <Switch
              checked={state[item.key]}
              onCheckedChange={(checked) => void handleToggle(item.key, checked)}
            />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-dashed border-border px-4 py-4 text-sm leading-7 text-muted">
        <ShieldCheck className="mb-2 size-4 text-accent-strong" />
        Reminder jalan lewat web push. Untuk hasil terbaik, install MoneySpender ke home screen.
      </div>
      {isBusy ? (
        <Button variant="secondary" isLoading fullWidth>
          Menyimpan
        </Button>
      ) : null}
    </Panel>
  );
}
