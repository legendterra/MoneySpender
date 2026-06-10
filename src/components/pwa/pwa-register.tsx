"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { flushOfflineMutations, getOfflineQueueCount } from "@/lib/offline-queue";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

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
    }

    if (typeof navigator !== "undefined" && navigator.onLine) {
      void syncQueue();
    }

    window.addEventListener("online", syncQueue);
    return () => window.removeEventListener("online", syncQueue);
  }, []);

  return null;
}
