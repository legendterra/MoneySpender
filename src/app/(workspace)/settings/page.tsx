import { AccountPanel } from "@/components/settings/account-panel";
import { CategoryManager } from "@/components/settings/category-manager";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { ReminderSettings } from "@/components/settings/reminder-settings";
import { PageHeading } from "@/components/page-heading";
import { getSettingsData } from "@/lib/data";

export default async function SettingsPage() {
  const data = await getSettingsData();

  return (
    <div className="space-y-6 pb-10">
      <PageHeading
        eyebrow="Atur"
        title="Bereskan preferensi biar aplikasi ikut gaya kamu."
        description="Ubah target, mata uang, kategori, dan pengingat dari satu tempat."
      />
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <ProfileSettings profile={data.profile} />
          <CategoryManager categories={data.categories} />
        </div>
        <div className="grid gap-4">
          <ReminderSettings reminder={data.reminder} />
          <AccountPanel email={data.user.email} />
        </div>
      </div>
    </div>
  );
}
