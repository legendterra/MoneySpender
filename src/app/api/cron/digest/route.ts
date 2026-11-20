import { NextResponse, type NextRequest } from "next/server";

import { runDigest } from "@/lib/digest-runner";
import { createWebPushSender } from "@/lib/push";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Hourly digest, triggered by the Cloudflare Worker in workers/digest-cron.
 *   Authorization: Bearer <CRON_SECRET>
 *   ?dry=1          returns the plan as JSON without sending or logging
 *   ?dry=1&hour=HH  same, for a simulated WIB hour (testing only)
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const dry = params.get("dry") === "1";
  const hourParam = params.get("hour");
  let hourOverride: number | undefined;

  if (hourParam !== null) {
    if (!dry) {
      return NextResponse.json({ error: "The hour parameter is only allowed together with dry=1." }, { status: 400 });
    }
    if (!/^\d{1,2}$/.test(hourParam) || Number(hourParam) > 23) {
      return NextResponse.json({ error: `Invalid hour "${hourParam}": expected 0-23.` }, { status: 400 });
    }
    hourOverride = Number(hourParam);
  }

  try {
    const send = dry ? undefined : createWebPushSender();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminSupabaseClient() as any;
    const report = await runDigest({ client, dry, hourOverride, send });
    if (report.errors.length) console.error("digest run finished with errors:", report.errors);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("digest run failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
