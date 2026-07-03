import { expect, test } from "@playwright/test";

// Smoke test over the public pages — no Supabase account required.
// Run with: npx playwright test (needs `npx playwright install chromium` once).

test("homepage renders with sign-in call to action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /masuk|login/i }).first()).toBeVisible();
});

test("auth page renders the login panel", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator("form").first()).toBeVisible();
});

test("privacy and terms pages render", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
