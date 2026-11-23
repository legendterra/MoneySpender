"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LogoutButton({
  fullWidth = false,
  variant = "ghost",
  iconOnly = false,
}: {
  fullWidth?: boolean;
  variant?: "ghost" | "secondary" | "danger";
  iconOnly?: boolean;
}) {
  const t = useTranslations("nav");

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    window.location.assign(window.location.origin);
  }

  if (iconOnly) {
    return (
      <IconButton label={t("logout")} onClick={() => void handleLogout()}>
        <LogOut aria-hidden="true" />
      </IconButton>
    );
  }

  return (
    <Button type="button" variant={variant} onClick={() => void handleLogout()} fullWidth={fullWidth}>
      <LogOut aria-hidden="true" />
      {t("logout")}
    </Button>
  );
}
