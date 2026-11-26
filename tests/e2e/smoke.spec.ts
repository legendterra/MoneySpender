import { expect, test } from "@playwright/test";

// Smoke test over the public pages — no Supabase account required.
// Run with: npx playwright test (needs `npx playwright install chromium` once).

test("root redirects unauthenticated visitors to auth", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth/);
  await expect(page.locator("form").first()).toBeVisible();
});

test("auth page renders the login panel", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator("form").first()).toBeVisible();
});

test("public install, offline, privacy, terms and 404 pages render", async ({ page }) => {
  for (const route of ["/install", "/offline", "/privacy", "/terms"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  const notFound = await page.goto("/route-does-not-exist-v2");
  expect(notFound?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
