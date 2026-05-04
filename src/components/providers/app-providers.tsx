"use client";

import { Toaster } from "sonner";

import { InstallPrompt } from "@/components/pwa/install-prompt";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { SupabaseAuthListener } from "@/components/supabase-auth-listener";
import { ThemeProvider } from "@/components/providers/theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SupabaseAuthListener />
      <PwaRegister />
      {children}
      <InstallPrompt />
      <Toaster
        position="top-center"
        toastOptions={{
          className: "border border-border bg-background text-foreground",
        }}
      />
    </ThemeProvider>
  );
}
