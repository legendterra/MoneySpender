import { ShieldCheck, Smartphone } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { Panel } from "@/components/ui/panel";

export function AccountPanel({ email }: { email: string }) {
  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">Akun</p>
        <h2 className="text-2xl font-bold text-foreground">Status akun & kesiapan aplikasi</h2>
      </div>
      <div className="grid gap-3">
        <div className="rounded-2xl border border-border bg-background-strong px-4 py-4">
          <p className="text-sm font-semibold text-foreground">Email aktif</p>
          <p className="mt-1 text-sm text-muted">{email}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background-strong px-4 py-4">
          <div className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="size-4 text-accent-strong" />
            <p className="text-sm font-semibold">Keamanan dasar sudah siap</p>
          </div>
          <p className="mt-2 text-sm leading-7 text-muted">
            Auth memakai Supabase dengan email, password, OTP/link, dan Google.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background-strong px-4 py-4">
          <div className="flex items-center gap-2 text-foreground">
            <Smartphone className="size-4 text-accent-strong" />
            <p className="text-sm font-semibold">Mode mobile siap</p>
          </div>
          <p className="mt-2 text-sm leading-7 text-muted">
            Tampilan sudah disusun responsif untuk browser mobile dan lebar iPhone XR.
          </p>
        </div>
      </div>
      <LogoutButton fullWidth variant="secondary" />
    </Panel>
  );
}
