import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const label =
    user.user_metadata?.full_name ??
    user.email?.split("@")[0]?.replace(/\./g, " ") ??
    "Pengguna";

  return (
    <AppShell userEmail={user.email ?? "-"} userLabel={label}>
      {children}
    </AppShell>
  );
}
