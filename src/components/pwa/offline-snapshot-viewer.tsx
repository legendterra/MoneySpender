"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";

import { AmountText } from "@/components/ui/amount-display";
import { toUiLocale } from "@/components/ui/format";
import { OFFLINE_QUEUE_EVENT, getOfflineQueueCount } from "@/lib/offline-queue";

type DashboardSnapshot = {
  savedAt: string;
  payload: { currency: string; month: string; income: number; expense: number; balance: number; debt: number };
};

const SNAPSHOT_KEY = "moneyspender.offline.snapshot.dashboard";

function subscribe(onChange: () => void) {
  window.addEventListener(OFFLINE_QUEUE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(OFFLINE_QUEUE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readSnapshot(): string | null {
  return window.localStorage.getItem(SNAPSHOT_KEY);
}

/** Last Beranda numbers saved on this device plus the pending offline queue. Flat rows. */
export function OfflineSnapshotViewer() {
  const t = useTranslations("offline");
  const locale = toUiLocale(useLocale());
  const raw = React.useSyncExternalStore(subscribe, readSnapshot, () => null);
  const pending = React.useSyncExternalStore(subscribe, getOfflineQueueCount, () => 0);

  const snapshot = React.useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DashboardSnapshot;
    } catch {
      return null;
    }
  }, [raw]);

  const savedAt = snapshot
    ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(snapshot.savedAt))
    : null;

  return (
    <div className="grid gap-6">
      <p className="text-[14px] leading-6 text-text">
        {pending > 0 ? t("pending", { count: pending }) : t("noPending")}
      </p>
      {snapshot ? (
        <section aria-labelledby="offline-snapshot" className="grid gap-2">
          <h2 id="offline-snapshot" className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
            {t("snapshotTitle", { time: savedAt ?? "" })}
          </h2>
          <dl className="divide-y divide-line border-y border-line text-[14px]">
            <Row label={t("balance")} value={snapshot.payload.balance} />
            <Row label={t("income")} value={snapshot.payload.income} tone="income" />
            <Row label={t("expense")} value={snapshot.payload.expense} tone="expense" />
            <Row label={t("debt")} value={snapshot.payload.debt} />
          </dl>
        </section>
      ) : (
        <p className="text-[13px] leading-5 text-muted">{t("noSnapshot")}</p>
      )}
    </div>
  );
}

function Row({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "income" | "expense" }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd>
        <AmountText value={value} tone={tone} className="font-semibold" />
      </dd>
    </div>
  );
}
