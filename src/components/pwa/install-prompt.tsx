"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { promptInstall, useInstallState } from "@/components/pwa/install-store";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

/** Never float the prompt over sign-in, setup, offline, the guide itself or dev pages. 404 suppresses it too. */
const HIDDEN_PREFIXES = ["/auth", "/offline", "/reset-password", "/onboarding", "/install", "/dev"];

export function InstallPrompt() {
  const pathname = usePathname();
  const t = useTranslations("install");
  const { canInstall, suppressed } = useInstallState();
  const [hidden, setHidden] = useState(false);

  if (!canInstall || hidden || suppressed || HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label={t("promptTitle")}
      className="fixed inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-sheet border border-line bg-surface p-4 shadow-pop lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-primary text-on-primary">
          <Download className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">{t("promptTitle")}</p>
          <p className="mt-1 text-[13px] leading-5 text-muted">{t("promptBody")}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void promptInstall()}>
              {t("promptInstall")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setHidden(true)}>
              {t("promptLater")}
            </Button>
          </div>
        </div>
        <IconButton label={t("promptClose")} size="sm" className="-mr-1 -mt-1" onClick={() => setHidden(true)}>
          <X aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}
