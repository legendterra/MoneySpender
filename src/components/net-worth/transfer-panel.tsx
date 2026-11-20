"use client";

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { todayWIB } from "@/lib/dates";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Wallet } from "@/lib/types";

export function TransferPanel({ wallets }: { wallets: Wallet[] }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function createTransfer(formData: FormData) {
    const fromWalletId = String(formData.get("fromWalletId") ?? "");
    const toWalletId = String(formData.get("toWalletId") ?? "");

    if (!fromWalletId || !toWalletId || fromWalletId === toWalletId) {
      toast.error("Pilih dompet asal dan tujuan yang berbeda.");
      return;
    }

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

    const { error } = await supabase.from("wallet_transfers").insert({
      user_id: user.id,
      from_wallet_id: fromWalletId,
      to_wallet_id: toWalletId,
      amount: Number(formData.get("amount") ?? 0),
      transfer_date: String(formData.get("transferDate") ?? todayWIB()),
      note: String(formData.get("note") ?? "") || null,
    });

    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Transfer dompet tersimpan.");
    router.refresh();
  }

  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Transfer</p>
        <h2 className="text-2xl font-bold text-foreground">Pindah uang antar dompet</h2>
      </div>
      <form action={createTransfer} className="grid gap-3 md:grid-cols-2">
        <Field label="Dari">
          <Select name="fromWalletId" required>
            <option value="">Pilih dompet</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Ke">
          <Select name="toWalletId" required>
            <option value="">Pilih dompet</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Nominal">
          <Input name="amount" type="number" min="1" step="1" required />
        </Field>
        <Field label="Tanggal">
          <Input name="transferDate" type="date" defaultValue={todayWIB()} required />
        </Field>
        <Field label="Catatan">
          <Input name="note" placeholder="Contoh: top up GoPay" />
        </Field>
        <div className="flex items-end">
          <Button type="submit" fullWidth isLoading={isSaving} disabled={wallets.length < 2}>
            <ArrowRightLeft className="size-4" />
            Simpan transfer
          </Button>
        </div>
      </form>
    </Panel>
  );
}
