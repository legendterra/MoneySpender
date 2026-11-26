export type QuickCaptureResult = {
  mode: "expense" | "income";
  amount: number;
  merchant: string | null;
  note: string | null;
};

const INCOME_HINT =
  /\b(masuk|kredit|credit|terima|diterima|received|incoming|gaji|refund|cashback|top\s?up\s+masuk|transfer\s+masuk|saldo\s+bertambah)\b/i;

const EXPENSE_HINT =
  /\b(bayar|pembayaran|payment|qris|debit|keluar|beli|pembelian|transaksi\s+berhasil|belanja|tarik|transfer\s+ke|paid|spent)\b/i;

function parseRupiahNumber(raw: string): number {
  const cleaned = raw.trim().replace(/\s+/g, "");
  // Format with decimal cents like 150.000,00 or 150,000.00 -> strip trailing 2-digit fractional part.
  const withoutCents = cleaned.replace(/[.,]\d{2}$/, "");
  const digits = withoutCents.replace(/[^\d]/g, "");
  const value = Number.parseInt(digits, 10);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function extractAmount(text: string): number {
  const currencyMatch = text.match(/(?:Rp\.?|IDR)\s*([0-9][0-9.,\s]{0,18})/i);
  if (currencyMatch?.[1]) {
    const parsed = parseRupiahNumber(currencyMatch[1]);
    if (parsed > 0) return parsed;
  }
  // Fallback: standalone formatted number like 45.000 or 125,000
  const formattedMatch = text.match(/\b([1-9]\d{0,2}(?:[.,]\d{3})+)\b/);
  if (formattedMatch?.[1]) {
    const parsed = parseRupiahNumber(formattedMatch[1]);
    if (parsed > 0) return parsed;
  }
  // Fallback: plain integer >= 500
  const plainMatch = text.match(/\b([1-9]\d{2,10})\b/);
  if (plainMatch?.[1]) {
    const parsed = Number.parseInt(plainMatch[1], 10);
    if (parsed >= 500) return parsed;
  }
  return 0;
}

function extractMerchant(text: string): string | null {
  const patterns = [
    /(?:merchant|toko|outlet|di|at|ke|tujuan|kepada)\s*[:\-]?\s*([A-Za-z0-9&'.,\- ]{2,45}?)(?=\s+(?:sebesar|senilai|rp\.?|idr|pada|tgl|tanggal|dengan|via|dari|berhasil|sukses|\d{2}[/-]\d{2})|[.,;\n]|$)/i,
    /QRIS\s+(?:di\s+)?([A-Za-z0-9&'.,\- ]{2,45}?)(?=\s+(?:sebesar|rp\.?|idr|berhasil|sukses)|[.,;\n]|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim().replace(/^[-\s:]+|[-\s:]+$/g, "");
    if (candidate && candidate.length >= 2 && !/^(rp|idr|\d+)$/i.test(candidate)) {
      return candidate.slice(0, 60);
    }
  }
  return null;
}

/**
 * Parses pasted Indonesian bank / e-wallet / QRIS notification text locally
 * (BCA, Livin', BRImo, BNI, GoPay, OVO, DANA, ShopeePay, QRIS) into a Catat draft.
 * Returns null when no valid positive amount can be found.
 */
export function parseBankNotification(raw: string): QuickCaptureResult | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;

  const amount = extractAmount(text);
  if (!amount) return null;

  const isIncome = INCOME_HINT.test(text) && !/\b(qris|belanja|pembelian|bayar)\b/i.test(text);
  const mode: "expense" | "income" = isIncome && !EXPENSE_HINT.test(text) ? "income" : isIncome ? "income" : "expense";
  const merchant = extractMerchant(text);

  // Keep a concise note when no merchant was extracted, or mirror merchant + source hint.
  const bankMatch = text.match(/\b(BCA|Mandiri|Livin|BRImo|BRI|BNI|GoPay|OVO|DANA|ShopeePay|QRIS|SeaBank|Jago)\b/i);
  const note = merchant
    ? bankMatch
      ? `${merchant} (${bankMatch[1]})`
      : merchant
    : text.slice(0, 80);

  return { mode, amount, merchant, note };
}
