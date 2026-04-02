import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ShieldCheck } from "lucide-react";

import { PublicSiteShell } from "@/components/public/public-site-shell";
import { buttonVariants } from "@/components/ui/button-styles";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Halaman publik resmi MoneySpender berisi ringkasan produk, privacy policy, dan terms of service.",
};

const highlights = [
  {
    title: "Catatan keuangan harian",
    description:
      "Pantau pemasukan, pengeluaran, hutang, dan target keuangan dengan dashboard yang ramah mobile.",
  },
  {
    title: "Login email dan Google",
    description:
      "Akses aplikasi memakai email, OTP, atau Google Sign-In dengan alur autentikasi yang lebih praktis.",
  },
  {
    title: "Kebijakan publik siap verifikasi",
    description:
      "Tersedia halaman home, privacy policy, dan terms of service yang bisa dipakai untuk kebutuhan verifikasi Google.",
  },
] as const;

const publicResources = [
  {
    href: "/privacy",
    title: "Privacy Policy",
    description: "Penjelasan penggunaan, penyimpanan, dan perlindungan data pengguna.",
  },
  {
    href: "/terms",
    title: "Terms of Service",
    description: "Aturan penggunaan layanan, tanggung jawab akun, dan batas layanan.",
  },
] as const;

export default function HomePage() {
  return (
    <PublicSiteShell
      eyebrow="Official Home"
      title="MoneySpender untuk pencatatan keuangan yang ringan dan siap dipakai sehari-hari"
      description="Ini adalah halaman publik resmi MoneySpender. Anda dapat memakai halaman ini sebagai link aplikasi utama, sekaligus merujuk ke privacy policy dan terms of service untuk proses verifikasi Google OAuth."
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Panel className="rounded-[32px] p-7 sm:p-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Yang tersedia di aplikasi</h2>
              <p className="text-sm leading-8 text-muted sm:text-base">
                MoneySpender membantu pengguna mencatat transaksi harian, melihat ringkasan
                laporan, dan menjaga konsistensi kebiasaan finansial.
              </p>
            </div>
            <div className="grid gap-4">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-border bg-background p-4"
                >
                  <p className="text-base font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-muted">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel className="rounded-[32px] p-7 sm:p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <BadgeCheck className="size-5 text-success" />
                <h2 className="text-2xl font-bold text-foreground">Halaman pendukung verifikasi</h2>
              </div>
              <div className="grid gap-4">
                {publicResources.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-[24px] border border-border bg-background p-4 transition hover:border-accent/30 hover:bg-background-strong"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">{item.title}</p>
                        <p className="mt-2 text-sm leading-7 text-muted">{item.description}</p>
                      </div>
                      <ArrowRight className="mt-1 size-4 text-accent-strong" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </Panel>

          <Panel className="rounded-[32px] p-7 sm:p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-accent-strong" />
                <h2 className="text-2xl font-bold text-foreground">Mulai pakai aplikasi</h2>
              </div>
              <p className="text-sm leading-8 text-muted sm:text-base">
                Pengguna baru bisa masuk lewat email atau Google, lalu melanjutkan ke
                dashboard untuk mengelola transaksi dan pengingat harian.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/auth"
                  className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
                >
                  Buka halaman auth
                </Link>
                <Link
                  href="/privacy"
                  className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
                >
                  Lihat privacy policy
                </Link>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </PublicSiteShell>
  );
}
