import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { UpgradeButton } from "@/components/billing/upgrade-button";
import { PublicSiteShell } from "@/components/public/public-site-shell";
import { buttonVariants } from "@/components/ui/button-styles";
import { Panel } from "@/components/ui/panel";
import { billingEnabled } from "@/lib/lemonsqueezy";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function FeatureList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-6 text-muted">
          <Check className="mt-0.5 size-4 shrink-0 text-accent-strong" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  const enabled = billingEnabled();

  const freeFeatures = [t("free1"), t("free2"), t("free3"), t("free4"), t("free5")] as const;
  const proFeatures = [
    t("pro1"),
    t("pro2"),
    t("pro3"),
    t("pro4"),
    t("pro5"),
    t("pro6"),
  ] as const;

  return (
    <PublicSiteShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="rounded-lg p-7 sm:p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">{t("freeName")}</h2>
              <p className="text-4xl font-bold text-foreground">
                {t("freePrice")}
                <span className="text-base font-medium text-muted"> {t("freePeriod")}</span>
              </p>
              <p className="text-sm leading-7 text-muted">{t("freeDetail")}</p>
            </div>
            <FeatureList items={freeFeatures} />
            <Link
              href="/auth"
              className={cn(buttonVariants({ variant: "secondary", fullWidth: true }))}
            >
              {t("freeCta")}
            </Link>
          </div>
        </Panel>

        <Panel className="rounded-lg border-accent p-7 sm:p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-strong">
                {t("proBadge")}
              </p>
              <h2 className="text-2xl font-bold text-foreground">{t("proName")}</h2>
              <p className="text-sm leading-7 text-muted">{t("proDetail")}</p>
            </div>
            <FeatureList items={proFeatures} />
            {enabled ? (
              <UpgradeButton>{t("ctaSubscribe")}</UpgradeButton>
            ) : (
              <p className="rounded-md border border-border p-4 text-sm leading-7 text-muted">
                {t("billingDisabled")}
              </p>
            )}
          </div>
        </Panel>
      </div>
    </PublicSiteShell>
  );
}
