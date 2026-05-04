import { AccountPanel } from "@/components/settings/account-panel";
import { AuditLogPanel } from "@/components/settings/audit-log-panel";
import { BudgetSettings } from "@/components/settings/budget-settings";
import { CategoryManager } from "@/components/settings/category-manager";
import { ImportExportPanel } from "@/components/settings/import-export-panel";
import { PwaGuidePanel } from "@/components/settings/pwa-guide-panel";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { RecurringSettings } from "@/components/settings/recurring-settings";
import { ReminderSettings } from "@/components/settings/reminder-settings";
import { WalletManager } from "@/components/settings/wallet-manager";
import { PageHeading } from "@/components/page-heading";
import { OfflineSnapshotCache } from "@/components/pwa/offline-snapshot-cache";
import { getSettingsData } from "@/lib/data";

export default async function SettingsPage() {
  const data = await getSettingsData();
  const currency = data.profile.currency_code ?? "IDR";

  return (
    <div className="space-y-6 pb-10">
      <OfflineSnapshotCache
        name="settings"
        payload={{
          categories: data.categories,
          wallets: data.wallets,
          budgets: data.budgets,
          recurringTransactions: data.recurringTransactions,
        }}
      />
      <PageHeading
        eyebrow="Atur"
        title="Bereskan preferensi biar aplikasi ikut gaya kamu."
        description="Ubah target, mata uang, kategori, dan pengingat dari satu tempat."
      />
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <ProfileSettings profile={data.profile} />
          <WalletManager wallets={data.wallets} currencyCode={currency} />
          <CategoryManager categories={data.categories} />
          <BudgetSettings
            categories={data.categories}
            budgets={data.budgets}
            month={data.budgetMonth}
            currencyCode={currency}
          />
        </div>
        <div className="grid gap-4">
          <ReminderSettings reminder={data.reminder} />
          <ImportExportPanel />
          <PwaGuidePanel />
          <AuditLogPanel logs={data.auditLogs} />
          <RecurringSettings
            categories={data.categories}
            recurringTransactions={data.recurringTransactions}
            currencyCode={currency}
          />
          <AccountPanel email={data.user.email} />
        </div>
      </div>
    </div>
  );
}
