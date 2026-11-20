import webpush from "web-push";

export type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  /** Opened by public/sw.js on notification click. */
  url: string;
  tag: string;
};

export type PushSender = (subscription: PushSubscriptionRow, payload: PushPayload) => Promise<void>;

export type SendReport = {
  sent: number;
  /** Endpoints the push service reported as expired (404/410): delete them. */
  gone: string[];
  failed: Array<{ endpoint: string; status: number; message: string }>;
};

export function pushErrorStatus(error: unknown) {
  if (error && typeof error === "object" && "statusCode" in error) {
    return Number((error as { statusCode?: number }).statusCode) || 0;
  }
  return 0;
}

export function isGonePushStatus(status: number) {
  return status === 404 || status === 410;
}

/** Endpoints are capability URLs: never log them in full. */
export function redactEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return `${url.origin}/…${endpoint.slice(-6)}`;
  } catch {
    return "invalid-endpoint";
  }
}

const VAPID_ENV = ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const;

export function missingVapidEnv() {
  return VAPID_ENV.filter((name) => !process.env[name]);
}

/** Throws an Error naming the missing env vars when VAPID is not configured. */
export function createWebPushSender(): PushSender {
  const missing = missingVapidEnv();
  if (missing.length) throw new Error(`Web push is not configured: missing ${missing.join(", ")}.`);
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return async (subscription, payload) => {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    );
  };
}

export async function sendToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
  send: PushSender,
): Promise<SendReport> {
  const report: SendReport = { sent: 0, gone: [], failed: [] };
  for (const subscription of subscriptions) {
    try {
      await send(subscription, payload);
      report.sent += 1;
    } catch (error) {
      const status = pushErrorStatus(error);
      if (isGonePushStatus(status)) {
        report.gone.push(subscription.endpoint);
      } else {
        report.failed.push({
          endpoint: redactEndpoint(subscription.endpoint),
          status,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  return report;
}
