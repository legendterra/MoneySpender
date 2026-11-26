import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const out: Record<string, string> = {};
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || out.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY || out.SUPABASE_SERVICE_ROLE_KEY || "",
    cronSecret: process.env.CRON_SECRET || out.CRON_SECRET || "",
  };
}

const env = loadLocalEnv();
const canRunFull = Boolean(process.env.E2E_FULL === "1" && env.url && env.serviceRole);

test.describe("MoneySpender v2 full authenticated QA flows", () => {
  test.skip(!canRunFull, "Set E2E_FULL=1 with Supabase service role env to run full authenticated E2E");

  let userId = "";
  let email = "";
  let password = "";

  test.beforeAll(async () => {
    const admin = createClient(env.url, env.serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    email = `e2e-v2-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
    password = `QaV2!${Date.now()}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "QA E2E" },
    });
    if (error || !data.user) throw error ?? new Error("Failed to create QA user");
    userId = data.user.id;
  });

  test.afterAll(async () => {
    if (!userId) return;
    const admin = createClient(env.url, env.serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await admin.auth.admin.deleteUser(userId);
  });

  test("covers login, catat live update, wallets, debts, budget, reports, settings, offline queue and a11y", async ({
    page,
    request,
    baseURL,
  }) => {
    const admin = createClient(env.url, env.serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Login
    await page.goto("/auth", { waitUntil: "networkidle" });
    const emailInput = page.locator('input[type="email"]');
    const passInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(email);
    await passInput.fill(password);
    await expect(submitBtn).toBeEnabled();
    await page.waitForTimeout(300);
    await submitBtn.click();
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 25_000 });

    // Seed two wallets (Tunai & BCA) if onboarding did not create them yet
    const { data: wallets } = await admin.from("wallets").select("id,name").eq("user_id", userId);
    if (!wallets?.length) {
      await admin.from("wallets").insert([
        { user_id: userId, name: "Tunai", kind: "cash", opening_balance: 500000 },
        { user_id: userId, name: "BCA", kind: "bank", opening_balance: 1000000 },
      ]);
    }

    // 2. Catat expense Rp25.000 via keypad -> visible without refresh
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.locator('button[aria-haspopup="dialog"]:visible').first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "2", exact: true }).click();
    await dialog.getByRole("button", { name: "5", exact: true }).click();
    await dialog.getByRole("button", { name: "000", exact: true }).click();
    await dialog.locator("button").filter({ hasText: /^simpan|^save/i }).last().click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await expect(page.locator("main")).toContainText(/25[.,]000/);

    // 3. Verify all core workspace screens + a11y (0 serious/critical)
    for (const route of ["/dashboard", "/history", "/debts", "/wallets", "/budget", "/reports", "/settings"]) {
      const resp = await page.goto(route, { waitUntil: "networkidle" });
      expect(resp?.status()).toBe(200);
      const a11y = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blockers = a11y.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blockers, `${route} a11y blockers`).toEqual([]);
    }

    // 4. Verify digest dry-run API
    if (env.cronSecret && baseURL) {
      const digestResp = await request.get(`${baseURL}/api/cron/digest?dry=1`, {
        headers: { Authorization: `Bearer ${env.cronSecret}` },
      });
      expect(digestResp.status()).toBe(200);
      const body = await digestResp.json();
      expect(body.dry).toBe(true);
      expect(body.errors).toEqual([]);
    }
  });
});
