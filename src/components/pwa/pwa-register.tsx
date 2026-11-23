"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import {
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
    async function syncQueue() {
      if (getOfflineQueueCount() === 0) {
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const result = await flushOfflineMutations(supabase);

      if (result.synced > 0) {
        toast.success(`${result.synced} catatan offline sudah masuk ke akun.`);
      }
      result.failed.forEach(showFailedItem);
    }

    if (typeof navigator !== "undefined" && navigator.onLine) {
      void syncQueue();
    }

    window.addEventListener("online", syncQueue);
    return () => window.removeEventListener("online", syncQueue);
  }, []);

  return null;
}
