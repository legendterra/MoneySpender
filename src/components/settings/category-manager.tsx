"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Category, TransactionType } from "@/lib/types";

const typeOptions: { value: TransactionType; label: string; color: string; description: string }[] = [
  {
    value: "income",
    label: "Masukan",
    color: "#82A5FF",
    description: "Kategori khusus uang masuk.",
  },
  {
    value: "expense",
    label: "Pengeluaran",
    color: "#4D84FF",
    description: "Kategori belanja dan uang keluar.",
  },
  {
    value: "debt",
    label: "Hutang",
    color: "#FF8A8A",
    description: "Kategori khusus pencatatan utang dan pinjaman aktif.",
  },
];

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAddCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("Isi nama kategori dulu.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sesi login berakhir.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      name: name.trim(),
      type,
      color: typeOptions.find((item) => item.value === type)?.color ?? "#4D84FF",
    });

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setName("");
    toast.success("Kategori baru berhasil dibuat.");
    router.refresh();
  }

  async function handleDeleteCategory(id: string) {
    const approved = window.confirm("Hapus kategori ini?");

    if (!approved) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Kategori berhasil dihapus.");
    router.refresh();
  }

  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Kategori</p>
        <h2 className="text-2xl font-bold text-foreground">Tambah dan hapus kategori</h2>
      </div>
      <form onSubmit={handleAddCategory} className="grid gap-4 md:grid-cols-[1.3fr_0.9fr_auto]">
        <Field label="Nama kategori">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Operasional"
          />
        </Field>
        <Field label="Jenis">
          <Select value={type} onChange={(event) => setType(event.target.value as TransactionType)}>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" fullWidth isLoading={isSubmitting}>
            Tambah
          </Button>
        </div>
      </form>
      <div className="grid gap-4 xl:grid-cols-3">
        {typeOptions.map((group) => {
          const grouped = categories.filter((category) => category.type === group.value);

          return (
            <div
              key={group.value}
              className="rounded-[26px] border border-border bg-background-strong p-4"
            >
              <div className="mb-4">
                <p className="text-sm font-semibold text-foreground">{group.label}</p>
                <p className="text-xs leading-6 text-muted">{group.description}</p>
              </div>
              <div className="space-y-3">
                {grouped.length ? (
                  grouped.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background px-3 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: category.color ?? group.color }}
                        />
                        <p className="text-sm font-semibold text-foreground">{category.name}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                        <Trash2 className="size-4" />
                        Hapus
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border px-3 py-5 text-sm text-muted">
                    Belum ada kategori {group.label.toLowerCase()}.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
