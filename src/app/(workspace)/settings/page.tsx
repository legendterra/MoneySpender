import { ProGate } from "@/components/billing/pro-gate";
import { AccountPanel } from "@/components/settings/account-panel";
import { AuditLogPanel } from "@/components/settings/audit-log-panel";
import { BillingPanel } from "@/components/settings/billing-panel";
import { BudgetSettings } from "@/components/settings/budget-settings";
import { CategoryManager } from "@/components/settings/category-manager";
import { ImportExportPanel } from "@/components/settings/import-export-panel";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { PwaGuidePanel } from "@/components/settings/pwa-guide-panel";
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
        payload={{ categories: data.categories }}
      />
      <PageHeading
        eyebrow="Atur"
        title="Bereskan preferensi biar aplikasi ikut gaya kamu."
        description="Ubah target, dompet, kategori, budget, dan pengingat dari satu tempat."
      />
      <div className="grid gap-4" id="wallets">
        <WalletManager wallets={data.wallets} currencyCode={currency} />
        <ProfileSettings profile={data.profile} />
        <BudgetSettings
          categories={data.categories}
          budgets={data.budgets}
          month={data.budgetMonth}
          currencyCode={currency}
        />
        <CategoryManager categories={data.categories} />
        <ReminderSettings reminder={data.reminder} />
        <ProGate feature="Import & export Excel/CSV">
          <ImportExportPanel />
        </ProGate>
        <PwaGuidePanel />
        <BillingPanel />
        {data.auditLogs.length > 0 && (
          <ProGate feature="Audit log aktivitas">
            <AuditLogPanel logs={data.auditLogs} />
          </ProGate>
        )}
        <AccountPanel email={data.user.email} />
      </div>
    </div>
  );
}
