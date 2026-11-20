import { describe, expect, it } from "vitest";

import { deleteUserReceipts } from "@/lib/receipts";

function fakeStorage(tree: Record<string, Array<{ name: string; id: string | null }>>, failRemove = false) {
  const removed: string[][] = [];
  const client = {
    storage: {
      from: (bucket: string) => {
        expect(bucket).toBe("receipts");
        return {
          list: async (folder: string, options: { limit: number; offset: number }) => ({
            data: (tree[folder] ?? []).slice(options.offset, options.offset + options.limit),
            error: null,
          }),
          remove: async (paths: string[]) => {
            removed.push(paths);
            return failRemove ? { data: null, error: { message: "denied" } } : { data: [], error: null };
          },
        };
      },
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, removed };
}

describe("deleteUserReceipts", () => {
  it("removes every file under the user's folder, recursing into sub-folders", async () => {
    const { client, removed } = fakeStorage({
      u1: [
        { name: "a.jpg", id: "1" },
        { name: "2026", id: null },
      ],
      "u1/2026": [{ name: "b.png", id: "2" }],
    });
    expect(await deleteUserReceipts(client, "u1")).toBe(2);
    expect(removed.flat().sort()).toEqual(["u1/2026/b.png", "u1/a.jpg"]);
  });

  it("does nothing when the user has no files", async () => {
    const { client, removed } = fakeStorage({});
    expect(await deleteUserReceipts(client, "u1")).toBe(0);
    expect(removed).toHaveLength(0);
  });

  it("names the bucket when removal fails", async () => {
    const { client } = fakeStorage({ u1: [{ name: "a.jpg", id: "1" }] }, true);
    await expect(deleteUserReceipts(client, "u1")).rejects.toThrow(/storage remove on "receipts" failed: denied/);
  });
});
