import { defineConfig, devices } from "@playwright/test";

const localChannel = process.env.CI ? undefined : "chrome";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    headless: true,
    channel: localChannel,
  },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        channel: localChannel,
      },
    },
    {
      name: "pixel-7",
      use: {
        ...devices["Pixel 7"],
        channel: localChannel,
      },
    },
    {
      name: "iphone-14",
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: devices["iPhone 14"].userAgent,
        channel: localChannel,
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
