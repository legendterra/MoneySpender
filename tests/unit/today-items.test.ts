import { describe, expect, it } from "vitest";

import { toTodayItems } from "@/components/beranda/map-today";
import { buildHistoryEntries } from "@/lib/history";

const t = (key: string, values?: Record<string, string | number>) =>
  `${key}${values ? `(${Object.values(values).join(",")})` : ""}`;

describe("toTodayItems", () => {
  it("maps today's Riwayat entries to Beranda rows, payments included", () => {
    const entries = buildHistoryEntries({
      transactions: [
        { id: "a", amount: 33000, type: "expense", category_id: "c1", transaction_date: "2026-11-20", reason: "Makan siang", merchant: null, category_label: "Makan", wallet_id: "w2", wallet_label: "GoPay", created_at: "2026-11-20T05:00:00Z" },
        { id: "b", amount: 5000, type: "expense", category_id: null, transaction_date: "2026-11-20", reason: null, merchant: null, category_label: "Parkir", wallet_id: "w3", wallet_label: "Tunai", created_at: "2026-11-20T04:00:00Z" },
        { id: "e", amount: 10000, type: "income", category_id: null, transaction_date: "2026-11-20", reason: null, merchant: null, category_label: null, wallet_id: null, wallet_label: null, created_at: "2026-11-20T00:00:00Z" },
      ],
      transfers: [{ id: "c", from_wallet_id: "w1", to_wallet_id: "w2", amount: 100000, transfer_date: "2026-11-20", note: null, created_at: "2026-11-20T03:00:00Z" }],
      debts: [
        { id: "d", amount: 200000, paid_amount: 0, remaining_amount: 200000, debt_date: "2026-11-20", contact_name: "Budi", source_name: "", reason: "", direction: "payable", wallet_id: "w1", wallet_label: "BCA", category_label: "Hutang", is_paid: false, paid_at: null, created_at: "2026-11-20T02:00:00Z" },
      ],
      payments: [{ id: "p", debt_id: "d", amount: 50000, paid_date: "2026-11-20", note: null, wallet_id: null, wallet_label: null, created_at: "2026-11-20T01:00:00Z" }],
      walletNames: new Map([["w1", "BCA"], ["w2", "GoPay"], ["w3", "Tunai"]]),
    });
    const items = toTodayItems(entries, t);
    expect(items.map((item) => item.id)).toEqual(["tx:a", "tx:b", "tf:c", "db:d", "dp:p", "tx:e"]);
    expect(items[0]).toMatchObject({ kind: "expense", title: "Makan siang", subtitle: "Makan · GoPay", flow: "out" });
    expect(items[1]).toMatchObject({ title: "Parkir", subtitle: "Tunai" });
    expect(items[2]).toMatchObject({ kind: "transfer", title: "rows.transfer(BCA,GoPay)", flow: "move" });
    expect(items[3]).toMatchObject({ kind: "debt", title: "rows.debtPayable(Budi)", subtitle: "BCA", flow: "in" });
    expect(items[4]).toMatchObject({ kind: "debt", title: "rows.paymentPayable(Budi)", flow: "out", amount: 50000 });
    expect(items[5]).toMatchObject({ kind: "income", title: "rows.noCategory", subtitle: "", flow: "in" });
  });
});
