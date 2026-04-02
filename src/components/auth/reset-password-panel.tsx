"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function ResetPasswordPanel() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Konfirmasi password belum sama.");
      return;
    }

    setIsBusy(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });
    setIsBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password berhasil diubah.");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <Panel className="w-full max-w-xl space-y-5 rounded-[36px] p-6 sm:p-8">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent-strong">
            Reset password
          </p>
          <h1 className="text-3xl font-bold text-foreground">Buat password baru</h1>
          <p className="text-sm leading-7 text-muted">
            Setelah password disimpan, Anda langsung diarahkan kembali ke dashboard.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            type="password"
            placeholder="Password baru"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            type="password"
            placeholder="Ulangi password baru"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <Button type="submit" fullWidth isLoading={isBusy}>
            Simpan password baru
          </Button>
        </form>
      </Panel>
    </div>
  );
}
