import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { PublicSiteShell } from "@/components/public/public-site-shell";
import { buttonVariants } from "@/components/ui/button-styles";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Home",
  description:
    "MoneySpender membantu mencatat pemasukan, pengeluaran, hutang, dan target uang pribadi.",
};

const highlights = [
  {
    title: "Catat cepat, tidak perlu mikir lama",
    description:
      "Masukkan pemasukan, pengeluaran, atau hutang begitu transaksi selesai. Nanti rekapnya beres sendiri.",
  },
  {
    title: "Masuk pakai cara yang nyaman",
    description:
      "Pakai email, magic link, atau Google. Pilih yang paling simpel buat kamu.",
  },
  {
    title: "Link legalnya sudah siap",
    description:
      "Halaman privasi dan syarat layanan tersedia kalau dibutuhkan untuk review atau verifikasi aplikasi.",
  },
] as const;

export default function HomePage() {
  return (
    <PublicSiteShell
      eyebrow="Money report"
      title="Catat uang masuk, uang keluar, dan hutang tanpa drama."
      description="MoneySpender dibuat buat kebiasaan kecil yang sering kelupaan: nyatet transaksi. Buka, isi sebentar, lalu lihat gambaran uangmu dengan lebih jelas."
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Panel className="rounded-[32px] p-7 sm:p-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Yang bisa kamu pakai</h2>
              <p className="text-sm leading-8 text-muted sm:text-base">
                Fokusnya simpel: catatan rapi, dashboard kebaca, dan pengingat supaya
                kebiasaan nyatet uang tidak cuma niat di awal bulan.
              </p>
            </div>
            <div className="grid gap-4">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[18px] border border-border bg-background-strong p-4"
                >
                  <p className="text-base font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-muted">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

          <Panel className="rounded-[32px] p-7 sm:p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-accent-strong" />
                <h2 className="text-2xl font-bold text-foreground">Masuk dan lanjut catat</h2>
              </div>
              <p className="text-sm leading-8 text-muted sm:text-base">
                Buat akun baru atau login dengan Google. Setelah masuk, kamu langsung
                bisa tambah transaksi dan cek ringkasannya.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/auth"
                  className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
                >
                  Login atau daftar
                </Link>
                <Link
                  href="/privacy"
                  className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
                >
                  Baca privasi
                </Link>
              </div>
            </div>
          </Panel>
      </div>
    </PublicSiteShell>
  );
}
