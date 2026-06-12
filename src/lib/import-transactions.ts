export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 10_000;

type ImportRow = {
  line: number;
  values: unknown[];
};

export type ImportSkip = {
  line: number;
  reason: string;
};

export type TransactionImport = {
  type: "income" | "expense";
  amount: number;
  transaction_date: string;
  category_label: string | null;
  wallet_label: string | null;
  reason: string;
  merchant: string | null;
};

export type DebtImport = {
  direction: "payable" | "receivable";
  amount: number;
  paid_amount: number;
  debt_date: string;
  contact_name: string;
  source_name: string;
  reason: string;
  category_label: string;
  wallet_label: string | null;
  is_paid: boolean;
  paid_at: string | null;
  lender_name: string;
};

export type ParsedImport = {
  transactions: TransactionImport[];
  debts: DebtImport[];
  skipped: ImportSkip[];
};

const HEADER_ALIASES = new Set([
  "jenis",
  "type",
  "kind",
  "tipe",
  "tanggal",
  "date",
  "transaction_date",
  "debt_date",
  "nominal",
  "amount",
  "jumlah",
]);

function valueToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return formatDateParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()) ?? "";
  }
  if (typeof value === "object") {
    if ("result" in value) return valueToText(value.result);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => valueToText(part)).join("");
    }
    if ("text" in value && typeof value.text === "string") return value.text;
  }
  return String(value).trim();
}

function normalizeHeader(value: unknown) {
  return valueToText(value)
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function headerScore(values: unknown[]) {
  const normalized = values.map(normalizeHeader);
  const hasKind = normalized.some((value) => ["jenis", "type", "kind", "tipe"].includes(value));
  const hasDate = normalized.some((value) => ["tanggal", "date", "transaction_date", "debt_date"].includes(value));
  const hasAmount = normalized.some((value) => ["nominal", "amount", "jumlah"].includes(value));
  if (!hasKind || !hasDate || !hasAmount) return 0;
  return normalized.filter((value) => HEADER_ALIASES.has(value)).length;
}

export function findImportHeaderIndex(rows: ImportRow[]) {
  let bestIndex = -1;
  let bestScore = 0;

  rows.slice(0, 30).forEach((row, index) => {
    const score = headerScore(row.values);
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });

  return bestIndex;
}

function formatDateParts(year: number, month: number, day: number) {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + 1 !== month ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDate(value: unknown) {
  if (value instanceof Date) {
    return formatDateParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + Math.round(value) * 86_400_000);
    return formatDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  const raw = valueToText(value);
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return formatDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dayFirst = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayFirst) return formatDateParts(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));

  return null;
}

function parseAmount(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  let raw = valueToText(value).replace(/rp/gi, "").replace(/\s/g, "");
  if (!raw) return 0;

  const lastDot = raw.lastIndexOf(".");
  const lastComma = raw.lastIndexOf(",");

  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? "." : ",";
    const thousands = decimal === "." ? "," : ".";
    raw = raw.replaceAll(thousands, "").replace(decimal, ".");
  } else if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) {
    raw = raw.replace(/[.,]/g, "");
  } else {
    raw = raw.replace(",", ".");
  }

  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeKind(raw: string): "income" | "expense" | "debt" | null {
  const value = raw.toLowerCase().trim();
  if (["pemasukan", "income", "masuk", "in"].includes(value)) return "income";
  if (["pengeluaran", "expense", "keluar", "out", "belanja"].includes(value)) return "expense";
  if (["hutang", "debt", "payable", "utang", "pinjam", "piutang", "receivable", "tagih"].includes(value)) return "debt";
  return null;
}

function parseDelimited(text: string, delimiter: string): ImportRow[] {
  const rows: ImportRow[] = [];
  let values: string[] = [];
  let current = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;

  const pushRow = () => {
    values.push(current.trim());
    rows.push({ line: rowLine, values });
    values = [];
    current = "";
  };

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index++;
      pushRow();
      line++;
      rowLine = line;
    } else {
      current += char;
      if (char === "\n") line++;
    }
  }

  if (current || values.length) pushRow();
  return rows;
}

export function parseCsvImportRows(text: string) {
  const clean = text.replace(/^\uFEFF/, "");
  const candidates = [",", ";", "\t"].map((delimiter) => {
    const rows = parseDelimited(clean, delimiter);
    const headerIndex = findImportHeaderIndex(rows);
    const score = headerIndex >= 0 ? headerScore(rows[headerIndex].values) : 0;
    return { rows, score };
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].rows;
}

export function parseImportRows(rows: ImportRow[]): ParsedImport {
  const headerIndex = findImportHeaderIndex(rows);
  if (headerIndex < 0) {
    throw new Error("Header Jenis, Tanggal, dan Nominal tidak ditemukan.");
  }

  const headers = rows[headerIndex].values.map(normalizeHeader);
  const dataRows = rows.slice(headerIndex + 1);
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new Error(`Maksimal ${MAX_IMPORT_ROWS.toLocaleString("id-ID")} baris per import.`);
  }

  const transactions: TransactionImport[] = [];
  const debts: DebtImport[] = [];
  const skipped: ImportSkip[] = [];

  const get = (row: Record<string, unknown>, ...keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && valueToText(value) !== "") return value;
    }
    return "";
  };

  for (const sourceRow of dataRows) {
    const row = Object.fromEntries(headers.map((header, index) => [header, sourceRow.values[index] ?? ""]));
    if (Object.values(row).every((value) => valueToText(value) === "")) continue;

    const kindRaw = valueToText(get(row, "jenis", "type", "kind", "tipe"));
    const kind = normalizeKind(kindRaw);
    if (!kind) {
      skipped.push({ line: sourceRow.line, reason: kindRaw ? `Jenis tidak dikenal: "${kindRaw}"` : "Jenis kosong." });
      continue;
    }

    const rawDate = get(row, "tanggal", "date", "transaction_date", "debt_date");
    const date = parseDate(rawDate);
    if (!date) {
      skipped.push({ line: sourceRow.line, reason: `Tanggal tidak valid: "${valueToText(rawDate)}"` });
      continue;
    }

    const rawAmount = get(row, "nominal", "amount", "jumlah");
    const amount = parseAmount(rawAmount);
    if (amount <= 0 || amount > 999_999_999_999.99) {
      skipped.push({ line: sourceRow.line, reason: `Nominal tidak valid: "${valueToText(rawAmount)}"` });
      continue;
    }

    const category = valueToText(get(row, "kategori", "category", "kategori_label"));
    const note = valueToText(get(row, "keterangan", "catatan", "reason", "note"));
    const wallet = valueToText(get(row, "dompet", "wallet", "wallet_label"));
    const contact = valueToText(get(row, "kontak_toko", "kontak", "merchant", "contact_name"));
    const platform = valueToText(get(row, "platform_asal", "platform", "source_name", "asal"));

    if (kind === "income" || kind === "expense") {
      transactions.push({
        type: kind,
        amount,
        transaction_date: date,
        category_label: category || null,
        wallet_label: wallet || null,
        reason: note || "Import data",
        merchant: contact || null,
      });
      continue;
    }

    const direction = ["piutang", "receivable", "tagih"].some((value) => kindRaw.toLowerCase().includes(value))
      ? "receivable"
      : "payable";
    const status = valueToText(get(row, "status")).toLowerCase();
    const isPaid = status.includes("lunas") && !status.includes("belum");
    const parsedPaid = parseAmount(get(row, "sudah_dibayar", "paid", "paid_amount"));
    const paidAmount = isPaid ? amount : Math.min(amount, Math.max(0, parsedPaid));

    debts.push({
      direction,
      amount,
      paid_amount: paidAmount,
      debt_date: date,
      contact_name: contact || "Import",
      source_name: platform || wallet || "Import data",
      reason: note || "Import data",
      category_label: category || (direction === "receivable" ? "Piutang" : "Hutang"),
      wallet_label: wallet || null,
      is_paid: isPaid,
      paid_at: isPaid ? new Date().toISOString() : null,
      lender_name: contact || "Import",
    });
  }

  return { transactions, debts, skipped };
}
