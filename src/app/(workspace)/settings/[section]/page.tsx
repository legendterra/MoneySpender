import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AppearanceSection, ProfileSection, SavingsSection } from "@/components/pengaturan/basics";
import { CategoriesSection } from "@/components/pengaturan/categories-section";
import { AccountSection, DataSection } from "@/components/pengaturan/misc-sections";
import { NotificationsSection } from "@/components/pengaturan/notifications-section";
import { RecurringSection, TemplatesSection } from "@/components/pengaturan/rules-section";
import { SecuritySection } from "@/components/pengaturan/security-section";
import { SETTINGS_SECTIONS } from "@/components/pengaturan/settings-sections";
import {
  getCategoriesSettings,
  getNotificationSettings,
  getProfileSettings,
  getRecurringSettings,
  getTemplateSettings,
} from "@/lib/data-settings";
import { parsePage } from "@/lib/paging";

type Props = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ page?: string; type?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  const entry = SETTINGS_SECTIONS.find((item) => item.slug === section);
  const t = await getTranslations("pengaturan");
  return { title: entry ? t(entry.key) : undefined };
}

export default async function SettingsSectionPage({ params, searchParams }: Props) {
  const [{ section }, query] = await Promise.all([params, searchParams]);
  const page = parsePage(query.page);

  switch (section) {
    case "profil": {
      const data = await getProfileSettings();
      return <ProfileSection userId={data.user.id} name={data.profile.full_name ?? ""} email={data.user.email} />;
    }
    case "tampilan":
      return <AppearanceSection />;
    case "tabungan": {
      const data = await getProfileSettings();
      return (
        <SavingsSection
          userId={data.user.id}
          goal={Number(data.profile.monthly_savings_goal ?? 0)}
          reserve={data.profile.reserve_savings}
        />
      );
    }
    case "kategori": {
      const data = await getCategoriesSettings(query.type === "income" ? "income" : "expense", page);
      return (
        <CategoriesSection
          userId={data.userId}
          type={data.type}
          items={data.items}
          page={data.page}
          totalPages={data.totalPages}
          totalItems={data.totalItems}
        />
      );
    }
    case "berulang": {
      const data = await getRecurringSettings(page);
      return (
        <RecurringSection
          userId={data.userId}
          items={data.items}
          active={data.active}
          categories={data.categories}
          wallets={data.wallets}
          pageInfo={{ page: data.page, totalPages: data.totalPages, totalItems: data.totalItems }}
        />
      );
    }
    case "template": {
      const data = await getTemplateSettings(page);
      return (
        <TemplatesSection
          userId={data.userId}
          items={data.items}
          categories={data.categories}
          wallets={data.wallets}
          nextSortOrder={data.nextSortOrder}
          pageInfo={{ page: data.page, totalPages: data.totalPages, totalItems: data.totalItems }}
        />
      );
    }
    case "notifikasi": {
      const data = await getNotificationSettings();
      return <NotificationsSection userId={data.userId} reminder={data.reminder} deviceCount={data.deviceCount} />;
    }
    case "keamanan": {
      const data = await getProfileSettings();
      return <SecuritySection email={data.user.email} />;
    }
    case "data":
      return <DataSection />;
    case "akun": {
      const data = await getProfileSettings();
      return <AccountSection email={data.user.email} />;
    }
    case "pasang":
      redirect("/install");
    default:
      notFound();
  }
}
