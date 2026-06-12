"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, FileDown, FileUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

type ImportWarnings = {
  unmatchedWallets?: string[];
  unmatchedCategories?: string[];
};

type PreviewResult = ImportWarnings & {
  validRows: number;
  skippedRows: number;
  skippedDetails?: { line: number; reason: string }[];
  preview: Array<Record<string, unknown>>;
};

type ImportResult = {
  transactions: number;
  debts: number;
  skipped: number;
  unmatchedWallets: string[];
  unmatchedCategories: string[];
};

export function ImportExportPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [imported, setImported] = useState<ImportResult | null>(null);

  function clearFile() {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(selectedFile: File | null) {
    if (!selectedFile) return;
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx")) {
      toast.error("Hanya file .csv atau .xlsx yang diterima.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (selectedFile.size > MAX_IMPORT_FILE_SIZE) {
      toast.error("Ukuran file maksimal 10 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(selectedFile);
    setPreview(null);
    setImported(null);
  }

  async function submitImport(previewOnly: boolean) {
    if (!file) {
      toast.error("Pilih file dulu.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/import/transactions${previewOnly ? "?preview=1" : ""}`, {
        method: "POST",
        body: formData,
      });
      const payload = await res.json().catch(() => null) as Record<string, unknown> | null;

      if (!res.ok) {
        toast.error((payload?.error as string) ?? "Import gagal.");
        return;
      }

      if (previewOnly) {
        setPreview(payload as PreviewResult);
        return;
      }

      setImported({
        transactions: Number(payload?.transactions ?? 0),
        debts: Number(payload?.debts ?? 0),
        skipped: Number(payload?.skipped ?? 0),
        unmatchedWallets: (payload?.unmatchedWallets as string[] | undefined) ?? [],
        unmatchedCategories: (payload?.unmatchedCategories as string[] | undefined) ?? [],
      });
      setPreview(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
      toast.success(`${Number(payload?.imported ?? 0)} data berhasil di-import.`);
    } catch {
      toast.error("Import gagal karena koneksi bermasalah.");
    } finally {
      setIsLoading(false);
    }
  }

  const jenisColor: Record<string, string> = {
    Pemasukan: "text-accent",
    Pengeluaran: "text-danger",
    Hutang: "text-warning",
    Piutang: "text-accent",
  };
  const previewHasWarnings = Boolean(preview?.unmatchedWallets?.length || preview?.unmatchedCategories?.length);
  const importHasWarnings = Boolean(imported?.unmatchedWallets.length || imported?.unmatchedCategories.length);

  return (
    <Panel className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-muted">Backup & Restore</p>
        <h2 className="text-2xl font-bold text-foreground">Import dan export data</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          Export semua transaksi ke Excel, atau import dari file CSV/XLSX. Download template dulu kalau mau import data baru.
        </p>
      </div>

      {/* Export & Template buttons */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Export semua data */}
        <a href="/api/export/transactions" className="group flex items-center gap-4 rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent px-5 py-4 transition-all hover:border-accent/40 hover:shadow-sm active:scale-[0.98]">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
            <FileDown className="size-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Export semua data</p>
            <p className="text-xs text-muted">XLSX dengan ringkasan + statistik</p>
          </div>
        </a>

        {/* Template import */}
        <a href="/api/export/template" className="group flex items-center gap-4 rounded-xl border border-border bg-background-elevated px-5 py-4 transition-all hover:border-foreground/20 hover:shadow-sm active:scale-[0.98]">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
            <Download className="size-5 text-foreground/70" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Template import</p>
            <p className="text-xs text-muted">XLSX dengan panduan + contoh</p>
          </div>
        </a>

        {/* Export riwayat */}
        <a href="/api/export/transactions" className="group flex items-center gap-4 rounded-xl border border-border bg-background-elevated px-5 py-4 transition-all hover:border-foreground/20 hover:shadow-sm active:scale-[0.98]">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
            <FileDown className="size-5 text-foreground/70" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Export riwayat</p>
            <p className="text-xs text-muted">XLSX semua transaksi + hutang</p>
          </div>
        </a>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-muted">Import CSV / XLSX</p>
        <div
          className={cn(
            "relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all duration-200",
            isDragging
              ? "border-accent bg-accent/5 scale-[1.01]"
              : file
                ? "border-accent/40 bg-accent/5"
                : "border-border bg-background-elevated hover:border-accent/30 hover:bg-background-elevated/80",
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFile(event.dataTransfer.files[0] ?? null);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center gap-3 px-4 text-center">
              <FileUp className="size-5 flex-shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                aria-label="Hapus file pilihan"
                onClick={(event) => {
                  event.stopPropagation();
                  clearFile();
                }}
                className="ml-auto rounded-md p-1 text-muted hover:text-danger"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <FileUp className="size-6 text-muted" />
              <p className="text-sm text-muted">
                Drag & drop file CSV/XLSX atau <span className="font-semibold text-accent">klik untuk pilih</span>
              </p>
            </>
          )}
        </div>
      </div>

      {file && !imported && (
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void submitImport(true)} isLoading={isLoading}>Preview dulu</Button>
          <Button onClick={() => void submitImport(false)} isLoading={isLoading}>
            <FileUp className="size-4" />
            Import sekarang
          </Button>
        </div>
      )}

      {preview && (
        <div className="space-y-3 rounded-xl border border-border bg-background-elevated p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-accent" />
            <p className="text-sm font-semibold text-foreground">
              {preview.validRows} baris valid - {preview.skippedRows} dilewati
            </p>
          </div>

          {preview.skippedDetails?.length ? (
            <div className="rounded-lg border border-warning/20 bg-warning/10 p-3">
              <p className="text-xs font-semibold text-warning">Baris yang dilewati:</p>
              {preview.skippedDetails.map((skipped) => (
                <p key={`${skipped.line}-${skipped.reason}`} className="mt-1 text-xs text-muted">
                  Baris {skipped.line}: {skipped.reason}
                </p>
              ))}
            </div>
          ) : null}

          {previewHasWarnings ? (
            <div className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-muted">
              <p className="font-semibold text-warning">Referensi yang belum cocok:</p>
              {preview.unmatchedWallets?.length ? <p className="mt-1">Dompet: {preview.unmatchedWallets.join(", ")}</p> : null}
              {preview.unmatchedCategories?.length ? <p className="mt-1">Kategori: {preview.unmatchedCategories.join(", ")}</p> : null}
              <p className="mt-1">Data tetap bisa di-import, tetapi saldo dompet atau budget terkait tidak akan ikut terhubung.</p>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Jenis", "Tanggal", "Nominal", "Kategori", "Keterangan"].map((header) => (
                    <th key={header} className="pb-2 pr-4 text-left font-semibold text-muted">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, index) => (
                  <tr key={index} className="border-b border-border/40">
                    <td className={cn("py-2 pr-4 font-semibold", jenisColor[String(row.jenis)] ?? "text-foreground")}>{String(row.jenis)}</td>
                    <td className="py-2 pr-4 text-muted">{String(row.tanggal)}</td>
                    <td className="py-2 pr-4 font-semibold text-foreground">
                      {Number(row.nominal).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2 pr-4 text-muted">{String(row.kategori ?? "-")}</td>
                    <td className="py-2 text-muted">{String(row.catatan ?? "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={() => void submitImport(false)} isLoading={isLoading}>
            <FileUp className="size-4" />
            Konfirmasi import {preview.validRows} baris
          </Button>
        </div>
      )}

      {imported && (
        <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 px-5 py-4">
          <CheckCircle2 className="mt-0.5 size-5 flex-shrink-0 text-accent" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Import selesai</p>
            <p className="mt-1 text-muted">
              {imported.transactions} transaksi - {imported.debts} hutang/piutang
              {imported.skipped > 0 ? ` - ${imported.skipped} dilewati` : ""}
            </p>
            {importHasWarnings ? (
              <p className="mt-1 text-warning">Sebagian dompet/kategori tidak cocok. Periksa saldo dan budget terkait.</p>
            ) : null}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-border px-5 py-4 text-xs leading-7 text-muted">
        <p className="font-semibold text-foreground">Catatan:</p>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>Format tanggal: <code className="rounded bg-background-strong px-1">YYYY-MM-DD</code> atau <code className="rounded bg-background-strong px-1">DD/MM/YYYY</code></li>
          <li>Nominal: angka saja, tanpa titik ribuan</li>
          <li>Jenis: Pemasukan / Pengeluaran / Hutang / Piutang</li>
          <li>Nama dompet dan kategori harus sama agar saldo serta budget ikut terhubung</li>
        </ul>
      </div>
    </Panel>
  );
}
