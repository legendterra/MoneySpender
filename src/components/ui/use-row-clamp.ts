"use client";

import * as React from "react";

/**
 * Keeps a wrapping flex row to at most `rows` lines by hiding trailing children
 * (`hidden` attribute, so they also leave the tab order). Children marked with
 * `data-pin` or `data-keep` always stay visible. Re-runs on resize and content change.
 */
export function useRowClamp(ref: React.RefObject<HTMLElement | null>, rows: number) {
  React.useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;

    const apply = () => {
      const items = Array.from(container.children) as HTMLElement[];
      items.forEach((item) => {
        item.hidden = false;
      });
      const tops = Array.from(new Set(items.map((item) => item.offsetTop))).sort((a, b) => a - b);
      if (tops.length <= rows) return;
      const limit = tops[rows - 1];
      const keep = (item: HTMLElement) => "pin" in item.dataset || "keep" in item.dataset;

      items.forEach((item) => {
        if (item.offsetTop > limit && !keep(item)) item.hidden = true;
      });
      for (let guard = items.length; guard > 0; guard -= 1) {
        const overflowing = items.some((item) => keep(item) && item.offsetTop > limit);
        if (!overflowing) break;
        const removable = items.filter((item) => !item.hidden && !keep(item));
        const last = removable[removable.length - 1];
        if (!last) break;
        last.hidden = true;
      }
    };

    apply();
    const resize = new ResizeObserver(apply);
    resize.observe(container);
    const mutation = new MutationObserver(apply);
    mutation.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "aria-pressed"],
    });
    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, [ref, rows]);
}
