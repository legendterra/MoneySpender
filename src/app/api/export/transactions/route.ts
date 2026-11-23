import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requirePro } from "@/lib/billing";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { todayWIB } from "@/lib/dates";

function matchesWeekday(date: string, weekday: string) {
  if (!weekday || weekday === "all") return true;
  return new Date(`${date}T00:00:00`).getDay().toString() === weekday;
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proCheck = await requirePro(supabase, user.id);
  if (proCheck) return proCheck;

  const limited = await enforceRateLimit(`export:${user.id}`, { limit: 20, windowSeconds: 600 });
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const filterQ = (params.get("q") ?? "").trim().toLowerCase();
  const filterDate = params.get("date") ?? "";
  const filterWeekday = params.get("weekday") ?? "all";
  const filterYear = params.get("year") ?? "";
  // yyyy-MM, used by Laporan "Ekspor <bulan>"; anything else is ignored.
  const filterMonth = /^\d{4}-\d{2}$/.test(params.get("month") ?? "") ? (params.get("month") as string) : "";

  const [txResult, debtResult, profileResult] = await Promise.all([
    supabase.from("transactions").select("id,amount,type,transaction_date,reason,merchant,category_label,wallet_label,created_at").eq("user_id", user.id).order("transaction_date", { ascending: false }),
    supabase.from("debts").select("id,amount,paid_amount,direction,debt_date,source_name,contact_name,reason,category_label,wallet_label,is_paid,created_at").eq("user_id", user.id).order("debt_date", { ascending: false }),
    supabase.from("profiles").select("full_name,currency_code").eq("id", user.id).maybeSingle(),
  ]);

  const userName = (profileResult.data?.full_name ?? user.email ?? "User") as string;
  const exportDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const exportTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

  type Row = {
    no: number;
    jenis: string;
    tanggal: string;
    kategori: string;
    keterangan: string;
    dompet: string;
    nominal: number;
    sudah_dibayar: number;
    sisa: number;
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
    if (!matchesWeekday(d, filterWeekday)) continue;
    if (filterYear && d.slice(0, 4) !== filterYear) continue;
    if (filterMonth && d.slice(0, 7) !== filterMonth) continue;
    const haystack = [t.type, t.category_label, t.reason, t.merchant, t.wallet_label, d].filter(Boolean).join(" ").toLowerCase();
    if (filterQ && !haystack.includes(filterQ)) continue;
    rows.push({ no: no++, jenis: t.type === "income" ? "Pemasukan" : "Pengeluaran", tanggal: d, kategori: (t.category_label as string) ?? "", keterangan: (t.reason as string) ?? "", dompet: (t.wallet_label as string) ?? "", nominal: Number(t.amount ?? 0), sudah_dibayar: 0, sisa: 0, status: "Selesai", kontak: (t.merchant as string) ?? "", platform: "", id: String(t.id) });
  }

  for (const d of debtResult.data ?? []) {
    const dt = d.debt_date as string;
    if (filterDate && dt !== filterDate) continue;
    if (!matchesWeekday(dt, filterWeekday)) continue;
    if (filterYear && dt.slice(0, 4) !== filterYear) continue;
    if (filterMonth && dt.slice(0, 7) !== filterMonth) continue;
    const haystack = [d.direction, d.contact_name, d.reason, d.source_name, d.category_label, dt].filter(Boolean).join(" ").toLowerCase();
    if (filterQ && !haystack.includes(filterQ)) continue;
    const amt = Number(d.amount ?? 0);
    const paid = Math.min(amt, Number(d.paid_amount ?? 0));
    rows.push({ no: no++, jenis: d.direction === "receivable" ? "Piutang" : "Hutang", tanggal: dt, kategori: (d.category_label as string) ?? "Hutang", keterangan: (d.reason as string) ?? "", dompet: (d.wallet_label as string) ?? "", nominal: amt, sudah_dibayar: paid, sisa: Math.max(0, amt - paid), status: d.is_paid ? "Lunas" : "Belum Lunas", kontak: (d.contact_name as string) ?? "", platform: (d.source_name as string) ?? "", id: String(d.id) });
  }

  const totalIncome = rows.filter(r => r.jenis === "Pemasukan").reduce((s, r) => s + r.nominal, 0);
  const totalExpense = rows.filter(r => r.jenis === "Pengeluaran").reduce((s, r) => s + r.nominal, 0);
  const totalHutang = rows.filter(r => r.jenis === "Hutang").reduce((s, r) => s + r.nominal, 0);
  const totalPiutang = rows.filter(r => r.jenis === "Piutang").reduce((s, r) => s + r.nominal, 0);
  const netCashflow = totalIncome - totalExpense;

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MoneySpender";
  workbook.created = new Date();

  // ===== SHEET 1: Ringkasan =====
  const summarySheet = workbook.addWorksheet("Ringkasan", { properties: { tabColor: { argb: "4F46E5" } } });
  summarySheet.columns = [{ width: 30 }, { width: 25 }];
  summarySheet.getRow(1).values = ["💰 MoneySpender — Laporan Keuangan"];
  summarySheet.getRow(1).font = { bold: true, size: 16, color: { argb: "4F46E5" } };
  summarySheet.getRow(2).values = [`Diekspor oleh: ${userName}`];
  summarySheet.getRow(3).values = [`Tanggal export: ${exportDate} pukul ${exportTime} WIB`];
  summarySheet.getRow(4).values = [`Total data: ${rows.length} transaksi`];
  summarySheet.getRow(5).values = [""];
  summarySheet.getRow(6).values = ["RINGKASAN KEUANGAN"];
  summarySheet.getRow(6).font = { bold: true, size: 12, color: { argb: "4F46E5" } };
  summarySheet.getRow(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EEF2FF" } };

  const summaryData = [
    ["Total Pemasukan", totalIncome],
    ["Total Pengeluaran", totalExpense],
    ["Net Cashflow", netCashflow],
    ["Total Hutang", totalHutang],
    ["Total Piutang", totalPiutang],
  ];

  summaryData.forEach((item, idx) => {
    const row = summarySheet.getRow(7 + idx);
    row.values = item;
    row.font = { size: 11 };
    if (item[0] === "Net Cashflow") {
      row.font = { bold: true, size: 12, color: { argb: netCashflow >= 0 ? "059669" : "DC2626" } };
    }
  });

  summarySheet.getRow(12).values = ["© MoneySpender · moneyspender.net"];
  summarySheet.getRow(12).font = { size: 10, color: { argb: "6B7280" }, italic: true };

  // ===== SHEET 2: Detail Transaksi =====
  const detailSheet = workbook.addWorksheet("Detail Transaksi", { properties: { tabColor: { argb: "059669" } } });

  // Styles
  const headerStyle = {
    fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "4F46E5" } },
    font: { bold: true, color: { argb: "FFFFFF" }, size: 11 },
    alignment: { horizontal: "center" as const, vertical: "middle" as const },
    border: { top: { style: "thin" as const }, bottom: { style: "thin" as const }, left: { style: "thin" as const }, right: { style: "thin" as const } },
  };

  const headers = ["No", "Jenis", "Tanggal", "Kategori", "Keterangan", "Dompet", "Nominal", "Sudah Dibayar", "Sisa", "Status", "Kontak / Toko", "Platform / Asal", "ID"];
  const headerRow = detailSheet.addRow(headers);
  headerRow.eachCell(cell => { cell.style = headerStyle; });
  headerRow.height = 25;

  // Data rows
  rows.forEach((r, idx) => {
    const dataRow = detailSheet.addRow([r.no, r.jenis, r.tanggal, r.kategori, r.keterangan, r.dompet, r.nominal, r.sudah_dibayar, r.sisa, r.status, r.kontak, r.platform, r.id]);
    dataRow.height = 20;

    // Alternating row color
    const bgColor = idx % 2 === 0 ? "FFFFFF" : "F9FAFB";
    dataRow.eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.border = { bottom: { style: "thin", color: { argb: "E5E7EB" } } };
    });

    // Jenis color
    const jenisCell = dataRow.getCell(2);
    if (r.jenis === "Pemasukan") jenisCell.font = { color: { argb: "059669" }, bold: true };
    else if (r.jenis === "Pengeluaran") jenisCell.font = { color: { argb: "DC2626" }, bold: true };
    else if (r.jenis === "Hutang") jenisCell.font = { color: { argb: "D97706" }, bold: true };
    else jenisCell.font = { color: { argb: "2563EB" }, bold: true };

    // Nominal format
    const nominalCell = dataRow.getCell(7);
    nominalCell.numFmt = '#,##0';
    nominalCell.alignment = { horizontal: "right" };

    const dibayarCell = dataRow.getCell(8);
    dibayarCell.numFmt = '#,##0';
    dibayarCell.alignment = { horizontal: "right" };

    const sisaCell = dataRow.getCell(9);
    sisaCell.numFmt = '#,##0';
    sisaCell.alignment = { horizontal: "right" };
  });

  // Column widths
  detailSheet.columns = [
    { width: 5 }, { width: 12 }, { width: 12 }, { width: 18 }, { width: 25 }, { width: 12 },
    { width: 15 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 18 }, { width: 15 }, { width: 36 },
  ];

  // Freeze header row
  detailSheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  // ===== SHEET 3: Pie Chart Data =====
  if (rows.length > 0) {
    const chartSheet = workbook.addWorksheet("Statistik", { properties: { tabColor: { argb: "F59E0B" } } });
    chartSheet.getRow(1).values = ["Statistik berdasarkan Jenis"];
    chartSheet.getRow(1).font = { bold: true, size: 14, color: { argb: "4F46E5" } };

    const incomeCount = rows.filter(r => r.jenis === "Pemasukan").length;
    const expenseCount = rows.filter(r => r.jenis === "Pengeluaran").length;
    const hutangCount = rows.filter(r => r.jenis === "Hutang").length;
    const piutangCount = rows.filter(r => r.jenis === "Piutang").length;

    chartSheet.getRow(3).values = ["Jenis", "Jumlah", "Total Nominal"];
    chartSheet.getRow(3).font = { bold: true, color: { argb: "FFFFFF" } };
    chartSheet.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4F46E5" } };
    chartSheet.getRow(4).values = ["Pemasukan", incomeCount, totalIncome];
    chartSheet.getRow(5).values = ["Pengeluaran", expenseCount, totalExpense];
    chartSheet.getRow(6).values = ["Hutang", hutangCount, totalHutang];
    chartSheet.getRow(7).values = ["Piutang", piutangCount, totalPiutang];
    chartSheet.columns = [{ width: 15 }, { width: 12 }, { width: 20 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `MoneySpender_Export_${todayWIB()}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
