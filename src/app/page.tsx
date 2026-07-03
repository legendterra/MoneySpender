import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PublicSiteShell } from "@/components/public/public-site-shell";
import { buttonVariants } from "@/components/ui/button-styles";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const shell = await getTranslations("shell");

  const highlights = [
    { title: t("highlight1Title"), description: t("highlight1Detail") },
    { title: t("highlight2Title"), description: t("highlight2Detail") },
    { title: t("highlight3Title"), description: t("highlight3Detail") },
  ] as const;

  return (
    <PublicSiteShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Panel className="rounded-lg p-7 sm:p-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">{t("featuresTitle")}</h2>
              <p className="text-sm leading-8 text-muted sm:text-base">
                {t("featuresSubtitle")}
              </p>
            </div>
            <div className="grid gap-4">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="border-t border-border py-4 first:border-t-0"
                >
                  <p className="text-base font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-muted">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="rounded-lg p-7 sm:p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-accent-strong" />
              <h2 className="text-2xl font-bold text-foreground">{t("signInTitle")}</h2>
            </div>
            <p className="text-sm leading-8 text-muted sm:text-base">{t("signInDetail")}</p>
            <p className="text-sm leading-8 text-muted sm:text-base">{t("signInExtra")}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth"
                className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
              >
                {shell("navSignIn")}
              </Link>
              <Link
                href="/pricing"
                className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
              >
                {shell("navPricing")}
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </PublicSiteShell>
  );
}
