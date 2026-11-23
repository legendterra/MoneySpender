import { describe, expect, it } from "vitest";

import { toTodayItems } from "@/components/beranda/map-today";

const t = (key: string, values?: Record<string, string | number>) =>
  `${key}${values ? `(${Object.values(values).join(",")})` : ""}`;

describe("toTodayItems", () => {
  it("maps expenses, transfers and debts to display rows", () => {
    const items = toTodayItems(
      [
        { id: "a", kind: "expense", amount: 33000, title: "Makan siang", categoryLabel: "Makan", walletLabel: "GoPay" },
        { id: "b", kind: "expense", amount: 5000, title: "", categoryLabel: "Parkir", walletLabel: "Tunai" },
        { id: "c", kind: "transfer", amount: 100000, title: "", categoryLabel: null, walletLabel: null, fromWallet: "BCA", toWallet: "GoPay" },
        { id: "d", kind: "debt", amount: 200000, title: "", categoryLabel: "Hutang", walletLabel: "BCA", debtDirection: "payable", contactName: "Budi" },
        { id: "e", kind: "income", amount: 10000, title: "", categoryLabel: null, walletLabel: null },
      ],
      t,
    );
    expect(items[0]).toMatchObject({ title: "Makan siang", subtitle: "Makan · GoPay", flow: "out" });
    expect(items[1]).toMatchObject({ title: "Parkir", subtitle: "Tunai" });
    expect(items[2]).toMatchObject({ title: "transferTitle(BCA,GoPay)", flow: "move" });
    expect(items[3]).toMatchObject({ title: "debtPayableTitle(Budi)", subtitle: "Hutang · BCA", flow: "in" });
    expect(items[4]).toMatchObject({ title: "noCategory", subtitle: "", flow: "in" });
  });
});
