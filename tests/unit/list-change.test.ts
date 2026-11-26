import { describe, expect, it } from "vitest";

import { applyListChange, isTempId, tempId } from "@/lib/list-change";

type Item = { id: string; name: string };
const list: Item[] = [
  { id: "a", name: "Bensin" },
  { id: "b", name: "Makan" },
];
const byName = (x: Item, y: Item) => x.name.localeCompare(y.name, "id");

describe("applyListChange", () => {
  it("replaces an existing item in place", () => {
    expect(applyListChange(list, { type: "upsert", item: { id: "b", name: "Makan siang" } })).toEqual([
      { id: "a", name: "Bensin" },
      { id: "b", name: "Makan siang" },
    ]);
  });

  it("appends a new item and re-sorts when asked", () => {
    const next = applyListChange(list, { type: "upsert", item: { id: "c", name: "Apotek" } }, byName);
    expect(next.map((item) => item.id)).toEqual(["c", "a", "b"]);
    expect(list).toHaveLength(2); // input untouched
  });

  it("removes by id and ignores unknown ids", () => {
    expect(applyListChange(list, { type: "remove", id: "a" })).toEqual([{ id: "b", name: "Makan" }]);
    expect(applyListChange(list, { type: "remove", id: "zzz" })).toEqual(list);
  });

  it("marks temporary ids", () => {
    const id = tempId();
    expect(isTempId(id)).toBe(true);
    expect(isTempId("8511e4ac-09cb-4878-a9d1-82cd9fe5bd22")).toBe(false);
    expect(tempId()).not.toBe(id);
  });
});
