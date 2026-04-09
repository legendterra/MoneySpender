import { AppShell } from "@/components/app-shell";
import { getWorkspaceIdentity } from "@/lib/auth";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const identity = await getWorkspaceIdentity();

  return (
    <AppShell userEmail={identity.email} userLabel={identity.label}>
      {children}
    </AppShell>
  );
}
