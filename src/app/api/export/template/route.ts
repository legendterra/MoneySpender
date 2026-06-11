import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MoneySpender";
  workbook.created = new Date();

  // ===== SHEET 1: Template =====
  const templateSheet = workbook.addWorksheet("Template Import", { properties: { tabColor: { argb: "4F46E5" } } });

  // Title
  templateSheet.getRow(1).values = ["MoneySpender — Template Import Transaksi"];
  templateSheet.getRow(1).font = { bold: true, size: 16, color: { argb: "4F46E5" } };
  templateSheet.getRow(2).values = ["Hapus contoh data di bawah, isi dengan data kamu, lalu simpan."];
  templateSheet.getRow(2).font = { size: 10, color: { argb: "6B7280" }, italic: true };
  templateSheet.getRow(3).values = [""];

  // Header row
  const headers = ["Jenis", "Tanggal", "Kategori", "Keterangan", "Dompet", "Nominal", "Sudah Dibayar", "Status", "Kontak / Toko", "Platform / Asal"];
  const headerRow = templateSheet.addRow(headers);
  headerRow.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4F46E5" } };
    cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  headerRow.height = 25;

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

    // Light purple background for examples
    dataRow.eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F3F4F6" } };
      cell.border = { bottom: { style: "thin", color: { argb: "E5E7EB" } } };
    });

    // Jenis color
    const jenisCell = dataRow.getCell(1);
    if (row[0] === "Pemasukan") jenisCell.font = { color: { argb: "059669" }, bold: true };
    else if (row[0] === "Pengeluaran") jenisCell.font = { color: { argb: "DC2626" }, bold: true };
    else if (row[0] === "Hutang") jenisCell.font = { color: { argb: "D97706" }, bold: true };
    else jenisCell.font = { color: { argb: "2563EB" }, bold: true };

    // Nominal format
    const nominalCell = dataRow.getCell(6);
    nominalCell.numFmt = '#,##0';
    nominalCell.alignment = { horizontal: "right" };

    const dibayarCell = dataRow.getCell(7);
    dibayarCell.numFmt = '#,##0';
    dibayarCell.alignment = { horizontal: "right" };
  });

  // Empty rows for user to fill (with light border hint)
  for (let i = 0; i < 10; i++) {
    const emptyRow = templateSheet.addRow(["", "", "", "", "", "", "", "", "", ""]);
    emptyRow.height = 20;
    emptyRow.eachCell(cell => {
      cell.border = { bottom: { style: "thin", color: { argb: "E5E7EB" }, style: "dashed" } };
    });
  }

  // Column widths
  templateSheet.columns = [
    { width: 14 }, { width: 12 }, { width: 20 }, { width: 30 }, { width: 12 },
    { width: 15 }, { width: 15 }, { width: 12 }, { width: 18 }, { width: 15 },
  ];

  // ===== SHEET 2: Panduan =====
  const guideSheet = workbook.addWorksheet("Panduan", { properties: { tabColor: { argb: "059669" } } });

  guideSheet.getRow(1).values = ["📖 Panduan Pengisian Template"];
  guideSheet.getRow(1).font = { bold: true, size: 16, color: { argb: "4F46E5" } };
  guideSheet.getRow(2).values = ["Ikuti panduan di bawah ini untuk memastikan data ter-import dengan benar."];
  guideSheet.getRow(2).font = { size: 10, color: { argb: "6B7280" }, italic: true };
  guideSheet.getRow(3).values = [""];

  const guides = [
    ["Kolom", "Keterangan", "Contoh"],
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
    if (idx === 0) {
      guideRow.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4F46E5" } };
        cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
        cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      });
    } else {
      guideRow.eachCell(cell => {
        cell.border = { bottom: { style: "thin", color: { argb: "E5E7EB" } } };
      });
      if (idx % 2 === 0) {
        guideRow.eachCell(cell => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } };
        });
      }
    }
  });

  guideSheet.getRow(16).values = [""];
  guideSheet.getRow(17).values = ["💡 Tips:"];
  guideSheet.getRow(17).font = { bold: true, color: { argb: "4F46E5" } };
  guideSheet.getRow(18).values = ["• Hapus contoh data sebelum import"];
  guideSheet.getRow(19).values = ["• Kolom yang kosong akan diisi otomatis dengan nilai default"];
  guideSheet.getRow(20).values = ["• Untuk Hutang/Piutang, isi kolom 'Sudah Dibayar' dan 'Status'"];
  guideSheet.getRow(21).values = ["• Export dari MoneySpender bisa langsung di-import ulang tanpa edit"];

  guideSheet.columns = [{ width: 18 }, { width: 50 }, { width: 35 }];

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="MoneySpender_Template_Import.xlsx"`,
    },
  });
}
