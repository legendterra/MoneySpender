"use client";

import * as React from "react";
import { Camera, ExternalLink, Layers, Plus, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from "sonner";

import { AmountField } from "@/components/dompet/amount-field";
import { Button } from "@/components/ui/button";
import { formatMoney, toUiLocale } from "@/components/ui/format";
import { compressReceiptImage, receiptStoragePath, validateReceiptFile } from "@/lib/attachments";
import type { HistoryEntry } from "@/lib/history";
import { RECEIPTS_BUCKET } from "@/lib/receipts";
import { buildSplitPayloads, remainingSplitAmount, validateSplits, type SplitDraftRow } from "@/lib/splits";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AttachmentItem = {
  id: string;
  label: string;
  file_url: string;
  signedUrl: string | null;
};

type CategoryOption = {
  id: string;
  name: string;
  type: "income" | "expense";
};

/**
 * Receipt photo attachments (transaction_attachments + receipts bucket)
 * and multi-category splits (transaction_splits) shown inside EntrySheet.
 */
export function EntryExtras({ entry }: { entry: HistoryEntry }) {
  const locale = toUiLocale(useLocale());
  const isEn = locale === "en";

  const supportsReceipts = entry.kind === "expense" || entry.kind === "income" || entry.kind === "debt";
  const supportsSplits = entry.kind === "expense" || entry.kind === "income";

  const [attachments, setAttachments] = React.useState<AttachmentItem[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [splits, setSplits] = React.useState<SplitDraftRow[]>([]);
  const [availableCategories, setAvailableCategories] = React.useState<CategoryOption[]>([]);
  const [editingSplits, setEditingSplits] = React.useState(false);
  const [savingSplits, setSavingSplits] = React.useState(false);

  const loadExtras = React.useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (supportsReceipts) {
      const col = entry.kind === "debt" ? "debt_id" : "transaction_id";
      const { data: rows } = await supabase
        .from("transaction_attachments")
        .select("id,label,file_url")
        .eq("user_id", user.id)
        .eq(col, entry.id)
        .order("created_at", { ascending: false });

      if (rows?.length) {
        const typedRows = rows as Array<{ id: unknown; label: unknown; file_url: unknown }>;
        const withUrls = await Promise.all(
          typedRows.map(async (row) => {
            const path = String(row.file_url);
            const { data: signed } = await supabase.storage
              .from(RECEIPTS_BUCKET)
              .createSignedUrl(path, 3600);
            return {
              id: String(row.id),
              label: String(row.label ?? "Struk"),
              file_url: path,
              signedUrl: signed?.signedUrl ?? null,
            };
          }),
        );
        setAttachments(withUrls);
      } else {
        setAttachments([]);
      }
    }

    if (supportsSplits) {
      const txType = entry.kind === "income" ? "income" : "expense";
      const [{ data: splitRows }, { data: catRows }] = await Promise.all([
        supabase
          .from("transaction_splits")
          .select("category_id,category_label,amount")
          .eq("user_id", user.id)
          .eq("transaction_id", entry.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("categories")
          .select("id,name,type")
          .eq("user_id", user.id)
          .eq("type", txType)
          .order("name", { ascending: true }),
      ]);
      const typedSplits = (splitRows ?? []) as Array<{ category_id: unknown; category_label: unknown; amount: unknown }>;
      setSplits(
        typedSplits.map((row) => ({
          categoryId: row.category_id ? String(row.category_id) : null,
          categoryLabel: String(row.category_label ?? ""),
          amount: Math.round(Number(row.amount) || 0),
        })),
      );
      const typedCats = (catRows ?? []) as Array<{ id: unknown; name: unknown; type: unknown }>;
      setAvailableCategories(
        typedCats.map((cat) => ({
          id: String(cat.id),
          name: String(cat.name),
          type: cat.type === "income" ? "income" : "expense",
        })),
      );
    }
  }, [entry.id, entry.kind, supportsReceipts, supportsSplits]);

  React.useEffect(() => {
    setEditingSplits(false);
    void loadExtras();
  }, [loadExtras]);

  async function onPickReceipt(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const issue = validateReceiptFile(file);
    if (issue === "type") {
      toast.error(isEn ? "Choose an image file (JPG, PNG, WebP)." : "Pilih file gambar (JPG, PNG, WebP).");
      return;
    }
    if (issue === "size") {
      toast.error(isEn ? "Receipt image must be under 5 MB." : "Ukuran foto struk maksimal 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const compressed = await compressReceiptImage(file);
      const storagePath = receiptStoragePath(user.id, entry.id, compressed.ext);
      const { error: uploadErr } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .upload(storagePath, compressed.blob, { contentType: compressed.contentType, upsert: false });
      if (uploadErr) {
        toast.error(uploadErr.message);
        return;
      }
      const insertRow =
        entry.kind === "debt"
          ? { user_id: user.id, debt_id: entry.id, label: file.name.slice(0, 60) || "Struk", file_url: storagePath }
          : { user_id: user.id, transaction_id: entry.id, label: file.name.slice(0, 60) || "Struk", file_url: storagePath };
      const { error: dbErr } = await supabase.from("transaction_attachments").insert(insertRow);
      if (dbErr) {
        await supabase.storage.from(RECEIPTS_BUCKET).remove([storagePath]);
        toast.error(dbErr.message);
        return;
      }
      toast.success(isEn ? "Receipt attached." : "Foto struk tersimpan.");
      await loadExtras();
    } finally {
      setUploading(false);
    }
  }

  async function removeAttachment(item: AttachmentItem) {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("transaction_attachments").delete().eq("id", item.id).eq("user_id", user.id);
    await supabase.storage.from(RECEIPTS_BUCKET).remove([item.file_url]);
    setAttachments((cur) => cur.filter((row) => row.id !== item.id));
    toast.success(isEn ? "Receipt removed." : "Foto struk dihapus.");
  }

  function startSplitEditor() {
    if (splits.length >= 2) {
      setEditingSplits(true);
      return;
    }
    const half = Math.floor(entry.amount / 2);
    const firstCat = availableCategories[0];
    const secondCat = availableCategories[1] ?? availableCategories[0];
    setSplits([
      { categoryId: firstCat?.id ?? null, categoryLabel: firstCat?.name ?? (isEn ? "Category 1" : "Kategori 1"), amount: half },
      { categoryId: secondCat?.id ?? null, categoryLabel: secondCat?.name ?? (isEn ? "Category 2" : "Kategori 2"), amount: Math.round(entry.amount) - half },
    ]);
    setEditingSplits(true);
  }

  async function saveSplits() {
    const issue = validateSplits(entry.amount, splits);
    if (issue) {
      toast.error(
        issue === "mismatch"
          ? isEn
            ? "Split amounts must match the transaction total."
            : "Total pecahan harus sama dengan nominal transaksi."
          : isEn
            ? "Fill all split rows with valid amounts and categories."
            : "Isi setiap baris pecahan dengan kategori dan nominal yang valid.",
      );
      return;
    }
    setSavingSplits(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("transaction_splits").delete().eq("user_id", user.id).eq("transaction_id", entry.id);
      const { error } = await supabase
        .from("transaction_splits")
        .insert(buildSplitPayloads(user.id, entry.id, splits));
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(isEn ? "Category split saved." : "Split kategori tersimpan.");
      setEditingSplits(false);
    } finally {
      setSavingSplits(false);
    }
  }

  async function clearSplits() {
    setSavingSplits(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("transaction_splits").delete().eq("user_id", user.id).eq("transaction_id", entry.id);
      setSplits([]);
      setEditingSplits(false);
      toast.success(isEn ? "Split removed." : "Split kategori dihapus.");
    } finally {
      setSavingSplits(false);
    }
  }

  if (!supportsReceipts && !supportsSplits) return null;
  const remaining = remainingSplitAmount(entry.amount, splits);

  return (
    <div className="grid gap-4">
      {supportsReceipts ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-text">
              {isEn ? "Receipt photos" : "Foto struk"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onPickReceipt(e)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              isLoading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera aria-hidden="true" />
              {isEn ? "Attach" : "Lampirkan"}
            </Button>
          </div>
          {attachments.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {attachments.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                  {item.signedUrl ? (
                    <a
                      href={item.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-w-0 items-center gap-2 text-[13px] font-medium text-primary-ink hover:underline"
                    >
                      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </a>
                  ) : (
                    <span className="truncate text-[13px] text-muted">{item.label}</span>
                  )}
                  <button
                    type="button"
                    aria-label={isEn ? "Remove receipt" : "Hapus struk"}
                    onClick={() => void removeAttachment(item)}
                    className="p-1.5 text-muted hover:text-expense"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {supportsSplits ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-text">
              {isEn ? "Category split" : "Split kategori"}
            </span>
            {!editingSplits ? (
              <Button type="button" size="sm" variant="secondary" onClick={startSplitEditor}>
                <Layers aria-hidden="true" />
                {splits.length >= 2 ? (isEn ? "Edit split" : "Ubah split") : isEn ? "Split" : "Pecah"}
              </Button>
            ) : null}
          </div>

          {!editingSplits && splits.length >= 2 ? (
            <ul className="divide-y divide-line border-y border-line">
              {splits.map((row, idx) => (
                <li key={`${row.categoryLabel}-${idx}`} className="flex items-baseline justify-between gap-2 py-2 text-[13px]">
                  <span className="truncate text-muted">{row.categoryLabel}</span>
                  <span className="font-semibold tabular-nums text-text">{formatMoney(row.amount, { locale })}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {editingSplits ? (
            <div className="grid gap-2.5 border-y border-line py-3">
              {splits.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_130px_auto] items-center gap-2">
                  <select
                    aria-label={isEn ? "Split category" : "Kategori pecahan"}
                    value={row.categoryId ?? ""}
                    onChange={(e) => {
                      const picked = availableCategories.find((c) => c.id === e.target.value);
                      setSplits((cur) =>
                        cur.map((item, i) =>
                          i === idx
                            ? { ...item, categoryId: picked?.id ?? null, categoryLabel: picked?.name ?? item.categoryLabel }
                            : item,
                        ),
                      );
                    }}
                    className="min-h-10 rounded-chip border border-line bg-surface px-2.5 text-[13px] text-text"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <AmountField
                    value={row.amount}
                    onChange={(nextVal) =>
                      setSplits((cur) => cur.map((item, i) => (i === idx ? { ...item, amount: nextVal } : item)))
                    }
                  />
                  <button
                    type="button"
                    disabled={splits.length <= 2}
                    onClick={() => setSplits((cur) => cur.filter((_, i) => i !== idx))}
                    aria-label={isEn ? "Remove row" : "Hapus baris"}
                    className="p-1.5 text-muted hover:text-expense disabled:opacity-30"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between text-[12px]">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const fallback = availableCategories[splits.length % Math.max(1, availableCategories.length)];
                    setSplits((cur) => [
                      ...cur,
                      {
                        categoryId: fallback?.id ?? null,
                        categoryLabel: fallback?.name ?? (isEn ? "Other" : "Lainnya"),
                        amount: Math.max(0, remaining),
                      },
                    ]);
                  }}
                >
                  <Plus aria-hidden="true" />
                  {isEn ? "Add row" : "Tambah baris"}
                </Button>
                <span className={remaining === 0 ? "font-semibold text-income" : "font-semibold text-expense"}>
                  {remaining === 0
                    ? isEn
                      ? "Balanced"
                      : "Pas"
                    : `${isEn ? "Diff" : "Selisih"}: ${formatMoney(remaining, { locale, sign: "always" })}`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" isLoading={savingSplits} onClick={() => void saveSplits()}>
                  {isEn ? "Save split" : "Simpan split"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingSplits(false)}>
                  {isEn ? "Cancel" : "Batal"}
                </Button>
                {splits.length >= 2 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-expense hover:text-expense"
                    onClick={() => void clearSplits()}
                  >
                    {isEn ? "Clear" : "Hapus split"}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
