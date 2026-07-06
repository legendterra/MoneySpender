import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolvePlan, type SubscriptionRow } from "@/lib/billing";
import { verifyWebhookSignature } from "@/lib/lemonsqueezy";

function subscription(overrides: Partial<SubscriptionRow>): SubscriptionRow {
  return {
    plan: "pro",
    status: "active",
    provider_customer_id: "1",
    provider_subscription_id: "2",
    current_period_end: null,
    ...overrides,
  };
}

describe("resolvePlan", () => {
  describe("when billing is enabled", () => {
    beforeEach(() => {
      vi.stubEnv("LEMONSQUEEZY_API_KEY", "test-key");
      vi.stubEnv("LEMONSQUEEZY_STORE_ID", "1");
      vi.stubEnv("LEMONSQUEEZY_VARIANT_MONTHLY", "2");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns free when there is no subscription row", () => {
      expect(resolvePlan(null)).toBe("free");
    });

    it("returns pro for active and on_trial statuses", () => {
      expect(resolvePlan(subscription({ status: "active" }))).toBe("pro");
      expect(resolvePlan(subscription({ status: "on_trial" }))).toBe("pro");
    });

    it("keeps cancelled subscriptions pro until the paid period ends", () => {
      const future = new Date(Date.now() + 86_400_000).toISOString();
      const past = new Date(Date.now() - 86_400_000).toISOString();
      expect(
        resolvePlan(subscription({ status: "cancelled", current_period_end: future })),
      ).toBe("pro");
      expect(
        resolvePlan(subscription({ status: "cancelled", current_period_end: past })),
      ).toBe("free");
    });

    it("returns free for expired subscriptions and non-pro plans", () => {
      expect(resolvePlan(subscription({ status: "expired" }))).toBe("free");
      expect(resolvePlan(subscription({ plan: "free" }))).toBe("free");
    });
  });

  it("treats everyone as pro while billing is disabled", () => {
    expect(resolvePlan(null)).toBe("pro");
  });
});

describe("verifyWebhookSignature", () => {
  const secret = "webhook-secret";
  const body = '{"meta":{"event_name":"subscription_created"}}';
  const validSignature = createHmac("sha256", secret).update(body).digest("hex");

  it("accepts a valid HMAC-SHA256 hex signature", () => {
    expect(verifyWebhookSignature(body, validSignature, secret)).toBe(true);
  });

  it("rejects missing, malformed, or forged signatures", () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
    expect(verifyWebhookSignature(body, "deadbeef", secret)).toBe(false);
    expect(verifyWebhookSignature(`${body} `, validSignature, secret)).toBe(false);
  });
});
