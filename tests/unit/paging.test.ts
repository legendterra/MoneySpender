import { describe, expect, it } from "vitest";

import { clampPage, pageHref, pageRange, pageWindow, paginate, parsePage, totalPages } from "@/lib/paging";

describe("paging", () => {
  it("parses page params defensively", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["2", "9"])).toBe(2);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-4")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });

  it("computes total pages and clamps", () => {
    expect(totalPages(0)).toBe(1);
    expect(totalPages(20)).toBe(1);
    expect(totalPages(21)).toBe(2);
    expect(totalPages(25, 10)).toBe(3);
    expect(clampPage(9, 3)).toBe(3);
    expect(clampPage(0, 3)).toBe(1);
  });

  it("returns inclusive Supabase ranges", () => {
    expect(pageRange(1)).toEqual({ from: 0, to: 19 });
    expect(pageRange(3, 10)).toEqual({ from: 20, to: 29 });
  });

  it("paginates in memory and clamps out-of-range pages", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    expect(paginate(items, 2, 10)).toEqual({ items: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19], page: 2, totalPages: 3, totalItems: 25 });
    expect(paginate(items, 99, 10).items).toEqual([20, 21, 22, 23, 24]);
    expect(paginate([], 1).totalPages).toBe(1);
  });

  it("builds a compact page window with gaps", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 5)).toEqual([1, 2, null, 5]);
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
  });

  it("keeps other query params and drops page=1", () => {
    expect(pageHref("/history", 1, { q: "kopi" })).toBe("/history?q=kopi");
    expect(pageHref("/history", 3, { q: "kopi", page: "2", empty: undefined })).toBe("/history?q=kopi&page=3");
    expect(pageHref("/settings/categories", 2)).toBe("/settings/categories?page=2");
  });
});
