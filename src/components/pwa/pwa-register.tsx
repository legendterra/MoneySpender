"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { haptic } from "@/lib/haptics";
import {
  OFFLINE_QUEUE_EVENT,
  discardOfflineMutation,
  flushOfflineMutations,
  getOfflineQueueCount,
  retryOfflineMutation,
  type OfflineMutation,
} from "@/lib/offline-queue";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function showFailedItem(item: OfflineMutation) {
  const label = item.table === "debts" ? "Hutang/piutang" : "Transaksi";
  const amount = Number(item.payload.amount ?? 0).toLocaleString("id-ID");
  toast.error(`${label} offline Rp${amount} gagal disimpan`, {
    id: `offline-failed-${item.id}`,
    description: item.lastError?.message,
    duration: Infinity,
    action: {
      label: "Coba lagi",
      onClick: () => {
        void retryOfflineMutation(createBrowserSupabaseClient(), item.id).then((error) => {
          if (error) {
            toast.error("Masih gagal", { description: error });
          } else {
            toast.success("Catatan offline tersimpan.");
          }
        });
      },
    },
    cancel: {
      label: "Buang",
      onClick: () => discardOfflineMutation(item.id),
    },
  });
}

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // App tetap jalan normal kalau browser menolak service worker.
    });
  }, []);

  useEffect(() => {
    let running = false;
    async function syncQueue() {
      if (running || getOfflineQueueCount() === 0 || !navigator.onLine) {
        return;
      }
      running = true;
      try {
        const supabase = createBrowserSupabaseClient();
        const result = await flushOfflineMutations(supabase);

        if (result.synced > 0) {
          haptic("success");
          toast.success(`${result.synced} catatan offline sudah masuk ke akun.`);
        }
        result.failed.forEach(showFailedItem);
      } finally {
        running = false;
      }
    }

    // Ask the worker to wake us when the connection is back (Chrome/Android Background Sync).
    async function requestBackgroundSync() {
      if (getOfflineQueueCount() === 0 || !("serviceWorker" in navigator)) return;
      try {
        const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
          sync?: { register: (tag: string) => Promise<void> };
        };
        await registration.sync?.register("moneyspender-offline-queue");
      } catch {
        // Not supported (Safari/Firefox): the online/visibility listeners below cover it.
      }
    }

    function onWorkerMessage(event: MessageEvent) {
      if (event.data?.type === "flush-offline-queue") void syncQueue();
    }

    function onVisible() {
      if (document.visibilityState === "visible") void syncQueue();
    }

    function onQueueChange() {
      if (navigator.onLine) void syncQueue();
      else void requestBackgroundSync();
    }

    void syncQueue();
    window.addEventListener("online", syncQueue);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(OFFLINE_QUEUE_EVENT, onQueueChange);
    navigator.serviceWorker?.addEventListener("message", onWorkerMessage);
    return () => {
      window.removeEventListener("online", syncQueue);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, onQueueChange);
      navigator.serviceWorker?.removeEventListener("message", onWorkerMessage);
    };
  }, []);

  return null;
}
