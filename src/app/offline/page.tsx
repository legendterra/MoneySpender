import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PlainFrame } from "@/components/public/plain-frame";
import { OfflineSnapshotViewer } from "@/components/pwa/offline-snapshot-viewer";
import { RetryButton } from "@/components/pwa/retry-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("offline");
  return { title: t("metaTitle") };
}

/** Served by the service worker when a page cannot load without a connection. */
export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <PlainFrame width="sm" center logoHref={null}>
      <section aria-labelledby="offline-title" className="grid gap-6">
        <WifiOff className="size-7 text-muted" aria-hidden="true" />
        <div className="grid gap-2">
          <h1 id="offline-title" className="text-[28px] leading-tight font-bold tracking-tight text-text">
            {t("title")}
          </h1>
          <p className="text-[15px] leading-6 text-muted">{t("body")}</p>
        </div>
        <OfflineSnapshotViewer />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <RetryButton />
          <Link href="/dashboard" className="text-[14px] font-semibold text-text underline decoration-line-strong underline-offset-4 hover:decoration-text">
            {t("openHome")}
          </Link>
        </div>
      </section>
    </PlainFrame>
  );
}
