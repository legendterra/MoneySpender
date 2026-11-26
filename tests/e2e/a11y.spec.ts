import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = ["/auth", "/install", "/offline", "/privacy", "/terms"];

for (const theme of ["dark", "light"] as const) {
  test(`public screens pass WCAG AA (${theme} mode) with 0 serious/critical issues`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ colorScheme: theme });
    await context.addInitScript((mode) => {
      window.localStorage.setItem("theme", mode);
    }, theme);
    const page = await context.newPage();
    try {
      for (const route of PUBLIC_ROUTES) {
        await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}${route}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(250);

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();

        const blockers = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        expect(
          blockers,
          `[${theme}] ${route} serious/critical a11y violations:\n${JSON.stringify(blockers, null, 2)}`,
        ).toEqual([]);
      }
    } finally {
      await context.close();
    }
  });
}
