import { AppShell } from "@/components/app-shell";
import { getWorkspaceIdentity } from "@/lib/auth";
import { getShellData } from "@/lib/shell-data";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [identity, catatData] = await Promise.all([getWorkspaceIdentity(), getShellData()]);

  return (
    <AppShell userEmail={identity.email} userLabel={identity.label} catatData={catatData}>
      {children}
    </AppShell>
  );
}
