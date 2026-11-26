import { describe, expect, it } from "vitest";

import { buildCatatPayload, buildTransferFeePayload, type CatatDraft } from "@/components/quick-add/build-payload";
import { maskMoney } from "@/components/providers/privacy-provider";
import { hashPin, isValidPin, shouldLockOnResume, verifyPin } from "@/lib/app-lock";
import { MAX_RECEIPT_BYTES, receiptStoragePath, validateReceiptFile } from "@/lib/attachments";
import { parseBankNotification } from "@/lib/quick-capture";
import { buildReconcileTransaction } from "@/lib/reconcile";
import { buildSplitPayloads, remainingSplitAmount, validateSplits } from "@/lib/splits";

const WALLETS = [
  { id: "w-bca", name: "BCA", kind: "bank" as const },
  { id: "w-gopay", name: "GoPay", kind: "ewallet" as const },
];

describe("v2.1 transfer admin fee & merchant", () => {
  const baseDraft: CatatDraft = {
    mode: "transfer",
    amount: 100_000,
    categoryId: null,
    categoryLabel: null,
    walletId: "w-bca",
    toWalletId: "w-gopay",
    dateKey: "2026-11-26",
    note: "Top up",
    merchant: "",
    transferFee: 2500,
    debtDirection: "payable",
    contact: "",
  };

  it("builds a paired admin fee expense deducted from the sender wallet", () => {
    const fee = buildTransferFeePayload(baseDraft, WALLETS);
    expect(fee).not.toBeNull();
    expect(fee?.table).toBe("transactions");
    expect(fee?.payload).toMatchObject({
      type: "expense",
      amount: 2500,
      category_label: "Biaya Admin",
      wallet_id: "w-bca",
      wallet_label: "BCA",
      transaction_date: "2026-11-26",
      reason: "Biaya admin transfer → GoPay",
    });
  });

  it("returns null when transferFee is 0 or mode is not transfer", () => {
    expect(buildTransferFeePayload({ ...baseDraft, transferFee: 0 }, WALLETS)).toBeNull();
    expect(buildTransferFeePayload({ ...baseDraft, mode: "expense", transferFee: 2500 }, WALLETS)).toBeNull();
  });

  it("includes trimmed merchant on transaction inserts", () => {
    const built = buildCatatPayload(
      { ...baseDraft, mode: "expense", merchant: "  Kopi Kenangan  ", note: "Es kopi" },
      [],
      WALLETS,
    );
    expect(built.table).toBe("transactions");
    expect(built.payload.merchant).toBe("Kopi Kenangan");
  });
});

describe("v2.1 wallet balance reconciliation", () => {
  const wallet = { id: "w-cash", name: "Tunai", balance: 450_000 };

  it("returns null when balance already matches", () => {
    expect(buildReconcileTransaction({ wallet, actualBalance: 450_000, dateKey: "2026-11-26" })).toBeNull();
  });

  it("creates an expense when real balance is lower than tracked balance", () => {
    const result = buildReconcileTransaction({ wallet, actualBalance: 425_000, dateKey: "2026-11-26" });
    expect(result?.delta).toBe(-25_000);
    expect(result?.payload).toMatchObject({
      type: "expense",
      amount: 25_000,
      wallet_id: "w-cash",
      category_label: "Penyesuaian Saldo",
    });
  });

  it("creates an income when real balance is higher than tracked balance", () => {
    const result = buildReconcileTransaction({ wallet, actualBalance: 500_000, dateKey: "2026-11-26" });
    expect(result?.delta).toBe(50_000);
    expect(result?.payload).toMatchObject({
      type: "income",
      amount: 50_000,
      wallet_id: "w-cash",
    });
  });
});

describe("v2.1 privacy mask", () => {
  it("masks amounts per locale", () => {
    expect(maskMoney("id")).toBe("Rp••••••");
    expect(maskMoney("en")).toBe("IDR ••••••");
  });
});

describe("v2.1 receipts & splits helpers", () => {
  it("validates receipt file type and size", () => {
    expect(validateReceiptFile({ type: "image/webp", size: 1024 })).toBeNull();
    expect(validateReceiptFile({ type: "application/pdf", size: 1024 })).toBe("type");
    expect(validateReceiptFile({ type: "image/jpeg", size: MAX_RECEIPT_BYTES + 1 })).toBe("size");
    expect(receiptStoragePath("u1", "tx1", "webp", 123)).toBe("u1/tx1-123.webp");
  });

  it("validates category splits and builds DB rows", () => {
    const rows = [
      { categoryId: "c1", categoryLabel: "Makan", amount: 100_000 },
      { categoryId: "c2", categoryLabel: "Rumah", amount: 50_000 },
    ];
    expect(remainingSplitAmount(150_000, rows)).toBe(0);
    expect(validateSplits(150_000, rows)).toBeNull();
    expect(validateSplits(160_000, rows)).toBe("mismatch");
    expect(validateSplits(100_000, [rows[0]])).toBe("empty");
    expect(buildSplitPayloads("u1", "tx1", rows)).toHaveLength(2);
  });
});

describe("v2.1 quick capture (bank/QRIS notification parser)", () => {
  it("parses QRIS expense notifications", () => {
    const parsed = parseBankNotification("Pembayaran QRIS di Kopi Kenangan sebesar Rp28.000 berhasil via BCA");
    expect(parsed).not.toBeNull();
    expect(parsed?.mode).toBe("expense");
    expect(parsed?.amount).toBe(28_000);
    expect(parsed?.merchant).toBe("Kopi Kenangan");
  });

  it("parses incoming bank transfers as income", () => {
    const parsed = parseBankNotification("Transfer masuk dari PT Maju sebesar IDR 5,000,000.00 via Livin Mandiri");
    expect(parsed).not.toBeNull();
    expect(parsed?.mode).toBe("income");
    expect(parsed?.amount).toBe(5_000_000);
  });

  it("returns null when no amount exists", () => {
    expect(parseBankNotification("Halo apa kabar")).toBeNull();
  });
});

describe("v2.1 app lock (PIN hashing & timeout)", () => {
  it("validates PIN format and verifies salted SHA-256 hashes", async () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("12")).toBe(false);
    expect(isValidPin("abcd")).toBe(false);

    const hash = await hashPin("2468", "salt-abc");
    expect(await verifyPin("2468", { pinHash: hash, salt: "salt-abc" })).toBe(true);
    expect(await verifyPin("0000", { pinHash: hash, salt: "salt-abc" })).toBe(false);
  });

  it("enforces resume timeout rules", () => {
    expect(shouldLockOnResume(null, 10_000, 5)).toBe(true);
    expect(shouldLockOnResume(10_000, 10_500, 0)).toBe(true);
    expect(shouldLockOnResume(10_000, 40_000, 1)).toBe(false);
    expect(shouldLockOnResume(10_000, 75_000, 1)).toBe(true);
  });
});
