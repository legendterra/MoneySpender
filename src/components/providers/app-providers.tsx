"use client";

import { Toaster } from "sonner";

import { SupabaseAuthListener } from "@/components/supabase-auth-listener";
import { ThemeProvider } from "@/components/providers/theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SupabaseAuthListener />
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          className: "glass-panel text-foreground",
        }}
      />
    </ThemeProvider>
  );
}
