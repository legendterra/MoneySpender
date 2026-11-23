// Pure list updates shared by the optimistic UI in Pengaturan and Budget.

export type ListChange<T extends { id: string }> =
  | { type: "upsert"; item: T }
  | { type: "remove"; id: string };

/**
 * Applies one change: replaces the item with the same id (or appends it), or
 * removes it. With `sort`, the result is re-sorted so a renamed or new row lands
 * where the server will put it.
 */
export function applyListChange<T extends { id: string }>(
  list: readonly T[],
  change: ListChange<T>,
  sort?: (a: T, b: T) => number,
): T[] {
  let next: T[];
  if (change.type === "remove") {
    next = list.filter((item) => item.id !== change.id);
  } else {
    const index = list.findIndex((item) => item.id === change.item.id);
    next = index >= 0 ? list.map((item, i) => (i === index ? change.item : item)) : [...list, change.item];
  }
  return sort ? [...next].sort(sort) : next;
}

/** Temporary id for an optimistic row that has no database id yet. */
export function tempId() {
  return `temp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isTempId(id: string) {
  return id.startsWith("temp-");
}
