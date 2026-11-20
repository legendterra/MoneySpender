/** Parses a JSON request body; `ok: false` for an empty or malformed body. */
export async function readJsonBody<T = unknown>(
  request: Request,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = (await request.json()) as T;
    if (data === null || typeof data !== "object") return { ok: false, error: "Request body must be a JSON object." };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Request body is not valid JSON." };
  }
}
