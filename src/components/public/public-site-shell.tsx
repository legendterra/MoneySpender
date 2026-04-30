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
        <header className="glass-panel rounded-[24px] px-5 py-4 sm:px-6">
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

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel className="overflow-hidden rounded-[24px] p-7 sm:p-9">
            <div className="space-y-5">
              <p className="inline-flex rounded-xl border border-border bg-accent-soft px-4 py-2 text-xs font-black uppercase text-accent-strong">
                {eyebrow}
              </p>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black leading-tight text-foreground sm:text-5xl">
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

          <Panel className="rounded-[24px] p-7 sm:p-9">
            <div className="space-y-5">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Link yang biasanya diminta</h2>
                <p className="text-sm leading-7 text-muted">
                  Kalau butuh link untuk login Google, review aplikasi, atau halaman legal, pakai ini.
                </p>
              </div>
              <div className="space-y-3">
                {publicLinks.map((item) => (
                  <div
                    key={item.href}
                    className="rounded-[18px] border border-border bg-background-strong p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      {item.label}
                    </p>
                    <Link
                      href={item.href}
                      className="mt-2 block text-sm font-semibold text-accent-strong underline-offset-4 hover:underline"
                    >
                      {`https://money.moneyspender.net${item.href === "/" ? "" : item.href}`}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </section>

        <section>{children}</section>

        <footer className="glass-panel rounded-[24px] px-5 py-4 text-sm leading-7 text-muted">
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
