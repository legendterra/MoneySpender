import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}));

const runDigest = vi.fn();
vi.mock("@/lib/digest-runner", () => ({ runDigest: (...args: unknown[]) => runDigest(...args) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: () => ({ admin: true }) }));

const { POST: subscribe } = await import("@/app/api/push/subscribe/route");
const { POST: unsubscribe } = await import("@/app/api/push/unsubscribe/route");
const { GET: digest } = await import("@/app/api/cron/digest/route");

function post(url: string, body: string) {
  return new NextRequest(url, { method: "POST", body, headers: { "content-type": "application/json" } });
}

describe("push subscribe/unsubscribe validation", () => {
  beforeEach(() => getUser.mockReset());

  it.each(["not json", "", "{", "null", "42"])("subscribe rejects body %j with 400", async (body) => {
    const response = await subscribe(post("http://localhost/api/push/subscribe", body));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/JSON/);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("subscribe rejects a subscription without keys", async () => {
    const response = await subscribe(post("http://localhost/api/push/subscribe", JSON.stringify({ endpoint: "https://push.example/x" })));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/p256dh/);
  });

  it.each(["not json", "", "[1"])("unsubscribe rejects body %j with 400", async (body) => {
    const response = await unsubscribe(post("http://localhost/api/push/unsubscribe", body));
    expect(response.status).toBe(400);
  });

  it("unsubscribe requires an endpoint", async () => {
    const response = await unsubscribe(post("http://localhost/api/push/unsubscribe", "{}"));
    expect(response.status).toBe(400);
  });
});

describe("GET /api/cron/digest", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    runDigest.mockReset();
    runDigest.mockResolvedValue({ dry: true, errors: [], plan: [] });
  });
  afterEach(() => vi.unstubAllEnvs());

  const call = (query: string, auth = "Bearer test-secret") =>
    digest(new NextRequest(`http://localhost/api/cron/digest${query}`, { headers: auth ? { authorization: auth } : {} }));

  it("requires the bearer secret", async () => {
    expect((await call("?dry=1", "")).status).toBe(401);
    expect((await call("?dry=1", "Bearer wrong")).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("?dry=1", "Bearer ")).status).toBe(401);
    expect(runDigest).not.toHaveBeenCalled();
  });

  it("allows ?hour only together with dry=1", async () => {
    const response = await call("?hour=9");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/only allowed together with dry=1/);
    expect(runDigest).not.toHaveBeenCalled();
  });

  it.each(["24", "-1", "9am", "1.5", ""])("rejects invalid hour %j", async (hour) => {
    expect((await call(`?dry=1&hour=${hour}`)).status).toBe(400);
  });

  it("passes dry + hour override to the runner without a sender", async () => {
    const response = await call("?dry=1&hour=21");
    expect(response.status).toBe(200);
    expect(runDigest).toHaveBeenCalledWith(expect.objectContaining({ dry: true, hourOverride: 21, send: undefined }));
  });

  it("refuses a live run when VAPID is not configured, naming the missing variables", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    vi.stubEnv("VAPID_SUBJECT", "");
    const response = await call("");
    expect(response.status).toBe(500);
    expect((await response.json()).error).toMatch(/NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT/);
  });
});
