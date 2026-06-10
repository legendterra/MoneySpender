import { AccountPanel } from "@/components/settings/account-panel";
import { CategoryManager } from "@/components/settings/category-manager";
import { ImportExportPanel } from "@/components/settings/import-export-panel";
import { PwaGuidePanel } from "@/components/settings/pwa-guide-panel";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { ReminderSettings } from "@/components/settings/reminder-settings";
import { PageHeading } from "@/components/page-heading";
import { OfflineSnapshotCache } from "@/components/pwa/offline-snapshot-cache";
import { getSettingsData } from "@/lib/data";

export default async function SettingsPage() {
  const data = await getSettingsData();
  return (
    <div className="space-y-6 pb-10">
      <OfflineSnapshotCache
        name="settings"
        payload={{
          categories: data.categories,
        }}
      />
      <PageHeading
        eyebrow="Atur"
        title="Bereskan preferensi biar aplikasi ikut gaya kamu."
        description="Ubah target, mata uang, kategori, dan pengingat dari satu tempat."
      />
      <div className="grid gap-4">
        <ProfileSettings profile={data.profile} />
        <CategoryManager categories={data.categories} />
        <ReminderSettings reminder={data.reminder} />
        <ImportExportPanel />
        <PwaGuidePanel />
        <AccountPanel email={data.user.email} />
      </div>
    </div>
  );
}
