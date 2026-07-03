import { describe, expect, it } from "vitest";

import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit (in-memory)", () => {
  it("allows requests up to the limit then blocks", async () => {
    const id = `test-${Date.now()}-block`;
    const options = { limit: 3, windowSeconds: 60 };

    for (let i = 0; i < 3; i++) {
      const result = await rateLimit(id, options);
      expect(result.success).toBe(true);
    }

    const blocked = await rateLimit(id, options);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks identifiers independently", async () => {
    const options = { limit: 1, windowSeconds: 60 };
    const first = await rateLimit(`test-${Date.now()}-a`, options);
    const second = await rateLimit(`test-${Date.now()}-b`, options);
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
  });

  it("reports a reset timestamp in the future", async () => {
    const result = await rateLimit(`test-${Date.now()}-reset`, { limit: 5, windowSeconds: 120 });
    expect(result.reset).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
