import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const filterQ    = (params.get("q") ?? "").trim().toLowerCase();
  const filterDate = params.get("date") ?? "";
  const filterYear = params.get("year") ?? "";

  const [txResult, debtResult, profileResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("id,amount,type,transaction_date,reason,merchant,category_label,wallet_label,created_at")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false }),
    supabase
      .from("debts")
      .select("id,amount,paid_amount,direction,debt_date,source_name,contact_name,reason,category_label,wallet_label,is_paid,created_at")
      .eq("user_id", user.id)
      .order("debt_date", { ascending: false }),
    supabase
      .from("profiles")
      .select("full_name,currency_code")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const currency    = (profileResult.data?.currency_code ?? "IDR") as string;
  const userName    = (profileResult.data?.full_name ?? user.email ?? "User") as string;
  const exportDate  = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const exportTime  = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

  // Build rows
  type Row = {
    no: number;
    jenis: string;
    tanggal: string;
    kategori: string;
    keterangan: string;
    dompet: string;
    nominal: number;
    nominal_fmt: string;
    sudah_dibayar: string;
    sisa: string;
    status: string;
    kontak: string;
    platform: string;
    id: string;
  };

  const rows: Row[] = [];
  let no = 1;

  for (const t of txResult.data ?? []) {
    const d = t.transaction_date as string;
    if (filterDate && d !== filterDate) continue;
    if (filterYear && d.slice(0, 4) !== filterYear) continue;
    const haystack = [t.type, t.category_label, t.reason, t.merchant, t.wallet_label, d]
      .filter(Boolean).join(" ").toLowerCase();
    if (filterQ && !haystack.includes(filterQ)) continue;

    const amt = Number(t.amount ?? 0);
    rows.push({
      no: no++,
      jenis: t.type === "income" ? "Pemasukan" : "Pengeluaran",
      tanggal: d,
      kategori: (t.category_label as string) ?? "",
      keterangan: (t.reason as string) ?? "",
      dompet: (t.wallet_label as string) ?? "",
      nominal: amt,
      nominal_fmt: formatRupiah(amt),
      sudah_dibayar: "",
      sisa: "",
      status: "Selesai",
      kontak: (t.merchant as string) ?? "",
      platform: "",
      id: String(t.id),
    });
  }

  for (const d of debtResult.data ?? []) {
    const dt = d.debt_date as string;
    if (filterDate && dt !== filterDate) continue;
    if (filterYear && dt.slice(0, 4) !== filterYear) continue;
    const haystack = [d.direction, d.contact_name, d.reason, d.source_name, d.category_label, dt]
      .filter(Boolean).join(" ").toLowerCase();
    if (filterQ && !haystack.includes(filterQ)) continue;

    const amt  = Number(d.amount ?? 0);
    const paid = Math.min(amt, Number(d.paid_amount ?? 0));
    const sisa = Math.max(0, amt - paid);
    rows.push({
      no: no++,
      jenis: d.direction === "receivable" ? "Piutang" : "Hutang",
      tanggal: dt,
      kategori: (d.category_label as string) ?? "Hutang",
      keterangan: (d.reason as string) ?? "",
      dompet: (d.wallet_label as string) ?? "",
      nominal: amt,
      nominal_fmt: formatRupiah(amt),
      sudah_dibayar: formatRupiah(paid),
      sisa: formatRupiah(sisa),
      status: d.is_paid ? "Lunas" : "Belum Lunas",
      kontak: (d.contact_name as string) ?? "",
      platform: (d.source_name as string) ?? "",
      id: String(d.id),
    });
  }

  // Summary stats
  const totalIncome   = rows.filter(r => r.jenis === "Pemasukan").reduce((s, r) => s + r.nominal, 0);
  const totalExpense  = rows.filter(r => r.jenis === "Pengeluaran").reduce((s, r) => s + r.nominal, 0);
  const totalHutang   = rows.filter(r => r.jenis === "Hutang").reduce((s, r) => s + r.nominal, 0);
  const totalPiutang  = rows.filter(r => r.jenis === "Piutang").reduce((s, r) => s + r.nominal, 0);
  const netCashflow   = totalIncome - totalExpense;

  // ── Build CSV ─────────────────────────────────────────────
  const lines: string[] = [];

  // Header block
  lines.push(`${csvEscape("MoneySpender — Laporan Keuangan")},,,,,,,,,,,,,`);
  lines.push(`${csvEscape(`Diekspor oleh: ${userName}`)},,,,,,,,,,,,,`);
  lines.push(`${csvEscape(`Tanggal export: ${exportDate} pukul ${exportTime} WIB`)},,,,,,,,,,,,,`);
  lines.push(`${csvEscape(`Total data: ${rows.length} transaksi`)},,,,,,,,,,,,,`);
  lines.push(",,,,,,,,,,,,,"); // spacer

  // Summary block
  lines.push(`${csvEscape("RINGKASAN")},,,,,,,,,,,,,`);
  lines.push(`${csvEscape("Total Pemasukan")},${csvEscape(formatRupiah(totalIncome))},,,,,,,,,,,,,`);
  lines.push(`${csvEscape("Total Pengeluaran")},${csvEscape(formatRupiah(totalExpense))},,,,,,,,,,,,,`);
  lines.push(`${csvEscape("Net Cashflow")},${csvEscape(formatRupiah(netCashflow))},,,,,,,,,,,,,`);
  lines.push(`${csvEscape("Total Hutang")},${csvEscape(formatRupiah(totalHutang))},,,,,,,,,,,,,`);
  lines.push(`${csvEscape("Total Piutang")},${csvEscape(formatRupiah(totalPiutang))},,,,,,,,,,,,,`);
  lines.push(",,,,,,,,,,,,,"); // spacer

  // Column headers
  const headers = [
    "No", "Jenis", "Tanggal", "Kategori", "Keterangan",
    "Dompet", "Nominal", "Sudah Dibayar", "Sisa",
    "Status", "Kontak / Toko", "Platform / Asal", "ID",
  ];
  lines.push(headers.map(csvEscape).join(","));

  // Data rows
  for (const r of rows) {
    lines.push([
      r.no, r.jenis, r.tanggal, r.kategori, r.keterangan,
      r.dompet, r.nominal_fmt, r.sudah_dibayar, r.sisa,
      r.status, r.kontak, r.platform, r.id,
    ].map(csvEscape).join(","));
  }

  // Footer
  lines.push(",,,,,,,,,,,,,");
  lines.push(`${csvEscape("© MoneySpender · moneyspender.net")},,,,,,,,,,,,,`);

  const filename = `MoneySpender_Export_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(
    "\uFEFF" + lines.join("\r\n"), // BOM for Excel UTF-8
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    },
  );
}
