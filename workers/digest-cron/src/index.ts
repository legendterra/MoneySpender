// Cloudflare Worker that triggers the MoneySpender hourly digest.
// Vercel Hobby only allows daily crons, so the hourly schedule lives here
// (wrangler.toml: crons = ["0 * * * *"]).
//
// Minimal local types keep this file free of @cloudflare/workers-types so it
// also type-checks inside the Next.js project.

export interface Env {
  APP_URL: string;
  CRON_SECRET: string;
}

type ScheduledControllerLike = { scheduledTime: number; cron: string };
type ExecutionContextLike = { waitUntil(promise: Promise<unknown>): void };

export type TriggerResult = { ok: boolean; status: number; durationMs: number; summary: string };

export async function triggerDigest(
  env: Env,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<TriggerResult> {
  const started = now();
  if (!env.CRON_SECRET || !env.APP_URL) {
    return { ok: false, status: 0, durationMs: 0, summary: "APP_URL or CRON_SECRET is not configured" };
  }

  const url = `${env.APP_URL.replace(/\/+$/, "")}/api/cron/digest`;
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const text = await response.text();
    let summary = text.slice(0, 300);
    try {
      const body = JSON.parse(text) as Record<string, unknown>;
      summary = body.error
        ? `error=${String(body.error)}`
        : `date=${body.date} hour=${body.hour} users=${body.eligibleUsers} sent=${body.sent} ` +
          `duplicates=${body.skippedDuplicates} removed=${body.removedSubscriptions} failed=${body.failed}`;
    } catch {
      // Non-JSON body (e.g. an HTML error page): keep the raw prefix.
    }
    return { ok: response.ok, status: response.status, durationMs: now() - started, summary };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: now() - started,
      summary: `fetch failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

const worker = {
  async scheduled(controller: ScheduledControllerLike, env: Env, ctx: ExecutionContextLike) {
    ctx.waitUntil(
      triggerDigest(env).then((result) => {
        const line = `[digest-cron] cron="${controller.cron}" status=${result.status} ${result.durationMs}ms ${result.summary}`;
        if (result.ok) console.log(line);
        else console.error(line);
      }),
    );
  },
};

export default worker;
