import Link from "next/link";

import { LogoMark } from "@/components/logo-mark";
import { buttonVariants } from "@/components/ui/button-styles";
import { Panel } from "@/components/ui/panel";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/privacy", label: "Privasi" },
  { href: "/terms", label: "Syarat" },
] as const;

const reportSteps = [
  { number: "01", title: "Catat", detail: "Masukkan transaksi saat terjadi." },
  { number: "02", title: "Kelompokkan", detail: "Pisahkan pemasukan, pengeluaran, dan hutang." },
  { number: "03", title: "Baca laporan", detail: "Lihat kondisi uang tanpa menghitung ulang." },
] as const;

type PublicSiteShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function PublicSiteShell({
  eyebrow,
  title,
  description,
  children,
}: PublicSiteShellProps) {
  return (
    <main className="px-4 py-5 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col gap-6">
        <header className="glass-panel rounded-lg px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <LogoMark />
            <nav className="flex flex-wrap items-center gap-2">
              {publicLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/auth"
                className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
              >
                Masuk
              </Link>
            </nav>
          </div>
        </header>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Panel className="overflow-hidden rounded-lg p-7 sm:p-10">
            <div className="space-y-5">
              <p className="border-l-2 border-accent pl-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                {eyebrow}
              </p>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
                  {title}
                </h1>
                <p className="max-w-2xl text-sm leading-8 text-muted sm:text-base">
                  {description}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/auth"
                  className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
                >
                  Mulai catat uang
                </Link>
                <Link
                  href="/dashboard"
                  className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
                >
                  Cek dashboard
                </Link>
              </div>
            </div>
          </Panel>

          <Panel className="min-w-0 rounded-lg p-7 sm:p-9">
            <div className="space-y-5">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Laporan yang mudah dibaca</h2>
                <p className="text-sm leading-7 text-muted">
                  Alurnya sederhana supaya kamu fokus pada angka yang penting.
                </p>
              </div>
              <div className="space-y-3">
                {reportSteps.map((item) => (
                  <div
                    key={item.number}
                    className="grid min-w-0 grid-cols-[2rem_1fr] gap-3 border-t border-border py-4 first:border-t-0"
                  >
                    <p className="font-mono text-xs font-semibold text-accent-strong">
                      {item.number}
                    </p>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </section>

        <section>{children}</section>

        <footer className="glass-panel rounded-lg px-5 py-4 text-sm leading-7 text-muted">
          <p className="font-semibold text-foreground">{APP_NAME}</p>
          <p>{APP_DESCRIPTION}</p>
          <p className="mt-2">
            Kontak:{" "}
            <a
              href="mailto:legendterra@gmail.com"
              className="font-medium text-accent-strong underline-offset-4 hover:underline"
            >
              legendterra@gmail.com
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
