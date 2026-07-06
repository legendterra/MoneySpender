import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PublicSiteShell } from "@/components/public/public-site-shell";
import { Panel } from "@/components/ui/panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");

  const sections = [
    { title: t("s1Title"), items: [t("s1i1"), t("s1i2"), t("s1i3")] },
    { title: t("s2Title"), items: [t("s2i1"), t("s2i2"), t("s2i3")] },
    { title: t("s3Title"), items: [t("s3i1"), t("s3i2"), t("s3i3")] },
    { title: t("s4Title"), items: [t("s4i1"), t("s4i2"), t("s4i3")] },
    { title: t("s5Title"), items: [t("s5i1"), t("s5i2"), t("s5i3"), t("s5i4")] },
    { title: t("s6Title"), items: [t("s6i1"), t("s6i2"), t("s6i3")] },
    { title: t("s7Title"), items: [t("s7i1"), t("s7i2"), t("s7i3")] },
  ] as const;

  return (
    <PublicSiteShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-6">
        <Panel className="rounded-lg p-7 sm:p-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">{t("summaryTitle")}</h2>
            <p className="text-sm leading-8 text-muted sm:text-base">{t("summaryP1")}</p>
            <p className="text-sm leading-8 text-muted sm:text-base">
              {t("lastUpdated")}{" "}
              <span className="font-semibold text-foreground">{t("lastUpdatedDate")}</span>
            </p>
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          {sections.map((section) => (
            <Panel key={section.title} className="rounded-lg p-7 sm:p-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                <div className="space-y-3 text-sm leading-8 text-muted sm:text-base">
                  {section.items.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            </Panel>
          ))}
        </div>

        <Panel className="rounded-lg p-7 sm:p-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">{t("contactTitle")}</h2>
            <p className="text-sm leading-8 text-muted sm:text-base">{t("contactText")}</p>
            <a
              href="mailto:legendterra@gmail.com"
              className="inline-flex text-base font-semibold text-accent-strong underline-offset-4 hover:underline"
            >
              legendterra@gmail.com
            </a>
          </div>
        </Panel>
      </div>
    </PublicSiteShell>
  );
}
