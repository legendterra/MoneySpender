import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { APP_URL } from "@/components/install/constants";
import { InstallAction, InstallGuide } from "@/components/install/install-guide";
import { PlainFrame } from "@/components/public/plain-frame";
import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("install");
  return { title: t("metaTitle"), description: t("intro") };
}

/** Public install + usage guide (no login needed): docs/PANDUAN-ANDROID-IPHONE.md. */
export default async function InstallPage() {
  const t = await getTranslations("install");
  return (
    <PlainFrame
      width="lg"
      actions={
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-text")}>
          {t("openApp")}
        </Link>
      }
    >
      <div className="grid gap-6 pt-4 md:pt-8">
        <div className="grid max-w-2xl gap-3">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">{t("eyebrow")}</p>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight text-text md:text-[36px]">{t("title")}</h1>
          <p className="text-[15px] leading-7 text-muted">{t("intro")}</p>
          <p className="text-[14px] text-muted">
            {t("address")}{" "}
            <a href={APP_URL} className="font-semibold text-text underline decoration-line-strong underline-offset-4">
              {APP_URL.replace("https://", "")}
            </a>
          </p>
          <InstallAction className="mt-1 justify-self-start" />
        </div>
        <InstallGuide />
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "primary" }))}>
            {t("openApp")}
          </Link>
          <p className="text-[13px] text-muted">{t("footer")}</p>
        </div>
      </div>
    </PlainFrame>
  );
}
