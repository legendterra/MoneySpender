"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useCatat } from "@/components/quick-add/catat-provider";
import { deleteEntry, restoreEntry, type DeleteTarget } from "@/lib/history-mutations";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Deletes a Riwayat/Hutang row right away and offers "Urungkan" in the toast,
 * which re-inserts the exact rows. `onChange(key, hidden)` lets lists hide the
 * row instantly and show it again after an undo or a failure.
 */
export function useDeleteWithUndo(onChange?: (key: string, hidden: boolean) => void) {
  const t = useTranslations("riwayat");
  const { refresh } = useCatat();

  return React.useCallback(
    async (target: DeleteTarget & { key: string }, description: string) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        toast.error(t("errors.offline"));
        return false;
      }
      // Hide the row right away; it comes back on undo or failure.
      onChange?.(target.key, true);
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        onChange?.(target.key, false);
        toast.error(t("errors.notSignedIn"));
        return false;
      }

      try {
        const token = await deleteEntry(supabase, user.id, target);
        refresh();
        toast(t("deleted.title"), {
          description,
          duration: 7000,
          action: {
            label: t("deleted.undo"),
            onClick: async () => {
              try {
                await restoreEntry(supabase, user.id, token);
                onChange?.(target.key, false);
                toast.success(t("deleted.restored"));
                refresh();
              } catch (error) {
                toast.error(t("errors.restore", { message: message(error) }));
              }
            },
          },
        });
        return true;
      } catch (error) {
        onChange?.(target.key, false);
        toast.error(t("errors.delete", { message: message(error) }));
        return false;
      }
    },
    [onChange, refresh, t],
  );
}
