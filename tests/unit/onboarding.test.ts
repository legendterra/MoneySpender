import { describe, expect, it } from "vitest";

import { buildWalletRow, validateFirstWallet, validateSavingsTarget, walletColor } from "@/lib/onboarding";

describe("onboarding helpers", () => {
  it("validates the first wallet", () => {
    expect(validateFirstWallet({ name: "Tunai", kind: "cash", openingBalance: 500_000 })).toBeNull();
    expect(validateFirstWallet({ name: "  ", kind: "cash", openingBalance: 0 })).toBe("name_required");
    expect(validateFirstWallet({ name: "x".repeat(41), kind: "cash", openingBalance: 0 })).toBe("name_too_long");
    expect(validateFirstWallet({ name: "A", kind: "gold" as never, openingBalance: 0 })).toBe("invalid_kind");
    expect(validateFirstWallet({ name: "A", kind: "bank", openingBalance: -1 })).toBe("invalid_balance");
    expect(validateFirstWallet({ name: "A", kind: "bank", openingBalance: 1.5 })).toBe("invalid_balance");
    expect(validateFirstWallet({ name: "A", kind: "bank", openingBalance: 10 ** 15 })).toBe("invalid_balance");
  });

  it("builds the wallets insert row with a trimmed name and kind color", () => {
    expect(buildWalletRow("u1", { name: "  BCA ", kind: "bank", openingBalance: 1_250_000 })).toEqual({
      user_id: "u1",
      name: "BCA",
      kind: "bank",
      opening_balance: 1_250_000,
      color: walletColor("bank"),
      is_archived: false,
    });
  });

  it("allows a zero savings target and rejects invalid amounts", () => {
    expect(validateSavingsTarget(0)).toBeNull();
    expect(validateSavingsTarget(2_000_000)).toBeNull();
    expect(validateSavingsTarget(-5)).toBe("invalid_amount");
    expect(validateSavingsTarget(Number.NaN)).toBe("invalid_amount");
  });
});
