"use client";

import * as React from "react";
import { BellRing, CircleCheck, Download, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { APP_URL } from "@/components/install/constants";
import { isStandaloneDisplay, promptInstall, useInstallState } from "@/components/pwa/install-store";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

type Platform = "android" | "iphone";


const bold = (chunks: React.ReactNode) => <strong className="font-semibold text-text">{chunks}</strong>;

const noopSubscribe = () => () => undefined;

/** Platform of this device for the default tab (server render: Android). */
function useDetectedPlatform(): Platform {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => {
      const ua = navigator.userAgent;
      const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
      return ios ? "iphone" : "android";
    },
    () => "android",
  );
}

function useStandalone() {
  return React.useSyncExternalStore(noopSubscribe, isStandaloneDisplay, () => false);
}

/** "Instal sekarang" when the browser offers it, "Sudah terpasang" in the installed app. */
export function InstallAction({ className }: { className?: string }) {
  const t = useTranslations("install");
  const { canInstall, installed } = useInstallState();
  const standalone = useStandalone();

  if (standalone || installed) {
    return (
      <p className={cn("flex items-center gap-2 text-[14px] font-medium text-income", className)}>
        <CircleCheck className="size-[18px]" aria-hidden="true" />
        {t("installed")}
      </p>
    );
  }
  if (!canInstall) return null;
  return (
    <Button
      className={className}
      onClick={() =>
        void promptInstall().then((outcome) => {
          if (outcome === "accepted") toast.success(t("installedToast"));
        })
      }
    >
      <Download aria-hidden="true" />
      {t("installNow")}
    </Button>
  );
}

function Steps({ keys }: { keys: string[] }) {
  const t = useTranslations("install");
  return (
    <ol className="grid gap-3">
      {keys.map((key, index) => (
        <li key={key} className="flex gap-3">
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-[13px] font-bold text-text tabular-nums"
          >
            {index + 1}
          </span>
          <p className="min-w-0 pt-0.5 text-[14px] leading-6 text-muted">
            {t.rich(key, { b: bold, url: APP_URL.replace("https://", "") })}
          </p>
        </li>
      ))}
    </ol>
  );
}

const card = "rounded-sheet border border-line bg-surface p-5 md:p-6";

/** Install + daily-use guide (docs/PANDUAN-ANDROID-IPHONE.md), shared by /install. */
export function InstallGuide() {
  const t = useTranslations("install");
  const detected = useDetectedPlatform();
  const [choice, setChoice] = React.useState<Platform | null>(null);
  const platform = choice ?? detected;

  return (
    <div className="grid gap-5">
      <section aria-labelledby="install-steps-title" className={cn(card, "grid gap-4")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="install-steps-title" className="flex items-center gap-2 text-[16px] font-semibold tracking-tight text-text">
            <Smartphone className="size-[18px] text-muted" aria-hidden="true" />
            {platform === "android" ? t("androidTitle") : t("iphoneTitle")}
          </h2>
          <SegmentedControl
            label={t("platformLabel")}
            value={platform}
            onChange={setChoice}
            options={[
              { value: "android", label: t("android") },
              { value: "iphone", label: t("iphone") },
            ]}
            size="sm"
            className="w-auto min-w-[11rem]"
          />
        </div>
        {platform === "android" ? (
          <Steps keys={["androidStep1", "androidStep2", "androidStep3", "androidStep4"]} />
        ) : (
          <Steps keys={["iphoneStep1", "iphoneStep2", "iphoneStep3", "iphoneStep4", "iphoneStep5"]} />
        )}
        {platform === "iphone" ? (
          <p className="rounded-control border border-line bg-surface-2/60 px-3.5 py-3 text-[13px] leading-5 text-muted">
            {t.rich("iphoneNote", { b: bold })}
          </p>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section aria-labelledby="install-daily-title" className={cn(card, "grid gap-3")}>
          <h2 id="install-daily-title" className="text-[16px] font-semibold tracking-tight text-text">
            {t("dailyTitle")}
          </h2>
          <ul className="grid gap-2.5">
            {["dailyCatat", "dailyBeranda", "dailyRiwayat", "dailyHutang", "dailyLainnya", "dailyOffline"].map((key) => (
              <li key={key} className="flex gap-2.5 text-[14px] leading-6 text-muted">
                <span aria-hidden="true" className="mt-[11px] size-1.5 shrink-0 rounded-full bg-line-strong" />
                <span className="min-w-0">{t.rich(key, { b: bold })}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="install-notif-title" className={cn(card, "grid gap-3")}>
          <h2 id="install-notif-title" className="flex items-center gap-2 text-[16px] font-semibold tracking-tight text-text">
            <BellRing className="size-[18px] text-muted" aria-hidden="true" />
            {t("notifTitle")}
          </h2>
          <p className="text-[14px] leading-6 text-muted">{t("notifDefault")}</p>
          <dl className="grid gap-2 text-[14px] leading-6">
            {(["notif09", "notifMid", "notif21", "notifAny"] as const).map((key) => (
              <div key={key} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
                <dt className="font-semibold text-text tabular-nums">{t(`${key}When`)}</dt>
                <dd className="text-muted">{t(key)}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-line pt-3 text-[13px] leading-5 text-muted">{t.rich("notifSettings", { b: bold })}</p>
        </section>
      </div>
    </div>
  );
}
