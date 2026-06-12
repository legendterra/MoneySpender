import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MoneySpender";
  workbook.created = new Date();

  // Color palette — elegant dark charcoal & teal
  const C = {
    headerBg: "1E293B",   // dark slate
    headerText: "FFFFFF",
    primary: "1E293B",     // dark slate
    accent: "0F766E",     // teal
    rowAlt: "F8FAFC",     // subtle alt row
    rowWhite: "FFFFFF",
    border: "CBD5E1",
    muted: "64748B",
    income: "059669",     // green
    expense: "DC2626",     // red
    debt: "D97706",       // amber
    receivable: "2563EB", // blue
  };

  // ===== SHEET 1: Template Import =====
  const templateSheet = workbook.addWorksheet("Template Import", {
    properties: { tabColor: { argb: C.accent } },
  });

  // Title
  templateSheet.getRow(1).values = ["MoneySpender — Template Import Transaksi"];
  templateSheet.getRow(1).font = { bold: true, size: 16, color: { argb: C.primary } };
  templateSheet.getRow(2).values = ["Hapus contoh data di bawah, isi dengan data kamu, lalu simpan."];
  templateSheet.getRow(2).font = { size: 10, color: { argb: C.muted }, italic: true };
  templateSheet.getRow(3).values = [""];
  templateSheet.getRow(4).values = [
    "Jenis", "Tanggal", "Kategori", "Keterangan", "Dompet",
    "Nominal", "Sudah Dibayar", "Status", "Kontak / Toko", "Platform / Asal",
  ];
  templateSheet.getRow(4).font = { bold: true, size: 11, color: { argb: C.headerText } };
  templateSheet.getRow(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.headerBg } };
  templateSheet.getRow(4).alignment = { horizontal: "center", vertical: "middle" };
  templateSheet.getRow(4).height = 28;

  // Example data
  const examples = [
    ["Pemasukan", "2025-06-01", "Gaji", "Gaji bulan Juni", "Mandiri", 8500000, "", "Selesai", "", "Transfer Bank"],
    ["Pengeluaran", "2025-06-03", "Makan & Minum", "Makan siang warung nasi", "GoPay", 35000, "", "Selesai", "Warung Bu Siti", "GoPay"],
    ["Pengeluaran", "2025-06-05", "Transportasi", "Isi bensin motor", "Tunai", 50000, "", "Selesai", "SPBU", "Tunai"],
    ["Hutang", "2025-06-07", "Hutang Pribadi", "Pinjam buat beli HP", "BCA", 2000000, 500000, "Belum Lunas", "Budi", "Transfer BCA"],
    ["Piutang", "2025-06-08", "Piutang", "Kasih pinjam ke Cici", "GoPay", 300000, 0, "Belum Lunas", "Cici", "GoPay"],
    ["Pemasukan", "2025-06-10", "Freelance / Proyek", "Invoice klien X", "BCA", 3500000, "", "Selesai", "PT ABC", "Transfer BCA"],
    ["Pengeluaran", "2025-06-12", "Tagihan", "Tagihan PLN", "Mandiri", 185000, "", "Selesai", "PLN", "Transfer Bank"],
  ];

  examples.forEach((row, idx) => {
    const dataRow = templateSheet.addRow(row);
    dataRow.height = 20;
    const bg = idx % 2 === 0 ? C.rowWhite : C.rowAlt;
    dataRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.border = { bottom: { style: "thin", color: { argb: C.border } } };
    });

    const jenisCell = dataRow.getCell(1);
    if (row[0] === "Pemasukan") jenisCell.font = { color: { argb: C.income }, bold: true };
    else if (row[0] === "Pengeluaran") jenisCell.font = { color: { argb: C.expense }, bold: true };
    else if (row[0] === "Hutang") jenisCell.font = { color: { argb: C.debt }, bold: true };
    else jenisCell.font = { color: { argb: C.receivable }, bold: true };

    const nominalCell = dataRow.getCell(6);
    nominalCell.numFmt = "#,##0";
    nominalCell.alignment = { horizontal: "right" };

    const dibayarCell = dataRow.getCell(7);
    dibayarCell.numFmt = "#,##0";
    dibayarCell.alignment = { horizontal: "right" };
  });

  // Empty rows for user to fill
  for (let i = 0; i < 12; i++) {
    const emptyRow = templateSheet.addRow(["", "", "", "", "", "", "", "", "", ""]);
    emptyRow.height = 20;
    emptyRow.eachCell((cell) => {
      cell.border = { bottom: { style: "dashed", color: { argb: C.border } } };
    });
  }

  templateSheet.columns = [
    { width: 14 }, { width: 12 }, { width: 22 }, { width: 30 }, { width: 12 },
    { width: 15 }, { width: 15 }, { width: 12 }, { width: 18 }, { width: 15 },
  ];

  // ===== SHEET 2: Panduan =====
  const guideSheet = workbook.addWorksheet("Panduan", {
    properties: { tabColor: { argb: C.accent } },
  });

  guideSheet.getRow(1).values = ["Panduan Pengisian Template"];
  guideSheet.getRow(1).font = { bold: true, size: 16, color: { argb: C.primary } };
  guideSheet.getRow(2).values = ["Ikuti panduan di bawah ini untuk memastikan data ter-import dengan benar."];
  guideSheet.getRow(2).font = { size: 10, color: { argb: C.muted }, italic: true };
  guideSheet.getRow(3).values = [""];
  guideSheet.getRow(4).values = ["Kolom", "Keterangan", "Contoh"];
  guideSheet.getRow(4).font = { bold: true, size: 11, color: { argb: C.headerText } };
  guideSheet.getRow(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.headerBg } };
  guideSheet.getRow(4).alignment = { horizontal: "center", vertical: "middle" };
  guideSheet.getRow(4).height = 26;

  const guides = [
    ["Jenis", "Isi salah satu: Pemasukan / Pengeluaran / Hutang / Piutang", "Pemasukan"],
    ["Tanggal", "Format: YYYY-MM-DD atau DD/MM/YYYY", "2025-06-15 atau 15/06/2025"],
    ["Kategori", "Bebas, sesuaikan dengan kategori kamu", "Makan & Minum"],
    ["Keterangan", "Catatan deskripsi transaksi", "Makan siang di kantin"],
    ["Dompet", "Nama dompet: BCA, Mandiri, GoPay, Tunai, dll", "Mandiri"],
    ["Nominal", "Angka saja tanpa titik ribuan", "150000"],
    ["Sudah Dibayar", "Hanya untuk Hutang/Piutang", "500000"],
    ["Status", "Selesai (transaksi) / Lunas / Belum Lunas (hutang)", "Selesai"],
    ["Kontak / Toko", "Nama toko, vendor, atau kontak", "Warung Bu Siti"],
    ["Platform / Asal", "Platform pembayaran atau asal transaksi", "GoPay"],
  ];

  guides.forEach((row, idx) => {
    const guideRow = guideSheet.addRow(row);
    const bg = idx % 2 === 0 ? C.rowWhite : C.rowAlt;
    guideRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.border = { bottom: { style: "thin", color: { argb: C.border } } };
    });
  });

  guideSheet.getRow(16).values = [""];
  guideSheet.getRow(17).values = ["Tips:"];
  guideSheet.getRow(17).font = { bold: true, size: 11, color: { argb: C.accent } };
  guideSheet.getRow(18).values = ["• Hapus contoh data sebelum import"];
  guideSheet.getRow(19).values = ["• Kolom yang kosong akan diisi otomatis dengan nilai default"];
  guideSheet.getRow(20).values = ["• Untuk Hutang/Piutang, isi kolom 'Sudah Dibayar' dan 'Status'"];
  guideSheet.getRow(21).values = ["• Export dari MoneySpender bisa langsung di-import ulang tanpa edit"];

  guideSheet.columns = [{ width: 18 }, { width: 52 }, { width: 35 }];

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="MoneySpender_Template_Import.xlsx"`,
    },
  });
}