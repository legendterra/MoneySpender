"use client";

import { MotionConfig } from "framer-motion";

import { InstallPrompt } from "@/components/pwa/install-prompt";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { AppLockGate } from "@/components/providers/app-lock-gate";
import { PrivacyProvider } from "@/components/providers/privacy-provider";
import { SupabaseAuthListener } from "@/components/supabase-auth-listener";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PrivacyProvider>
        <MotionConfig reducedMotion="user">
          <SupabaseAuthListener />
          <PwaRegister />
          {children}
          <AppLockGate />
          <InstallPrompt />
          <Toaster />
        </MotionConfig>
      </PrivacyProvider>
    </ThemeProvider>
  );
}
