import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PlainFrame } from "@/components/public/plain-frame";
import { SuppressInstallPrompt } from "@/components/pwa/install-store";
import { buttonVariants } from "@/components/ui/button-styles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notfound");
  return { title: t("metaTitle") };
}

export default async function NotFound() {
  const t = await getTranslations("notfound");
  const links = [
    { href: "/history", label: t("linkHistory") },
    { href: "/budget", label: t("linkBudget") },
    { href: "/settings", label: t("linkSettings") },
  ];
  return (
    <PlainFrame width="sm" center>
      <SuppressInstallPrompt />
      <section aria-labelledby="nf-title" className="grid gap-6">
        <p className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase tabular-nums">404</p>
        <div className="grid gap-2">
          <h1 id="nf-title" className="text-[28px] leading-tight font-bold tracking-tight text-text">
            {t("title")}
          </h1>
          <p className="text-[15px] leading-6 text-muted">{t("body")}</p>
        </div>
        <Link href="/dashboard" className={buttonVariants({ size: "lg", className: "justify-self-start" })}>
          {t("home")}
        </Link>
        <nav aria-label={t("elsewhere")} className="grid gap-2">
          <h2 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">{t("elsewhere")}</h2>
          <ul className="divide-y divide-line border-y border-line">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-[52px] items-center justify-between gap-3 text-[15px] font-medium text-text outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {link.label}
                  <ArrowRight className="size-4 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>
    </PlainFrame>
  );
}
