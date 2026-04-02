"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LogoutButton({
  fullWidth = false,
  variant = "ghost",
}: {
  fullWidth?: boolean;
  variant?: "ghost" | "secondary" | "danger";
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    router.replace("/auth");
    router.refresh();
  }

  return (
    <Button type="button" variant={variant} onClick={handleLogout} fullWidth={fullWidth}>
      <LogOut className="size-4" />
      Logout
    </Button>
  );
}
