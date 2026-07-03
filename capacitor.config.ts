import type { CapacitorConfig } from "@capacitor/cli";

// iOS wrapper untuk MoneySpender. App memuat versi web production (mode
// remote) karena app ini SSR — tidak ada export static.
//
// Langkah di Mac (butuh Xcode + Apple Developer Program):
//   npx cap add ios
//   npx cap open ios
// lalu set signing team di Xcode → archive → upload ke App Store Connect.
const config: CapacitorConfig = {
  appId: "net.moneyspender.ios",
  appName: "MoneySpender",
  // webDir wajib ada tapi tidak dipakai pada mode remote — cukup folder public.
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? "https://money.moneyspender.net",
    allowNavigation: ["money.moneyspender.net", "*.supabase.co", "accounts.google.com"],
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
