"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export function ImportExportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<{ validRows: number; skippedRows: number; preview: Array<Record<string, unknown>> } | null>(null);

  async function submitCsv(previewOnly: boolean) {
    if (!file) {
      toast.error("Pilih file CSV dulu.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setIsImporting(true);
    const response = await fetch(`/api/import/transactions${previewOnly ? "?preview=1" : ""}`, {
      method: "POST",
      body: formData,
    });
    setIsImporting(false);

    const payload = (await response.json().catch(() => null)) as { imported?: number; error?: string } | null;

    if (!response.ok) {
      toast.error(payload?.error ?? "Import gagal.");
      return;
    }

    if (previewOnly) {
      setPreview(payload as typeof preview);
      toast.success("Preview CSV siap dicek.");
      return;
    }

    toast.success(`${payload?.imported ?? 0} transaksi berhasil diimport.`);
    setPreview(null);
  }

  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Backup</p>
        <h2 className="text-2xl font-bold text-foreground">Import dan export data</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          CSV import menerima kolom: jenis, tanggal, nominal, kategori, catatan, detail.
        </p>
      </div>
      <div className="grid gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          className="rounded-md border border-border bg-background-strong px-4 py-3 text-sm text-foreground"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        {preview ? (
          <div className="rounded-md border border-border bg-background-strong p-4 text-sm text-muted">
            <p className="font-bold text-foreground">{preview.validRows} baris valid, {preview.skippedRows} dilewati.</p>
            <div className="mt-3 grid gap-2">
              {preview.preview.map((row, index) => (
                <p key={index}>{String(row.tanggal)} | {String(row.jenis)} | {String(row.nominal)} | {String(row.catatan)}</p>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <Button variant="secondary" onClick={() => void submitCsv(true)} isLoading={isImporting}>
            Preview CSV
          </Button>
          <Button onClick={() => void submitCsv(false)} isLoading={isImporting}>
            Import CSV
          </Button>
          <Link href="/api/export/transactions" className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-background-strong px-5 text-sm font-bold text-foreground">
            Export semua CSV
          </Link>
        </div>
      </div>
    </Panel>
  );
}
