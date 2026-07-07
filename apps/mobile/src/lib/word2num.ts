/**
 * Best-effort amount extraction from a spoken phrase. Handles plain digits
 * ("40500", "40,500") and English number words ("forty thousand five hundred").
 * Returns null when nothing number-like is found — the user still confirms.
 */
const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};
const SCALES: Record<string, number> = { hundred: 100, thousand: 1000, million: 1_000_000 };

export function amountFromText(text: string): number | null {
  // 1. Explicit digits win (e.g. "paid 40,500").
  const digits = text.replace(/[,\s](?=\d)/g, "").match(/\d{2,}/);
  if (digits) return parseInt(digits[0], 10);

  // 2. Number words.
  const words = text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/);
  let total = 0, current = 0, sawNumber = false;
  for (const w of words) {
    if (w in UNITS) {
      current += UNITS[w]!;
      sawNumber = true;
    } else if (w === "hundred") {
      current = (current || 1) * 100;
      sawNumber = true;
    } else if (w in SCALES) {
      current = (current || 1) * SCALES[w]!;
      total += current;
      current = 0;
      sawNumber = true;
    }
  }
  const result = total + current;
  return sawNumber && result > 0 ? result : null;
}
