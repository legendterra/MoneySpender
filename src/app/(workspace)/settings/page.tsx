import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { ProfileSection } from "@/components/pengaturan/basics";
import { SettingsMenu } from "@/components/pengaturan/settings-menu";
import { getSettingsData } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("settings") };
}

/** Mobile: the section menu. Desktop: the first section (Profil) next to the sub-nav. */
export default async function SettingsPage() {
  const [data, locale] = await Promise.all([getSettingsData(), getLocale()]);
  return (
    <>
      <div className="lg:hidden">
        <SettingsMenu
          profile={data.profile}
          reminder={data.reminder}
          counts={data.counts}
          email={data.user.email}
          locale={locale}
        />
      </div>
      <div className="hidden lg:block">
        <ProfileSection userId={data.user.id} name={data.profile.full_name ?? ""} email={data.user.email} />
      </div>
    </>
  );
}
