"use client";

import { useState } from "react";
import { Archive, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Wallet } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const walletKinds = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "ewallet", label: "E-wallet" },
  { value: "card", label: "Kartu" },
  { value: "other", label: "Lainnya" },
] as const;

export function WalletManager({ wallets, currencyCode }: { wallets: Wallet[]; currencyCode: string }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function addWallet(formData: FormData) {
    setIsSaving(true);
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sesi login berakhir.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from("wallets").insert({
      user_id: user.id,
      name: String(formData.get("name") ?? "").trim(),
      kind: String(formData.get("kind") ?? "cash"),
      opening_balance: Number(formData.get("openingBalance") ?? 0) || 0,
      color: "#4D84FF",
    });

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Dompet baru ditambahkan.");
    router.refresh();
  }

  async function archiveWallet(id: string) {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("wallets").update({ is_archived: true }).eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Dompet diarsipkan.");
    router.refresh();
  }

  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Dompet</p>
        <h2 className="text-2xl font-bold text-foreground">Pisahkan uang berdasarkan tempatnya</h2>
      </div>
      <form action={addWallet} className="grid gap-3 md:grid-cols-[1fr_0.8fr_0.8fr_auto]">
        <Field label="Nama">
          <Input name="name" placeholder="BCA, Cash, GoPay" required />
        </Field>
        <Field label="Jenis">
          <Select name="kind" defaultValue="cash">
            {walletKinds.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Saldo awal">
          <Input name="openingBalance" type="number" step="1000" defaultValue="0" />
        </Field>
        <div className="flex items-end">
          <Button type="submit" isLoading={isSaving} fullWidth>
            <Plus className="size-4" />
            Tambah
          </Button>
        </div>
      </form>
      <div className="grid gap-3">
        {wallets.length ? (
          wallets.map((wallet) => (
            <div key={wallet.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-background-strong p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{wallet.name}</p>
                <p className="text-xs text-muted">
                  {wallet.kind} | saldo awal {formatCurrency(wallet.opening_balance, currencyCode)}
                  {wallet.is_archived ? " | diarsipkan" : ""}
                </p>
              </div>
              {!wallet.is_archived ? (
                <Button variant="ghost" size="sm" onClick={() => void archiveWallet(wallet.id)}>
                  <Archive className="size-4" />
                  Arsipkan
                </Button>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
            Belum ada dompet. Tambahkan minimal satu supaya saldo per tempat bisa kebaca.
          </div>
        )}
      </div>
    </Panel>
  );
}
