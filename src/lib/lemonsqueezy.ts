import crypto from "node:crypto";

const API_BASE = "https://api.lemonsqueezy.com/v1";

export type BillingInterval = "monthly" | "yearly";

/**
 * Billing is off unless BILLING_ENABLED is exactly "true" (PLAN.md section 2):
 * every feature is open and the Lemon Squeezy code stays dormant.
 */
export function billingEnabled() {
  return (
    process.env.BILLING_ENABLED === "true" &&
    Boolean(
      process.env.LEMONSQUEEZY_API_KEY &&
        process.env.LEMONSQUEEZY_STORE_ID &&
        process.env.LEMONSQUEEZY_VARIANT_MONTHLY,
    )
  );
}

/** Paket tahunan opsional — tombolnya hanya tampil kalau variant-nya diisi. */
export function yearlyBillingEnabled() {
  return billingEnabled() && Boolean(process.env.LEMONSQUEEZY_VARIANT_YEARLY);
}

function variantIdFor(interval: BillingInterval) {
  return interval === "yearly"
    ? process.env.LEMONSQUEEZY_VARIANT_YEARLY
    : process.env.LEMONSQUEEZY_VARIANT_MONTHLY;
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

/** Buat sesi checkout untuk paket Pro. Mengembalikan URL checkout. */
export async function createCheckoutUrl(
  userId: string,
  email: string | null | undefined,
  interval: BillingInterval,
) {
  const variantId = variantIdFor(interval);
  if (!variantId) return null;

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
          variant: { data: { type: "variants", id: variantId } },
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

/**
 * Batalkan langganan di Lemon Squeezy. Dipanggil saat user menghapus akun,
 * supaya kartu mereka tidak terus ditagih setelah datanya sudah hilang.
 */
export async function cancelSubscription(subscriptionId: string) {
  await lemonSqueezyRequest(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
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
