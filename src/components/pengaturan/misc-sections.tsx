"use client";

import * as React from "react";
import { ChevronRight, Download, FileSpreadsheet, FileUp, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ConfirmSheet } from "@/components/pengaturan/confirm-sheet";
import { ImportSheet } from "@/components/pengaturan/import-sheet";
import { SettingsSection } from "@/components/pengaturan/section";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const linkRow =
  "flex min-h-[60px] w-full items-center gap-3.5 py-2 text-left outline-none transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function RowIcon({ icon: Icon }: { icon: typeof Download }) {
  return <Icon aria-hidden="true" className="size-[18px] shrink-0 text-muted" />;
}

export function DataSection() {
  const t = useTranslations("pengaturan");
  const [importOpen, setImportOpen] = React.useState(false);

  return (
    <SettingsSection id="data" title={t("dataTitle")} description={t("dataBody")}>
      <ul className="divide-y divide-line border-y border-line">
        <li>
          <a href="/api/export/transactions" className={linkRow}>
            <RowIcon icon={Download} />
            <span className="grid min-w-0 flex-1">
              <span className="text-[14px] font-medium text-text">{t("exportAll")}</span>
              <span className="text-[12px] text-muted">{t("exportAllHint")}</span>
            </span>
          </a>
        </li>
        <li>
          <button type="button" className={linkRow} onClick={() => setImportOpen(true)}>
            <RowIcon icon={FileUp} />
            <span className="grid min-w-0 flex-1">
              <span className="text-[14px] font-medium text-text">{t("importRow")}</span>
              <span className="text-[12px] text-muted">{t("importRowHint")}</span>
            </span>
            <ChevronRight className="size-4 text-muted" aria-hidden="true" />
          </button>
        </li>
        <li>
          <a href="/api/export/template" className={linkRow}>
            <RowIcon icon={FileSpreadsheet} />
            <span className="grid min-w-0 flex-1">
              <span className="text-[14px] font-medium text-text">{t("importTemplate")}</span>
              <span className="text-[12px] text-muted">{t("templateHint")}</span>
            </span>
          </a>
        </li>
      </ul>
      <ImportSheet open={importOpen} onOpenChange={setImportOpen} />
    </SettingsSection>
  );
}

export function AccountSection({ email }: { email: string }) {
  const t = useTranslations("pengaturan");
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  async function logout() {
    setLoggingOut(true);
    const { error } = await createBrowserSupabaseClient().auth.signOut();
    if (error) {
      setLoggingOut(false);
      toast.error(t("logoutFailed"), { description: `Supabase auth.signOut failed: ${error.message}` });
      return;
    }
    window.location.assign("/auth");
  }

  async function deleteAccount() {
    setDeleting(true);
    const response = await fetch("/api/account/delete", { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: string } | null;
      setDeleting(false);
      toast.error(t("deleteFailed"), {
        description: body?.error ?? (response ? `DELETE /api/account/delete failed (${response.status}).` : t("networkError")),
      });
      return;
    }
    // The route already signed the session out; drop any client state too.
    await createBrowserSupabaseClient().auth.signOut().catch(() => undefined);
    window.localStorage.removeItem("moneyspender.offline.queue.v1");
    window.location.assign("/auth");
  }

  return (
    <SettingsSection id="akun" title={t("accountTitle")} description={t("accountBody", { email })}>
      <div className="grid gap-4 pt-1">
        <Button variant="secondary" onClick={() => void logout()} isLoading={loggingOut} className="justify-self-start">
          <LogOut aria-hidden="true" />
          {t("logout")}
        </Button>
        <div className="grid gap-3 border-t border-line pt-6">
          <div className="grid gap-1">
            <h3 className="text-[15px] font-semibold text-expense">{t("dangerTitle")}</h3>
            <p className="max-w-prose text-[13px] leading-5 text-muted">{t("dangerBody")}</p>
          </div>
          <Button variant="danger" onClick={() => setConfirming(true)} className="justify-self-start">
            {t("deleteAccount")}
          </Button>
        </div>
      </div>
      <ConfirmSheet
        open={confirming}
        onOpenChange={setConfirming}
        title={t("deleteAccountTitle")}
        body={
          <>
            <p>{t("deleteAccountBody1")}</p>
            <p className="font-semibold text-expense">{t("deleteAccountBody2")}</p>
            <p className="text-muted">{t("deleteAccountBody3")}</p>
          </>
        }
        confirmLabel={t("deleteAccountConfirm")}
        typeToConfirm={t("deleteWord")}
        onConfirm={() => void deleteAccount()}
        busy={deleting}
      />
    </SettingsSection>
  );
}
