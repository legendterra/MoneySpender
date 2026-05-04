import { ShieldCheck, Smartphone } from "lucide-react";

import { DeleteAccountButton } from "@/components/settings/delete-account-button";
import { LogoutButton } from "@/components/logout-button";
import { Panel } from "@/components/ui/panel";

export function AccountPanel({ email }: { email: string }) {
  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Akun</p>
        <h2 className="text-2xl font-bold text-foreground">Akun kamu</h2>
      </div>
      <div className="grid gap-3">
        <div className="rounded-2xl border border-border bg-background-strong px-4 py-4">
          <p className="text-sm font-semibold text-foreground">Email aktif</p>
          <p className="mt-1 text-sm text-muted">{email}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background-strong px-4 py-4">
          <div className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="size-4 text-accent-strong" />
            <p className="text-sm font-semibold">Login aman</p>
          </div>
          <p className="mt-2 text-sm leading-7 text-muted">
            Akun bisa masuk dengan email, link/OTP, atau Google.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background-strong px-4 py-4">
          <div className="flex items-center gap-2 text-foreground">
            <Smartphone className="size-4 text-accent-strong" />
            <p className="text-sm font-semibold">Nyaman di HP</p>
          </div>
          <p className="mt-2 text-sm leading-7 text-muted">
            Layout dibuat ringan untuk layar kecil, jadi enak dipakai sambil jalan.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-danger/25 bg-danger/8 px-4 py-4">
        <p className="text-sm font-semibold text-danger">Zona serius</p>
        <p className="mt-2 text-sm leading-7 text-muted">
          Hapus akun akan menghapus profil, kategori, transaksi, hutang, pengingat, dan sesi login.
        </p>
        <div className="mt-4">
          <DeleteAccountButton />
        </div>
      </div>
      <LogoutButton fullWidth variant="secondary" />
    </Panel>
  );
}
