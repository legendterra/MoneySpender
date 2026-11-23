"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ArrowRight, CheckCircle2, Building2, Smartphone, Coins, CreditCard, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type WalletKind = "cash" | "bank" | "ewallet" | "card" | "other";

type WalletEntry = {
  id: string;
  name: string;
  kind: WalletKind;
  opening_balance: number;
};

const kindConfig: Record<WalletKind, { label: string; icon: React.ElementType; color: string }> = {
  cash: { label: "Tunai", icon: Coins, color: "#22c55e" },
  bank: { label: "Bank", icon: Building2, color: "#3b82f6" },
  ewallet: { label: "E-Wallet", icon: Smartphone, color: "#a855f7" },
  card: { label: "Kartu Kredit", icon: CreditCard, color: "#f59e0b" },
  other: { label: "Lainnya", icon: Package, color: "#6b7280" },
};

const walletPresets: Array<{ name: string; kind: WalletKind }> = [
  { name: "Tunai", kind: "cash" },
  { name: "BCA", kind: "bank" },
  { name: "Mandiri", kind: "bank" },
  { name: "BRI", kind: "bank" },
  { name: "GoPay", kind: "ewallet" },
  { name: "OVO", kind: "ewallet" },
  { name: "Dana", kind: "ewallet" },
  { name: "ShopeePay", kind: "ewallet" },
];

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export function OnboardingWizard({ userName }: { userName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [wallets, setWallets] = useState<WalletEntry[]>([
    { id: generateId(), name: "Tunai", kind: "cash", opening_balance: 0 },
  ]);
  const [newWallet, setNewWallet] = useState<{ name: string; kind: WalletKind; opening_balance: number }>({
    name: "",
    kind: "bank",
    opening_balance: 0,
  });

  function addPreset(preset: { name: string; kind: WalletKind }) {
    if (wallets.some((w) => w.name.toLowerCase() === preset.name.toLowerCase())) {
      toast.info(`${preset.name} sudah ada di daftar.`);
      return;
    }
    setWallets((prev) => [...prev, { id: generateId(), name: preset.name, kind: preset.kind, opening_balance: 0 }]);
  }

  function addCustomWallet() {
    const name = newWallet.name.trim();
    if (!name) {
      toast.error("Nama dompet tidak boleh kosong.");
      return;
    }
    if (wallets.some((w) => w.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Nama dompet sudah dipakai.");
      return;
    }
    setWallets((prev) => [
      ...prev,
      { id: generateId(), name, kind: newWallet.kind, opening_balance: newWallet.opening_balance },
    ]);
    setNewWallet({ name: "", kind: "bank", opening_balance: 0 });
  }

  function removeWallet(id: string) {
    if (wallets.length <= 1) {
      toast.error("Minimal 1 dompet harus ada.");
      return;
    }
    setWallets((prev) => prev.filter((w) => w.id !== id));
  }

  function updateBalance(id: string, balance: number) {
    setWallets((prev) => prev.map((w) => (w.id === id ? { ...w, opening_balance: balance } : w)));
  }

  async function finish() {
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

    const rows = wallets.map((w) => ({
      user_id: user.id,
      name: w.name,
      kind: w.kind,
      opening_balance: w.opening_balance,
      color:
        w.kind === "cash" ? "#22c55e" :
        w.kind === "bank" ? "#3b82f6" :
        w.kind === "ewallet" ? "#a855f7" :
        w.kind === "card" ? "#f59e0b" : "#6b7280",
    }));

    const { error } = await supabase.from("wallets").insert(rows);
    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setStep(3);
  }

  const totalBalance = wallets.reduce((s, w) => s + w.opening_balance, 0);
  const currency = "IDR";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <LogoMark />
          <span className="rounded-full border border-border bg-background-elevated px-3 py-1 text-xs font-semibold text-muted">
            {step === 3 ? "Selesai" : `Langkah ${step} / 2`}
          </span>
        </div>

        {/* Step 1 — Pilih dompet */}
        {step === 1 && (
          <div className="space-y-6 rounded-xl border border-border bg-background-elevated p-7 shadow-sm">
            <div className="space-y-2">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Setup dompet</p>
              <h1 className="text-2xl font-bold text-foreground">
                Hei {userName.split(" ")[0]}, uangmu ada di mana saja?
              </h1>
              <p className="text-sm leading-7 text-muted">
                Pilih atau tambah dompet yang kamu pakai sehari-hari. Ini jadi dasar kalkulasi saldo dan Net Worth kamu.
              </p>
            </div>

            {/* Quick presets */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Tambah cepat</p>
              <div className="flex flex-wrap gap-2">
                {walletPresets.map((preset) => {
                  const already = wallets.some((w) => w.name.toLowerCase() === preset.name.toLowerCase());
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      disabled={already}
                      onClick={() => addPreset(preset)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background-strong px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {already ? <CheckCircle2 className="size-3 text-accent" /> : <Plus className="size-3" />}
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom wallet input */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Tambah dompet lain</p>
              <div className="flex flex-wrap gap-2">
                <input
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 min-w-[120px]"
                  placeholder="Nama dompet"
                  value={newWallet.name}
                  onChange={(e) => setNewWallet((p) => ({ ...p, name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addCustomWallet()}
                />
                <select
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  value={newWallet.kind}
                  onChange={(e) => setNewWallet((p) => ({ ...p, kind: e.target.value as WalletKind }))}
                >
                  {Object.entries(kindConfig).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addCustomWallet}
                  className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
                >
                  <Plus className="size-4" /> Tambah
                </button>
              </div>
            </div>

            {/* Wallet list */}
            <div className="space-y-2">
              {wallets.map((w) => {
                const cfg = kindConfig[w.kind];
                const Icon = cfg.icon;
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background-strong px-4 py-3"
                  >
                    <div
                      className="grid size-9 flex-shrink-0 place-items-center rounded-md"
                      style={{ background: `${cfg.color}20` }}
                    >
                      <Icon className="size-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{w.name}</p>
                      <p className="text-xs text-muted">{cfg.label}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeWallet(w.id)}
                      className="rounded-md p-1.5 text-muted transition-colors hover:text-danger"
                      aria-label={`Hapus ${w.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <Button fullWidth size="lg" onClick={() => setStep(2)}>
              Lanjut: Isi saldo awal
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {/* Step 2 — Saldo awal */}
        {step === 2 && (
          <div className="space-y-6 rounded-xl border border-border bg-background-elevated p-7 shadow-sm">
            <div className="space-y-2">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Saldo awal</p>
              <h1 className="text-2xl font-bold text-foreground">Berapa saldo masing-masing dompet?</h1>
              <p className="text-sm leading-7 text-muted">
                Isi saldo yang kamu punya sekarang di tiap dompet. Ini jadi titik awal Net Worth kamu. Bisa skip kalau tidak hafal — bisa diupdate nanti di Settings.
              </p>
            </div>

            <div className="space-y-3">
              {wallets.map((w) => {
                const cfg = kindConfig[w.kind];
                const Icon = cfg.icon;
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background-strong px-4 py-3"
                  >
                    <div
                      className="grid size-9 flex-shrink-0 place-items-center rounded-md"
                      style={{ background: `${cfg.color}20` }}
                    >
                      <Icon className="size-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="mb-1 text-sm font-semibold text-foreground">{w.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted">Rp</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={w.opening_balance || ""}
                          placeholder="0"
                          onChange={(e) => updateBalance(w.id, Number(e.target.value) || 0)}
                          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg border border-accent/20 bg-accent-soft px-4 py-3">
              <p className="text-xs font-semibold text-accent">Total awal kamu</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(totalBalance)}
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setStep(1)}>
                Kembali
              </Button>
              <Button fullWidth size="lg" isLoading={isSaving} onClick={() => void finish()}>
                Simpan & masuk
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div className="space-y-6 rounded-xl border border-border bg-background-elevated p-7 shadow-sm text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="grid size-16 place-items-center rounded-full bg-accent/10">
                <CheckCircle2 className="size-8 text-accent" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Siap, {userName.split(" ")[0]}!</h1>
                <p className="text-sm leading-7 text-muted">
                  {wallets.length} dompet sudah terdaftar dengan total saldo awal{" "}
                  <strong className="text-foreground">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(totalBalance)}
                  </strong>
                  . Sekarang mulai catat transaksi dan pantau keuanganmu.
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              {wallets.map((w) => {
                const cfg = kindConfig[w.kind];
                const Icon = cfg.icon;
                return (
                  <div key={w.id} className="flex items-center justify-between rounded-lg border border-border bg-background-strong px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Icon className="size-4" style={{ color: cfg.color }} />
                      <span className="text-sm font-semibold text-foreground">{w.name}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(w.opening_balance)}
                    </span>
                  </div>
                );
              })}
            </div>

            <Button fullWidth size="lg" onClick={() => router.push("/dashboard")}>
              Buka dashboard
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
