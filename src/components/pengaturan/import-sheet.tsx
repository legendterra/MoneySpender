"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, FileSpreadsheet, FileUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatDateKey, formatMoney, toUiLocale } from "@/components/ui/format";
import { Sheet } from "@/components/ui/sheet";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

type PreviewRow = {
  jenis: string;
  tanggal: string;
  nominal: number;
  kategori: string | null;
  catatan: string | null;
  dompet: string | null;
};

type Preview = {
  validRows: number;
  skippedRows: number;
  skippedDetails?: { line: number; reason: string }[];
  preview: PreviewRow[];
  unmatchedWallets?: string[];
  unmatchedCategories?: string[];
};

const JENIS_TONE: Record<string, string> = {
  Pemasukan: "text-income",
  Pengeluaran: "text-expense",
  Hutang: "text-debt",
  Piutang: "text-debt",
};

/**
 * CSV/XLSX import via POST /api/import/transactions: first `?preview=1` (nothing
 * written), then the real import after the user confirms.
 */
export function ImportSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("pengaturan");
  const locale = toUiLocale(useLocale());
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"preview" | "import" | null>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function choose(selected: File | null) {
    setPreview(null);
    setError(null);
    if (!selected) return;
    const name = selected.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx")) {
      setError(t("importWrongType"));
      return;
    }
    if (selected.size > MAX_IMPORT_FILE_SIZE) {
      setError(t("importTooBig"));
      return;
    }
    setFile(selected);
    void send(selected, true);
  }

  async function send(target: File, previewOnly: boolean) {
    const body = new FormData();
    body.append("file", target);
    setBusy(previewOnly ? "preview" : "import");
    setError(null);
    try {
      const response = await fetch(`/api/import/transactions${previewOnly ? "?preview=1" : ""}`, { method: "POST", body });
      const payload = (await response.json().catch(() => null)) as (Preview & { error?: string; imported?: number }) | null;
      if (!response.ok) {
        setError(payload?.error ?? t("importFailedStatus", { status: response.status }));
        return;
      }
      if (previewOnly) {
        setPreview(payload);
        return;
      }
      haptic("success");
      toast.success(t("importDone", { count: Number(payload?.imported ?? 0) }));
      reset();
      onOpenChange(false);
      router.refresh();
    } catch {
      setError(t("importNetwork"));
    } finally {
      setBusy(null);
    }
  }

  const warnings = [...(preview?.unmatchedWallets ?? []), ...(preview?.unmatchedCategories ?? [])];

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t("importTitle")}
      description={t("importDescription")}
      size="lg"
      footer={
        preview ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={reset} disabled={busy !== null}>
              {t("importOtherFile")}
            </Button>
            <Button
              className="flex-1"
              onClick={() => file && void send(file, false)}
              isLoading={busy === "import"}
              disabled={busy !== null || !preview.validRows}
            >
              {t("importConfirm", { count: preview.validRows })}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="grid gap-4 pt-1">
        {!preview ? (
          <>
            <label
              className={cn(
                "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-control border border-dashed border-line-strong bg-surface-2/40 px-4 py-6 text-center transition-colors hover:border-ring focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
                busy === "preview" && "pointer-events-none opacity-60",
              )}
            >
              <FileUp className="size-6 text-muted" aria-hidden="true" />
              <span className="text-[14px] font-semibold text-text">
                {busy === "preview" ? t("importReading") : file ? file.name : t("importPick")}
              </span>
              <span className="text-[12px] text-muted">{t("importPickHint")}</span>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(event) => choose(event.target.files?.[0] ?? null)}
              />
            </label>
            <a
              href="/api/export/template"
              className="inline-flex min-h-11 items-center gap-2 justify-self-start rounded-chip px-1 text-[13px] font-semibold text-primary-ink outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <FileSpreadsheet className="size-4" aria-hidden="true" />
              {t("importTemplate")}
            </a>
          </>
        ) : (
          <>
            <div className="grid gap-1">
              <p className="text-[15px] font-semibold text-text">
                {t("importReady", { count: preview.validRows })}
              </p>
              <p className="text-[13px] text-muted">
                {file?.name}
                {preview.skippedRows ? ` · ${t("importSkipped", { count: preview.skippedRows })}` : ""}
              </p>
            </div>
            {warnings.length ? (
              <div className="flex gap-2.5 rounded-control border border-debt/30 bg-debt-soft px-3.5 py-3 text-[13px] leading-5 text-text">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-debt" aria-hidden="true" />
                <p>{t("importUnmatched", { names: warnings.slice(0, 6).join(", ") })}</p>
              </div>
            ) : null}
            <div className="overflow-x-auto rounded-control border border-line">
              <table className="w-full min-w-[30rem] text-left text-[13px]">
                <thead className="bg-surface-2 text-[12px] text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">{t("colDate")}</th>
                    <th scope="col" className="px-3 py-2 font-semibold">{t("colType")}</th>
                    <th scope="col" className="px-3 py-2 font-semibold">{t("colCategory")}</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">{t("colAmount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.preview.map((row, index) => (
                    <tr key={`${row.tanggal}-${index}`}>
                      <td className="px-3 py-2 whitespace-nowrap text-muted tabular-nums">
                        {/^\d{4}-\d{2}-\d{2}$/.test(row.tanggal) ? formatDateKey(row.tanggal, locale) : row.tanggal}
                      </td>
                      <td className={cn("px-3 py-2 font-medium", JENIS_TONE[row.jenis] ?? "text-text")}>{row.jenis}</td>
                      <td className="max-w-[12rem] truncate px-3 py-2 text-text">
                        {row.kategori ?? row.catatan ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold whitespace-nowrap text-text tabular-nums">
                        {formatMoney(row.nominal, { locale })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.validRows > preview.preview.length ? (
              <p className="text-[12px] text-muted">
                {t("importMore", { count: preview.validRows - preview.preview.length })}
              </p>
            ) : null}
          </>
        )}
        {error ? (
          <p role="alert" className="rounded-control border border-expense/30 bg-expense-soft px-3.5 py-3 text-[13px] text-expense">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
