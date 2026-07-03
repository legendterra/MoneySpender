import { NextResponse } from "next/server";

type RateLimitOptions = {
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix seconds when the current window resets. */
  reset: number;
};

// In-memory fallback. Per serverless instance only — good enough to stop
// bursts from a single warm instance; set UPSTASH_REDIS_REST_URL +
// UPSTASH_REDIS_REST_TOKEN for a shared limit across all instances.
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();
const MEMORY_BUCKET_CAP = 5000;

function pruneExpiredBuckets(now: number) {
  if (memoryBuckets.size < MEMORY_BUCKET_CAP) return;
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) memoryBuckets.delete(key);
  }
}

function limitInMemory(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + options.windowSeconds * 1000;
    memoryBuckets.set(key, { count: 1, resetAt });
    return { success: true, limit: options.limit, remaining: options.limit - 1, reset: Math.ceil(resetAt / 1000) };
  }

  bucket.count += 1;
  return {
    success: bucket.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - bucket.count),
    reset: Math.ceil(bucket.resetAt / 1000),
  };
}

async function limitWithUpstash(
  key: string,
  options: RateLimitOptions,
  url: string,
  token: string,
): Promise<RateLimitResult | null> {
  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, options.windowSeconds, "NX"],
        ["TTL", key],
      ]),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const [incr, , ttl] = (await response.json()) as Array<{ result: number }>;
    const count = incr?.result ?? 0;
    const secondsLeft = ttl?.result && ttl.result > 0 ? ttl.result : options.windowSeconds;
    return {
      success: count <= options.limit,
      limit: options.limit,
      remaining: Math.max(0, options.limit - count),
      reset: Math.ceil(Date.now() / 1000) + secondsLeft,
    };
  } catch {
    // Redis unreachable — fall back to the in-memory limiter instead of
    // failing the request.
    return null;
  }
}

export async function rateLimit(identifier: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const result = await limitWithUpstash(key, options, url, token);
    if (result) return result;
  }
  return limitInMemory(key, options);
}

/** Client key for anonymous requests: first hop of x-forwarded-for. */
export function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/**
 * Guard an API route. Returns a 429 response when over the limit, or null
 * when the request may proceed.
 *
 *   const limited = await enforceRateLimit(`import:${user.id}`, { limit: 20, windowSeconds: 600 });
 *   if (limited) return limited;
 */
export async function enforceRateLimit(
  identifier: string,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  const result = await rateLimit(identifier, options);
  if (result.success) return null;

  const retryAfter = Math.max(1, result.reset - Math.ceil(Date.now() / 1000));
  return NextResponse.json(
    { error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    },
  );
}
