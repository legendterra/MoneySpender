import { AppShell } from "@/components/app-shell";
import { LocaleSync } from "@/components/locale-sync";
import { getWorkspaceIdentity } from "@/lib/auth";
import { getAccountLocale } from "@/lib/data";
import { getShellData } from "@/lib/shell-data";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [identity, catatData, accountLocale] = await Promise.all([
    getWorkspaceIdentity(),
    getShellData(),
    // Language sync must never take the whole workspace down.
    getAccountLocale().catch(() => null),
  ]);

  return (
    <AppShell userEmail={identity.email} userLabel={identity.label} catatData={catatData}>
      {accountLocale ? <LocaleSync accountLocale={accountLocale} /> : null}
      {children}
    </AppShell>
  );
}
