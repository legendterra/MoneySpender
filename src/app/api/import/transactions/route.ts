import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ExcelJS from "exceljs";

// CSV parser (for .csv files)
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && quoted && next === '"') { current += '"'; i++; }
    else if (ch === '"') { quoted = !quoted; }
    else if (ch === ',' && !quoted) { values.push(current); current = ""; }
    else { current += ch; }
  }
  values.push(current);
  return values.map(v => v.trim());
}

function parseAmount(raw: string): number {
  return Number(raw.replace(/[Rp\s.]/g, "").replace(",", ".")) || 0;
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const dmY = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmY) return `${dmY[3]}-${dmY[2].padStart(2,"0")}-${dmY[1].padStart(2,"0")}`;
  const mdY = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdY) return `${mdY[3]}-${mdY[1].padStart(2,"0")}-${mdY[2].padStart(2,"0")}`;
  return null;
}

function normalizeKind(raw: string): "income" | "expense" | "debt" | null {
  const v = raw.toLowerCase().trim();
  if (["pemasukan","income","masuk","in"].includes(v)) return "income";
  if (["pengeluaran","expense","keluar","out","belanja"].includes(v)) return "expense";
  if (["hutang","debt","payable","utang","pinjam"].includes(v)) return "debt";
  if (["piutang","receivable","tagih"].includes(v)) return "debt";
  return null;
}

function parseXlsxRow(ws: ExcelJS.Worksheet, rowIdx: number, headers: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  headers.forEach((h, i) => {
    const cell = ws.getRow(rowIdx).getCell(i + 1);
    row[h] = String(cell.value ?? "").trim();
  });
  return row;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File belum dipilih." }, { status: 400 });

  const fileName = file.name.toLowerCase();
  const isXlsx = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
  const isCsv = fileName.endsWith(".csv") || file.type === "text/csv";

  if (!isXlsx && !isCsv) return NextResponse.json({ error: "Hanya file .csv atau .xlsx yang diterima." }, { status: 400 });

  const txInserts: object[] = [];
  const debtInserts: object[] = [];
  const skipped: { line: number; reason: string }[] = [];

  const get = (row: Record<string,string>, ...keys: string[]) => {
    for (const k of keys) {
      const val = row[k] ?? row[keys[0]];
      if (val !== undefined && val !== "") return val;
    }
    return "";
  };

  if (isCsv) {
    const text = await file.text();
    const clean = text.replace(/^﻿/, "");
    const lines = clean.split(/\r?\n/).filter(Boolean);

    if (lines.length < 2) return NextResponse.json({ error: "File kosong atau hanya header." }, { status: 400 });

    let headerIdx = 0;
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const lower = lines[i].toLowerCase();
      if (lower.includes("jenis") || lower.includes("tanggal") || lower.includes("type") || lower.includes("date")) {
        headerIdx = i;
        break;
      }
    }

    const headers = parseCsvLine(lines[headerIdx]).map(h => h.toLowerCase().replace(/\s+/g, "_"));
    const dataLines = lines.slice(headerIdx + 1);

    for (let i = 0; i < dataLines.length; i++) {
      const raw = parseCsvLine(dataLines[i]);
      if (raw.every(v => !v)) continue;

      const row = Object.fromEntries(headers.map((h, idx) => [h, raw[idx] ?? ""]));
      const lineNum = headerIdx + i + 2;

      const kindRaw = get(row, "jenis", "type", "kind", "tipe");
      const kind = normalizeKind(kindRaw);

      if (!kind) {
        if (!kindRaw || kindRaw.startsWith("total") || kindRaw.startsWith("ringkasan") || kindRaw.startsWith("©") || kindRaw.startsWith("money")) continue;
        skipped.push({ line: lineNum, reason: `Jenis tidak dikenal: "${kindRaw}"` });
        continue;
      }

      const dateRaw = get(row, "tanggal", "date", "transaction_date", "debt_date");
      const date = parseDate(dateRaw);
      if (!date) { skipped.push({ line: lineNum, reason: `Tanggal tidak valid: "${dateRaw}"` }); continue; }

      const amountRaw = get(row, "nominal", "amount", "jumlah");
      const amount = parseAmount(amountRaw);
      if (amount <= 0) { skipped.push({ line: lineNum, reason: `Nominal tidak valid: "${amountRaw}"` }); continue; }

      const category = get(row, "kategori", "category", "kategori_label");
      const note = get(row, "keterangan", "catatan", "reason", "note");
      const wallet = get(row, "dompet", "wallet", "wallet_label");
      const kontak = get(row, "kontak_/_toko", "kontak", "merchant", "contact_name");
      const platform = get(row, "platform_/_asal", "platform", "source_name", "asal");

      if (kind === "income" || kind === "expense") {
        txInserts.push({ user_id: user.id, type: kind, amount, transaction_date: date, category_label: category || null, wallet_label: wallet || null, reason: note || "Import XLSX", merchant: kontak || null });
      } else {
        const directionRaw = get(row, "jenis", "type", "kind").toLowerCase();
        const direction = ["piutang","receivable","tagih"].some(v => directionRaw.includes(v)) ? "receivable" : "payable";
        const paidRaw = get(row, "sudah_dibayar", "paid", "paid_amount");
        const paid = parseAmount(paidRaw);
        const isPaid = get(row, "status").toLowerCase().includes("lunas") && !get(row, "status").toLowerCase().includes("belum");
        debtInserts.push({ user_id: user.id, direction, amount, paid_amount: Math.min(amount, paid), debt_date: date, contact_name: kontak || "Import", source_name: platform || wallet || "Import XLSX", reason: note || "Import XLSX", category_label: category || "Hutang", wallet_label: wallet || null, is_paid: isPaid, paid_at: isPaid ? new Date().toISOString() : null, lender_name: kontak || "Import" });
      }
    }
  } else {
    // XLSX parsing
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const sheet = workbook.getWorksheet(1);
    if (!sheet) return NextResponse.json({ error: "Sheet tidak ditemukan." }, { status: 400 });

    // Find header row
    let headerRowIdx = 0;
    for (let i = 1; i <= Math.min(15, sheet.rowCount); i++) {
      const rowVal = String(sheet.getRow(i).getCell(1).value ?? "").toLowerCase();
      if (rowVal.includes("jenis") || rowVal.includes("tanggal")) { headerRowIdx = i; break; }
    }

    if (headerRowIdx === 0) return NextResponse.json({ error: "Header tidak ditemukan." }, { status: 400 });

    const headerRow = sheet.getRow(headerRowIdx);
    const headers: string[] = [];
    headerRow.eachCell(cell => { headers.push(String(cell.value ?? "").toLowerCase().replace(/\s+/g, "_")); });

    for (let i = headerRowIdx + 1; i <= sheet.rowCount; i++) {
      const row = parseXlsxRow(sheet, i, headers);
      if (Object.values(row).every(v => !v)) continue;

      const kindRaw = get(row, "jenis", "type", "kind", "tipe");
      const kind = normalizeKind(kindRaw);

      if (!kind) {
        if (!kindRaw || kindRaw.startsWith("total") || kindRaw.startsWith("ringkasan")) continue;
        skipped.push({ line: i + 1, reason: `Jenis tidak dikenal: "${kindRaw}"` });
        continue;
      }

      const dateRaw = get(row, "tanggal", "date", "transaction_date", "debt_date");
      const date = parseDate(dateRaw);
      if (!date) { skipped.push({ line: i + 1, reason: `Tanggal tidak valid: "${dateRaw}"` }); continue; }

      // Handle numeric values from xlsx
      let amount: number;
      const amountRaw = get(row, "nominal", "amount", "jumlah");
      if (typeof amountRaw === "number" || !isNaN(Number(amountRaw))) {
        amount = Number(amountRaw);
      } else {
        amount = parseAmount(String(amountRaw));
      }
      if (amount <= 0) { skipped.push({ line: i + 1, reason: `Nominal tidak valid: "${amountRaw}"` }); continue; }

      const category = get(row, "kategori", "category", "kategori_label");
      const note = get(row, "keterangan", "catatan", "reason", "note");
      const wallet = get(row, "dompet", "wallet", "wallet_label");
      const kontak = get(row, "kontak_/_toko", "kontak", "merchant", "contact_name");
      const platform = get(row, "platform_/_asal", "platform", "source_name", "asal");

      if (kind === "income" || kind === "expense") {
        txInserts.push({ user_id: user.id, type: kind, amount, transaction_date: date, category_label: category || null, wallet_label: wallet || null, reason: note || "Import XLSX", merchant: kontak || null });
      } else {
        const directionRaw = get(row, "jenis", "type", "kind").toLowerCase();
        const direction = ["piutang","receivable","tagih"].some(v => directionRaw.includes(v)) ? "receivable" : "payable";
        const paidRaw = get(row, "sudah_dibayar", "paid", "paid_amount");
        let paid: number;
        if (typeof paidRaw === "number" || !isNaN(Number(paidRaw))) {
          paid = Number(paidRaw);
        } else {
          paid = parseAmount(String(paidRaw));
        }
        const isPaid = get(row, "status").toLowerCase().includes("lunas") && !get(row, "status").toLowerCase().includes("belum");
        debtInserts.push({ user_id: user.id, direction, amount, paid_amount: Math.min(amount, paid), debt_date: date, contact_name: kontak || "Import", source_name: platform || wallet || "Import XLSX", reason: note || "Import XLSX", category_label: category || "Hutang", wallet_label: wallet || null, is_paid: isPaid, paid_at: isPaid ? new Date().toISOString() : null, lender_name: kontak || "Import" });
      }
    }
  }

  const isPreview = new URL(request.url).searchParams.get("preview") === "1";

  if (isPreview) {
    const allRows = [
      ...txInserts.map((r: any) => ({ jenis: r.type === "income" ? "Pemasukan" : "Pengeluaran", tanggal: r.transaction_date, nominal: r.amount, kategori: r.category_label, catatan: r.reason, dompet: r.wallet_label })),
      ...debtInserts.map((r: any) => ({ jenis: r.direction === "receivable" ? "Piutang" : "Hutang", tanggal: r.debt_date, nominal: r.amount, kategori: r.category_label, catatan: r.reason, dompet: r.wallet_label })),
    ];
    return NextResponse.json({ validRows: txInserts.length + debtInserts.length, skippedRows: skipped.length, skippedDetails: skipped.slice(0, 5), preview: allRows.slice(0, 10) });
  }

  let importedCount = 0;

  if (txInserts.length) {
    const { error } = await supabase.from("transactions").insert(txInserts);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    importedCount += txInserts.length;
  }

  if (debtInserts.length) {
    const { error } = await supabase.from("debts").insert(debtInserts);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    importedCount += debtInserts.length;
  }

  return NextResponse.json({ imported: importedCount, transactions: txInserts.length, debts: debtInserts.length, skipped: skipped.length });
}
