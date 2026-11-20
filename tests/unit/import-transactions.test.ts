import { describe, expect, it } from "vitest";

import { parseCsvImportRows, parseImportRows } from "@/lib/import-transactions";

function parseCsv(text: string) {
  return parseImportRows(parseCsvImportRows(text));
}

describe("parseImportRows", () => {
  it("parses income and expense rows from an Indonesian CSV", () => {
    const parsed = parseCsv(
      [
        "Jenis,Tanggal,Nominal,Kategori,Keterangan,Dompet",
        "Pemasukan,2026-07-01,5000000,Gaji,Gaji bulanan,Bank",
        "Pengeluaran,02/07/2026,\"Rp 150.000\",Makan & Minum,Makan siang,Cash",
      ].join("\n"),
    );

    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.skipped).toHaveLength(0);

    const [income, expense] = parsed.transactions;
    expect(income.type).toBe("income");
    expect(income.amount).toBe(5_000_000);
    expect(income.transaction_date).toBe("2026-07-01");

    expect(expense.type).toBe("expense");
    expect(expense.amount).toBe(150_000);
    expect(expense.transaction_date).toBe("2026-07-02");
    expect(expense.category_label).toBe("Makan & Minum");
  });

  it("supports semicolon-delimited CSV", () => {
    const parsed = parseCsv(
      ["Jenis;Tanggal;Nominal", "Pemasukan;2026-07-01;1000"].join("\n"),
    );
    expect(parsed.transactions).toHaveLength(1);
    expect(parsed.transactions[0].amount).toBe(1000);
  });

  it("parses Indonesian and English decimal formats", () => {
    const parsed = parseCsv(
      [
        "Jenis,Tanggal,Nominal",
        "Pemasukan,2026-07-01,\"1.234,56\"",
        "Pemasukan,2026-07-01,\"1,234.56\"",
      ].join("\n"),
    );
    expect(parsed.transactions.map((t) => t.amount)).toEqual([1234.56, 1234.56]);
  });

  it("skips rows with unknown kind or invalid date/amount, with reasons", () => {
    const parsed = parseCsv(
      [
        "Jenis,Tanggal,Nominal",
        "Transferan,2026-07-01,1000",
        "Pemasukan,31/31/2026,1000",
        "Pemasukan,2026-07-01,0",
      ].join("\n"),
    );
    expect(parsed.transactions).toHaveLength(0);
    expect(parsed.skipped).toHaveLength(3);
    expect(parsed.skipped[0].reason).toContain("Jenis tidak dikenal");
    expect(parsed.skipped[1].reason).toContain("Tanggal tidak valid");
    expect(parsed.skipped[2].reason).toContain("Nominal tidak valid");
  });

  it("parses debt rows with direction and paid status", () => {
    const parsed = parseCsv(
      [
        "Jenis,Tanggal,Nominal,Status,Kontak/Toko",
        "Hutang,2026-07-01,200000,Belum lunas,Budi",
        "Piutang,2026-07-01,50000,Lunas,Sari",
      ].join("\n"),
    );

    expect(parsed.debts).toHaveLength(2);

    const [payable, receivable] = parsed.debts;
    expect(payable.direction).toBe("payable");
    expect(payable.is_paid).toBe(false);
    expect(payable.contact_name).toBe("Budi");

    expect(receivable.direction).toBe("receivable");
    expect(receivable.is_paid).toBe(true);
    expect(receivable.paid_amount).toBe(50_000);
  });

  it("throws when the header row is missing", () => {
    expect(() => parseCsv("kolom1,kolom2\nfoo,bar")).toThrow(/Header/);
  });

  it("maps debt rows without categories: the label is always Hutang / Piutang", () => {
    const parsed = parseCsv(
      [
        "Jenis,Tanggal,Nominal,Kategori",
        "Hutang,2026-07-01,200000,Pinjol",
        "Piutang,2026-07-02,50000,Lainnya",
      ].join("\n"),
    );
    expect(parsed.debts.map((d) => d.category_label)).toEqual(["Hutang", "Piutang"]);
  });
});
