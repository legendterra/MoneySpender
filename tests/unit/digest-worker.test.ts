import { describe, expect, it, vi } from "vitest";

import { triggerDigest } from "../../workers/digest-cron/src/index";

describe("digest-cron worker", () => {
  it("calls /api/cron/digest with the bearer secret and summarises the JSON reply", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ date: "2026-11-20", hour: 9, eligibleUsers: 2, sent: 5, skippedDuplicates: 0, removedSubscriptions: 1, failed: 0 }),
        { status: 200 },
      ),
    );
    const result = await triggerDigest(
      { APP_URL: "https://money.moneyspender.net/", CRON_SECRET: "s3cret" },
      fetchImpl as unknown as typeof fetch,
    );

    expect(fetchImpl).toHaveBeenCalledWith("https://money.moneyspender.net/api/cron/digest", {
      method: "GET",
      headers: { Authorization: "Bearer s3cret" },
    });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.summary).toBe("date=2026-11-20 hour=9 users=2 sent=5 duplicates=0 removed=1 failed=0");
    expect(result.summary).not.toContain("s3cret");
  });

  it("reports HTTP errors and network failures", async () => {
    const unauthorized = await triggerDigest(
      { APP_URL: "https://x.test", CRON_SECRET: "s" },
      (async () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })) as unknown as typeof fetch,
    );
    expect(unauthorized).toMatchObject({ ok: false, status: 401, summary: "error=Unauthorized" });

    const offline = await triggerDigest(
      { APP_URL: "https://x.test", CRON_SECRET: "s" },
      (async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch,
    );
    expect(offline).toMatchObject({ ok: false, status: 0, summary: "fetch failed: network down" });
  });

  it("does not call anything without a secret", async () => {
    const fetchImpl = vi.fn();
    const result = await triggerDigest({ APP_URL: "https://x.test", CRON_SECRET: "" }, fetchImpl as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
