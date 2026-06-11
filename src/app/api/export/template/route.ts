import { NextResponse } from "next/server";

export async function GET() {
  const headers = [
    "Jenis", "Tanggal", "Kategori", "Keterangan",
    "Dompet", "Nominal", "Sudah Dibayar", "Status",
    "Kontak / Toko", "Platform / Asal",
  ];

  const examples = [
    ["Pemasukan",  "2025-06-01", "Gaji",           "Gaji bulan Juni",        "Mandiri",  "8500000", "",        "Selesai",     "",         "Transfer Bank"],
    ["Pengeluaran","2025-06-03", "Makan & Minum",  "Makan siang warung nasi","GoPay",    "35000",   "",        "Selesai",     "Warung Bu Siti", "GoPay"],
    ["Pengeluaran","2025-06-05", "Bensin",         "Isi bensin motor",       "Tunai",    "50000",   "",        "Selesai",     "SPBU",     "Tunai"],
    ["Hutang",     "2025-06-07", "Hutang Pribadi", "Pinjam buat beli HP",    "BCA",      "2000000", "500000",  "Belum Lunas", "Budi",     "Transfer BCA"],
    ["Piutang",    "2025-06-08", "Piutang",        "Kasih pinjam ke Cici",   "GoPay",    "300000",  "0",       "Belum Lunas", "Cici",     "GoPay"],
    ["Pemasukan",  "2025-06-10", "Freelance / Proyek", "Invoice klien X",   "BCA",      "3500000", "",        "Selesai",     "PT ABC",   "Transfer BCA"],
    ["Pengeluaran","2025-06-12", "Listrik & Air",  "Tagihan PLN",           "Mandiri",  "185000",  "",        "Selesai",     "PLN",      "Transfer Bank"],
  ];

  // Notes section
  const notes = [
    [""],
    ["PANDUAN PENGISIAN"],
    ["Kolom Jenis", "Isi salah satu: Pemasukan / Pengeluaran / Hutang / Piutang"],
    ["Kolom Tanggal", "Format: YYYY-MM-DD (contoh: 2025-06-15) atau DD/MM/YYYY"],
    ["Kolom Nominal", "Angka saja tanpa titik ribuan (contoh: 150000 bukan 150.000)"],
    ["Kolom Sudah Dibayar", "Hanya untuk Hutang/Piutang, isi nominal yang sudah dibayar"],
    ["Kolom Status", "Lunas atau Belum Lunas (untuk Hutang/Piutang)"],
    ["Kolom Dompet", "Nama dompet kamu: BCA, Mandiri, GoPay, Tunai, dll"],
    ["Kolom Kategori", "Bebas diisi sesuai kategori kamu"],
  ];

  function esc(v: unknown) { return `"${String(v ?? "").replaceAll('"', '""')}"`; }

  const lines: string[] = [
    // Title block
    `"MoneySpender — Template Import CSV"`,
    `"Hapus baris panduan ini sebelum import. Hanya sisakan baris header dan data."`,
    `""`,
    headers.map(esc).join(","),
    ...examples.map(row => row.map(esc).join(",")),
    ...notes.map(row => row.map(esc).join(",")),
  ];

  return new NextResponse(
    "\uFEFF" + lines.join("\r\n"),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="MoneySpender_Template_Import.csv"`,
      },
    },
  );
}
