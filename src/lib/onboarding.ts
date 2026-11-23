import type { WalletKind } from "@/lib/types";

// Pure helpers for /onboarding (PLAN.md section 4): first wallet + opening
// balance, optional monthly savings target, notifications.

export const WALLET_KINDS: WalletKind[] = ["cash", "bank", "ewallet", "card", "other"];

/** Name suggestions per kind, first one is the default when the kind is picked. */
export const WALLET_PRESETS: Record<WalletKind, string[]> = {
  cash: ["Tunai"],
  bank: ["BCA", "Mandiri", "BRI", "BNI"],
  ewallet: ["GoPay", "OVO", "DANA", "ShopeePay"],
  card: ["Kartu kredit"],
  other: ["Lainnya"],
};

/** Stored wallet colors (wallets.color), muted to match the v2 palette. */
const WALLET_COLORS: Record<WalletKind, string> = {
  cash: "#3dd68c",
  bank: "#6ca8ff",
  ewallet: "#c8f169",
  card: "#f5b544",
  other: "#8a919c",
};

export function walletColor(kind: WalletKind) {
  return WALLET_COLORS[kind] ?? WALLET_COLORS.other;
}

export const SAVINGS_PRESETS = [0, 500_000, 1_000_000, 2_000_000];

/** 14 digits, same cap as the amount keypad. */
export const MAX_AMOUNT = 99_999_999_999_999;

export type FirstWalletInput = { name: string; kind: WalletKind; openingBalance: number };
export type FirstWalletIssue = "name_required" | "name_too_long" | "invalid_kind" | "invalid_balance";

export function validateFirstWallet(input: FirstWalletInput): FirstWalletIssue | null {
  const name = input.name.trim();
  if (!name) return "name_required";
  if (name.length > 40) return "name_too_long";
  if (!WALLET_KINDS.includes(input.kind)) return "invalid_kind";
  if (!Number.isInteger(input.openingBalance) || input.openingBalance < 0 || input.openingBalance > MAX_AMOUNT) {
    return "invalid_balance";
  }
  return null;
}

/** wallets insert payload. Opening balance is the money in the wallet today. */
export function buildWalletRow(userId: string, input: FirstWalletInput) {
  return {
    user_id: userId,
    name: input.name.trim(),
    kind: input.kind,
    opening_balance: input.openingBalance,
    color: walletColor(input.kind),
    is_archived: false,
  };
}

export function validateSavingsTarget(amount: number): "invalid_amount" | null {
  return Number.isInteger(amount) && amount >= 0 && amount <= MAX_AMOUNT ? null : "invalid_amount";
}
