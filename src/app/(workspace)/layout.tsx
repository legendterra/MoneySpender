import { AppShell } from "@/components/app-shell";
import { LocaleSync } from "@/components/locale-sync";
import { getWorkspaceIdentity } from "@/lib/auth";
import { getAccountLocale } from "@/lib/data";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [identity, accountLocale] = await Promise.all([
    getWorkspaceIdentity(),
    // Language sync must never take the whole workspace down.
    getAccountLocale().catch(() => null),
  ]);

  return (
    <AppShell userEmail={identity.email} userLabel={identity.label}>
      {accountLocale ? <LocaleSync accountLocale={accountLocale} /> : null}
      {children}
    </AppShell>
  );
}
