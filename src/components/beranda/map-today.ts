import type { TodayItem } from "@/components/beranda/today-list";
import { describeEntry, type HistoryEntry } from "@/lib/history";

type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * Today's Riwayat entries (getTodayEntries in src/lib/data-history.ts) as
 * Beranda rows, so both screens describe a record the same way.
 * `t` is the "riwayat" translator.
 */
export function toTodayItems(entries: HistoryEntry[], t: Translate): TodayItem[] {
  return entries.map((entry) => {
    const { title, subtitle } = describeEntry(entry, t);
    return {
      id: entry.key,
      kind: entry.kind === "debt_payment" ? "debt" : entry.kind,
      flow: entry.flow,
      title,
      subtitle,
      amount: entry.amount,
    };
  });
}
