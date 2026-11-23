import { describe, expect, it } from "vitest";

import { AMOUNT_MAX_DIGITS, applyKeypadKey, type KeypadKey } from "@/components/ui/keypad-logic";

function typeKeys(keys: KeypadKey[], start = 0) {
  return keys.reduce((value, key) => applyKeypadKey(value, key), start);
}

describe("applyKeypadKey", () => {
  it("builds integer rupiah from digits and 000", () => {
    expect(typeKeys(["2", "5", "000"])).toBe(25000);
    expect(typeKeys(["1", "000", "000"])).toBe(1_000_000);
  });

  it("ignores leading zeros", () => {
    expect(typeKeys(["0", "000", "7"])).toBe(7);
  });

  it("backspace removes the last digit and clear resets", () => {
    expect(typeKeys(["2", "5", "000", "back"])).toBe(2500);
    expect(typeKeys(["9", "back", "back"])).toBe(0);
    expect(applyKeypadKey(123456, "clear")).toBe(0);
  });

  it("never exceeds the maximum digit count", () => {
    const many = Array.from({ length: 20 }, () => "9" as KeypadKey);
    const value = typeKeys(many);
    expect(String(value)).toHaveLength(AMOUNT_MAX_DIGITS);
    expect(applyKeypadKey(value, "000")).toBe(value);
    expect(Number.isSafeInteger(value)).toBe(true);
  });
});
