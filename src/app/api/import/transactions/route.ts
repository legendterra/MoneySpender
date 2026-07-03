import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import {
  MAX_IMPORT_FILE_SIZE,
  findImportHeaderIndex,
  parseCsvImportRows,
  parseImportRows,
  type DebtImport,
  type TransactionImport,
} from "@/lib/import-transactions";
import { requirePro } from "@/lib/billing";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ReferenceRow = {
  id: string;
  name: string;
  type?: string;
};

function lookupKey(value: string | null) {
  return value?.trim().toLocaleLowerCase("id-ID") ?? "";
}

function toWorksheetRows(sheet: ExcelJS.Worksheet) {
  return Array.from({ length: sheet.rowCount }, (_, index) => {
    const row = sheet.getRow(index + 1);
    return {
      line: index + 1,
      values: Array.from({ length: row.cellCount }, (__, cellIndex) => row.getCell(cellIndex + 1).value),
    };
  });
}

function buildWarnings(
  transactions: TransactionImport[],
  debts: DebtImport[],
  wallets: Map<string, ReferenceRow>,
  categories: Map<string, ReferenceRow>,
) {
  const unmatchedWallets = new Set<string>();
  const unmatchedCategories = new Set<string>();

  for (const transaction of transactions) {
    if (transaction.wallet_label && !wallets.has(lookupKey(transaction.wallet_label))) {
      unmatchedWallets.add(transaction.wallet_label);
    }
    if (
      transaction.category_label &&
      !categories.has(`${transaction.type}:${lookupKey(transaction.category_label)}`)
    ) {
      unmatchedCategories.add(transaction.category_label);
    }
  }

  for (const debt of debts) {
    if (debt.wallet_label && !wallets.has(lookupKey(debt.wallet_label))) {
      unmatchedWallets.add(debt.wallet_label);
    }
    if (debt.category_label && !categories.has(`debt:${lookupKey(debt.category_label)}`)) {
      unmatchedCategories.add(debt.category_label);
    }
  }

  return {
    unmatchedWallets: [...unmatchedWallets],
    unmatchedCategories: [...unmatchedCategories],
  };
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proCheck = await requirePro(supabase, user.id);
  if (proCheck) return proCheck;

  const limited = await enforceRateLimit(`import:${user.id}`, { limit: 20, windowSeconds: 600 });
  if (limited) return limited;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMPORT_FILE_SIZE + 100_000) {
    return NextResponse.json({ error: "Ukuran file maksimal 10 MB." }, { status: 413 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File belum dipilih." }, { status: 400 });
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return NextResponse.json({ error: "Ukuran file maksimal 10 MB." }, { status: 413 });
  }

  const fileName = file.name.toLowerCase();
  const isXlsx = fileName.endsWith(".xlsx");
  const isCsv = fileName.endsWith(".csv");
  if (!isXlsx && !isCsv) {
    return NextResponse.json({ error: "Hanya file .csv atau .xlsx yang diterima." }, { status: 400 });
  }

  let parsed;
  try {
    if (isCsv) {
      parsed = parseImportRows(parseCsvImportRows(await file.text()));
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const importRows = workbook.worksheets
        .map(toWorksheetRows)
        .find((rows) => findImportHeaderIndex(rows) >= 0);

      if (!importRows) throw new Error("Sheet dengan header Jenis, Tanggal, dan Nominal tidak ditemukan.");
      parsed = parseImportRows(importRows);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "File tidak dapat dibaca.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const validRows = parsed.transactions.length + parsed.debts.length;
  if (validRows === 0) {
    return NextResponse.json({
      error: "Tidak ada baris valid untuk di-import.",
      skippedDetails: parsed.skipped.slice(0, 10),
    }, { status: 400 });
  }

  const [walletResult, categoryResult] = await Promise.all([
    supabase.from("wallets").select("id,name").eq("user_id", user.id),
    supabase.from("categories").select("id,name,type").eq("user_id", user.id),
  ]);
  if (walletResult.error || categoryResult.error) {
    return NextResponse.json({ error: "Referensi dompet dan kategori gagal dimuat." }, { status: 500 });
  }

  const wallets = new Map(
    ((walletResult.data ?? []) as ReferenceRow[]).map((wallet) => [lookupKey(wallet.name), wallet]),
  );
  const categories = new Map(
    ((categoryResult.data ?? []) as ReferenceRow[]).map((category) => [
      `${category.type}:${lookupKey(category.name)}`,
      category,
    ]),
  );
  const warnings = buildWarnings(parsed.transactions, parsed.debts, wallets, categories);

  const txInserts = parsed.transactions.map((transaction) => ({
    ...transaction,
    user_id: user.id,
    wallet_id: transaction.wallet_label ? wallets.get(lookupKey(transaction.wallet_label))?.id ?? null : null,
    category_id: transaction.category_label
      ? categories.get(`${transaction.type}:${lookupKey(transaction.category_label)}`)?.id ?? null
      : null,
  }));
  const debtInserts = parsed.debts.map((debt) => ({
    ...debt,
    user_id: user.id,
    wallet_id: debt.wallet_label ? wallets.get(lookupKey(debt.wallet_label))?.id ?? null : null,
    category_id: debt.category_label ? categories.get(`debt:${lookupKey(debt.category_label)}`)?.id ?? null : null,
  }));

  const isPreview = new URL(request.url).searchParams.get("preview") === "1";
  if (isPreview) {
    const preview = [
      ...parsed.transactions.map((row) => ({
        jenis: row.type === "income" ? "Pemasukan" : "Pengeluaran",
        tanggal: row.transaction_date,
        nominal: row.amount,
        kategori: row.category_label,
        catatan: row.reason,
        dompet: row.wallet_label,
      })),
      ...parsed.debts.map((row) => ({
        jenis: row.direction === "receivable" ? "Piutang" : "Hutang",
        tanggal: row.debt_date,
        nominal: row.amount,
        kategori: row.category_label,
        catatan: row.reason,
        dompet: row.wallet_label,
      })),
    ];

    return NextResponse.json({
      validRows,
      skippedRows: parsed.skipped.length,
      skippedDetails: parsed.skipped.slice(0, 10),
      preview: preview.slice(0, 10),
      ...warnings,
    });
  }

  let insertedTransactionIds: string[] = [];
  if (txInserts.length) {
    const { data, error } = await supabase.from("transactions").insert(txInserts).select("id");
    if (error) return NextResponse.json({ error: `Import transaksi gagal: ${error.message}` }, { status: 500 });
    insertedTransactionIds = (data ?? []).map((row) => String(row.id));
  }

  if (debtInserts.length) {
    const { error } = await supabase.from("debts").insert(debtInserts);
    if (error) {
      if (insertedTransactionIds.length) {
        await supabase.from("transactions").delete().in("id", insertedTransactionIds);
      }
      return NextResponse.json({ error: `Import hutang/piutang gagal: ${error.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    imported: validRows,
    transactions: txInserts.length,
    debts: debtInserts.length,
    skipped: parsed.skipped.length,
    ...warnings,
  });
}
