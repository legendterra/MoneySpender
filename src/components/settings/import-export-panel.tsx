"use client";

import { useRef, useState } from "react";
import { Download, FileDown, FileUp, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

type PreviewResult = {
  validRows: number;
  skippedRows: number;
  skippedDetails?: { line: number; reason: string }[];
  preview: Array<Record<string, unknown>>;
};

export function ImportExportPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [imported, setImported] = useState<{ transactions: number; debts: number; skipped: number } | null>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    const ext = f.name.toLowerCase();
    if (!ext.endsWith(".csv") && !ext.endsWith(".xlsx") && !ext.endsWith(".xls") && f.type !== "text/csv") {
      toast.error("Hanya file .csv atau .xlsx yang diterima.");
      return;
    }
    setFile(f);
    setPreview(null);
    setImported(null);
  }

  async function submitCsv(previewOnly: boolean) {
    if (!file) { toast.error("Pilih file dulu."); return; }
    const formData = new FormData();
    formData.append("file", file);
    setIsLoading(true);

    const res = await fetch(`/api/import/transactions${previewOnly ? "?preview=1" : ""}`, { method: "POST", body: formData });
    setIsLoading(false);

    const payload = await res.json().catch(() => null) as Record<string, unknown> | null;
    if (!res.ok) { toast.error((payload?.error as string) ?? "Import gagal."); return; }

    if (previewOnly) {
      setPreview(payload as PreviewResult);
    } else {
      setImported({ transactions: Number(payload?.transactions ?? 0), debts: Number(payload?.debts ?? 0), skipped: Number(payload?.skipped ?? 0) });
      setPreview(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success(`${Number(payload?.imported ?? 0)} data berhasil diimport.`);
    }
  }

  const jenisColor: Record<string, string> = { Pemasukan: "text-accent", Pengeluaran: "text-danger", Hutang: "text-warning", Piutang: "text-accent" };

  return (
    <Panel className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-muted">Backup & Restore</p>
        <h2 className="text-2xl font-bold text-foreground">Import dan export data</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          Export semua transaksi ke XLSX, atau import dari file CSV/XLSX. Download template dulu kalau mau import data baru.
        </p>
      </div>

      {/* Export & Template buttons */}
      <div className="grid gap-3 sm:grid-cols-2">
        <a href="/api/export/transactions" className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft px-5 py-4 text-sm font-semibold text-accent transition-colors hover:bg-accent/10">
          <FileDown className="size-5 flex-shrink-0" />
          <div>
            <p>Export semua data</p>
            <p className="text-xs font-normal text-muted">XLSX dengan ringkasan + statistik</p>
          </div>
        </a>
        <a href="/api/export/template" className="flex items-center gap-3 rounded-lg border border-border bg-background-strong px-5 py-4 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:bg-background-elevated">
          <Download className="size-5 flex-shrink-0" />
          <div>
            <p>Download template import</p>
            <p className="text-xs font-normal text-muted">XLSX dengan panduan + contoh</p>
          </div>
        </a>
      </div>

      {/* Drop zone */}
      <div>
        <p className="mb-2 text-sm font-semibold text-muted">Import CSV / XLSX</p>
        <div
          className={cn("relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-colors", isDragging ? "border-accent bg-accent-soft" : file ? "border-accent/40 bg-accent-soft/30" : "border-border bg-background-strong hover:border-accent/40")}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0] ?? null); }}
        >
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          {file ? (
            <div className="flex items-center gap-3 px-4 text-center">
              <FileUp className="size-5 flex-shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); if (inputRef.current) inputRef.current.value = ""; }} className="ml-auto rounded-md p-1 text-muted hover:text-danger">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <FileUp className="size-6 text-muted" />
              <p className="text-sm text-muted">Drag & drop file CSV/XLSX atau <span className="font-semibold text-accent">klik untuk pilih</span></p>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {file && !imported && (
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void submitCsv(true)} isLoading={isLoading}>Preview dulu</Button>
          <Button onClick={() => void submitCsv(false)} isLoading={isLoading}><FileUp className="size-4" />Import sekarang</Button>
        </div>
      )}

      {/* Preview result */}
      {preview && (
        <div className="space-y-3 rounded-lg border border-border bg-background-strong p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-accent" />
            <p className="text-sm font-semibold text-foreground">{preview.validRows} baris valid · {preview.skippedRows} dilewati</p>
          </div>

          {preview.skippedDetails?.length ? (
            <div className="rounded-md border border-warning/20 bg-warning/10 p-3">
              <p className="text-xs font-semibold text-warning">Baris yang dilewati:</p>
              {preview.skippedDetails.map((s, i) => (<p key={i} className="mt-1 text-xs text-muted">Baris {s.line}: {s.reason}</p>))}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Jenis","Tanggal","Nominal","Kategori","Keterangan"].map(h => (<th key={h} className="pb-2 pr-4 text-left font-semibold text-muted">{h}</th>))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className={cn("py-2 pr-4 font-semibold", jenisColor[String(row.jenis)] ?? "text-foreground")}>{String(row.jenis)}</td>
                    <td className="py-2 pr-4 text-muted">{String(row.tanggal)}</td>
                    <td className="py-2 pr-4 font-semibold text-foreground">{Number(row.nominal).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}</td>
                    <td className="py-2 pr-4 text-muted">{String(row.kategori ?? "-")}</td>
                    <td className="py-2 text-muted">{String(row.catatan ?? "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={() => void submitCsv(false)} isLoading={isLoading}><FileUp className="size-4" />Konfirmasi import {preview.validRows} baris</Button>
        </div>
      )}

      {/* Success state */}
      {imported && (
        <div className="flex items-start gap-3 rounded-lg border border-accent/20 bg-accent-soft px-4 py-4">
          <CheckCircle2 className="mt-0.5 size-5 flex-shrink-0 text-accent" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Import selesai</p>
            <p className="mt-1 text-muted">{imported.transactions} transaksi · {imported.debts} hutang/piutang{imported.skipped > 0 ? ` · ${imported.skipped} dilewati` : ""}</p>
          </div>
        </div>
      )}

      {/* Hints */}
      <div className="rounded-lg border border-dashed border-border px-4 py-4 text-xs leading-7 text-muted">
        <p className="font-semibold text-foreground">Catatan:</p>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>Format tanggal: <code className="rounded bg-background-strong px-1">YYYY-MM-DD</code> atau <code className="rounded bg-background-strong px-1">DD/MM/YYYY</code></li>
          <li>Nominal: angka saja, tanpa titik ribuan</li>
          <li>Jenis: Pemasukan / Pengeluaran / Hutang / Piutang</li>
          <li>Download template untuk panduan lengkap</li>
        </ul>
      </div>
    </Panel>
  );
}
