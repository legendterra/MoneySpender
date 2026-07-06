import crypto from "node:crypto";

const API_BASE = "https://api.lemonsqueezy.com/v1";

export function billingEnabled() {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY &&
      process.env.LEMONSQUEEZY_STORE_ID &&
      process.env.LEMONSQUEEZY_VARIANT_ID,
  );
}

async function lemonSqueezyRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Lemon Squeezy ${path} gagal (${response.status}): ${body.slice(0, 300)}`);
  }
  return response.json();
}

/** Buat sesi checkout untuk paket Pro universal. Mengembalikan URL checkout. */
export async function createCheckoutUrl(userId: string, email?: string | null) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const json = await lemonSqueezyRequest("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: email ?? undefined,
            custom: { user_id: userId },
          },
          product_options: {
            redirect_url: `${appUrl}/settings?upgraded=1`,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: process.env.LEMONSQUEEZY_STORE_ID } },
          variant: { data: { type: "variants", id: process.env.LEMONSQUEEZY_VARIANT_ID } },
        },
      },
    }),
  });
  return (json?.data?.attributes?.url as string | undefined) ?? null;
}

/** URL portal pelanggan (kelola/batalkan langganan) — URL bertanda tangan, kedaluwarsa cepat. */
export async function getCustomerPortalUrl(subscriptionId: string) {
  const json = await lemonSqueezyRequest(`/subscriptions/${subscriptionId}`);
  return (json?.data?.attributes?.urls?.customer_portal as string | undefined) ?? null;
}

/** Verifikasi header X-Signature webhook (HMAC-SHA256 hex atas raw body). */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
) {
  if (!signature) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expected = Buffer.from(digest, "utf8");
  const received = Buffer.from(signature, "utf8");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
