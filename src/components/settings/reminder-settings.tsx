"use client";

import { useState } from "react";
import { Bell, BellOff, BellRing, Moon, Sun } from "lucide-react";
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
  const [isBusy, setIsBusy]   = useState(false);
  const [state, setState]     = useState<ReminderPreferences>(reminder);
  const [pushStatus, setPushStatus] = useState<"idle" | "requesting" | "denied">("idle");

  async function persist(nextState: ReminderPreferences) {
    setIsBusy(true);
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sesi login berakhir."); setIsBusy(false); return; }

    const { error } = await supabase.from("reminder_preferences").upsert({
      user_id: user.id,
      reminder_morning_enabled: nextState.reminder_morning_enabled,
      reminder_evening_enabled: nextState.reminder_evening_enabled,
      push_enabled: nextState.push_enabled,
    });
    setIsBusy(false);
    if (error) { toast.error(error.message); return; }
    setState(nextState);
    router.refresh();
  }

  async function ensurePushSubscription(enable: boolean): Promise<boolean> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Browser ini belum mendukung web push. Coba Chrome atau Edge.");
      return false;
    }

    try {
      const reg = await navigator.serviceWorker.register("/sw.js");

      if (!enable) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        return true;
      }

      // Request permission
      setPushStatus("requesting");
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      setPushStatus("idle");

      if (permission !== "granted") {
        setPushStatus("denied");
        toast.error("Izin notifikasi ditolak. Aktifkan di pengaturan browser.", { duration: 5000 });
        return false;
      }

      const keyRes = await fetch("/api/push/public-key");
      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!publicKey) {
        toast.error("VAPID key belum dikonfigurasi di server.");
        return false;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!saveRes.ok) throw new Error("Gagal menyimpan subscription.");

      toast.success("Notifikasi push berhasil diaktifkan.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengatur notifikasi.");
      setPushStatus("idle");
      return false;
    }
  }

  async function handleToggle(key: keyof ReminderPreferences, value: boolean) {
    const nextState = { ...state, [key]: value };
    if (key === "push_enabled") {
      const ok = await ensurePushSubscription(value);
      if (!ok) return;
    }
    await persist(nextState);
  }

  const items = [
    {
      key: "push_enabled" as const,
      icon: state.push_enabled ? BellRing : BellOff,
      title: "Aktifkan push notification",
      description: "Izin browser untuk kirim notifikasi. Wajib aktif agar reminder bisa jalan.",
    },
    {
      key: "reminder_morning_enabled" as const,
      icon: Sun,
      title: "Reminder pagi (07.00 WIB)",
      description: "Cocok buat rencana dan reminder catat pemasukan hari ini.",
      disabled: !state.push_enabled,
    },
    {
      key: "reminder_evening_enabled" as const,
      icon: Moon,
      title: "Reminder malam (19.00 WIB)",
      description: "Cocok buat rekap pengeluaran sebelum istirahat.",
      disabled: !state.push_enabled,
    },
  ];

  return (
    <Panel className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">Reminder</p>
          <h2 className="text-2xl font-bold text-foreground">Biar tidak lupa catat</h2>
        </div>
        <div className="rounded-md bg-accent-soft p-3 text-accent-strong">
          <Bell className="size-5" />
        </div>
      </div>

      {pushStatus === "denied" && (
        <div className="rounded-lg border border-danger/20 bg-danger/8 px-4 py-3 text-sm leading-7 text-danger">
          Izin notifikasi ditolak di browser. Buka pengaturan browser → Site Settings → Notifications → izinkan untuk situs ini, lalu coba lagi.
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={`flex items-center gap-4 rounded-lg border border-border bg-background-strong px-4 py-4 transition-opacity ${item.disabled ? "opacity-50" : ""}`}
            >
              <div className="grid size-9 flex-shrink-0 place-items-center rounded-md bg-background">
                <Icon className="size-4 text-accent" />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs leading-5 text-muted">{item.description}</p>
              </div>
              <Switch
                checked={state[item.key]}
                onCheckedChange={(v) => !item.disabled && void handleToggle(item.key, v)}
                disabled={item.disabled || isBusy || pushStatus === "requesting"}
              />
            </div>
          );
        })}
      </div>

      {isBusy && (
        <Button variant="secondary" isLoading fullWidth>
          Menyimpan…
        </Button>
      )}

      <div className="rounded-lg border border-dashed border-border px-4 py-4 text-xs leading-7 text-muted">
        Untuk hasil terbaik: install MoneySpender ke home screen (PWA) agar notifikasi tetap jalan saat browser ditutup.
      </div>
    </Panel>
  );
}
