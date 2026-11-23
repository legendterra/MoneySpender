export const AMOUNT_MAX_DIGITS = 14;

export type KeypadKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "000"
  | "back"
  | "clear";

/** Pure keypad reducer. Works on integer rupiah, never exceeds `maxDigits` digits. */
export function applyKeypadKey(value: number, key: KeypadKey, maxDigits = AMOUNT_MAX_DIGITS) {
  const current = value > 0 ? String(Math.floor(value)) : "";
  if (key === "clear") return 0;
  if (key === "back") {
    const next = current.slice(0, -1);
    return next ? Number(next) : 0;
  }
  if (!current && (key === "0" || key === "000")) return 0;
  if (current.length >= maxDigits) return Number(current);
  const appended = `${current}${key}`.slice(0, maxDigits);
  return Number(appended);
}
