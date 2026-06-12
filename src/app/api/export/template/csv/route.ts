import { NextResponse } from "next/server";

export async function GET() {
  const headers = ["Jenis", "Tanggal", "Kategori", "Keterangan", "Dompet", "Nominal", "Sudah Dibayar", "Status", "Kontak / Toko", "Platform / Asal"];

  const examples = [
    ["Pemasukan", "2025-06-01", "Gaji", "Gaji bulan Juni", "Mandiri", "8500000", "", "Selesai", "", "Transfer Bank"],
    ["Pengeluaran", "2025-06-03", "Makan & Minum", "Makan siang warung nasi", "GoPay", "35000", "", "Selesai", "Warung Bu Siti", "GoPay"],
    ["Pengeluaran", "2025-06-05", "Transportasi", "Isi bensin motor", "Tunai", "50000", "", "Selesai", "SPBU", "Tunai"],
    ["Hutang", "2025-06-07", "Hutang Pribadi", "Pinjam buat beli HP", "BCA", "2000000", "500000", "Belum Lunas", "Budi", "Transfer BCA"],
    ["Piutang", "2025-06-08", "Piutang", "Kasih pinjam ke Cici", "GoPay", "300000", "0", "Belum Lunas", "Cici", "GoPay"],
    ["Pemasukan", "2025-06-10", "Freelance / Proyek", "Invoice klien X", "BCA", "3500000", "", "Selesai", "PT ABC", "Transfer BCA"],
    ["Pengeluaran", "2025-06-12", "Tagihan", "Tagihan PLN", "Mandiri", "185000", "", "Selesai", "PLN", "Transfer Bank"],
    ["", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", ""],
  ];

  function escape(val: string) {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  const rows = [headers, ...examples].map((row) => row.map(escape).join(",")).join("\r\n");

  return new NextResponse(rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="MoneySpender_Template_Import.csv"`,
    },
  });
}