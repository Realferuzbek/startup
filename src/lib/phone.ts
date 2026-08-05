// Uzbek mobile phone normalization + display. Numbers are self-declared (no SMS
// verification in this MVP), so we only enforce a plausible shape, then store one
// canonical E.164 form: +998 followed by the 9-digit national number.

// Known Uzbek mobile operator prefixes (the two digits after 998). Landline
// codes (e.g. 71 Tashkent) are intentionally excluded — this is a mobile field.
const MOBILE_PREFIXES = new Set([
  "20",
  "33",
  "50",
  "55",
  "77",
  "88",
  "90",
  "91",
  "93",
  "94",
  "95",
  "97",
  "98",
  "99",
]);

// Accepts flexible input (spaces, dashes, +998, a leading 0, or a bare 9-digit
// number) and returns the canonical "+998XXXXXXXXX", or null if implausible.
export function normalizeUzPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let local: string;
  if (digits.length === 12 && digits.startsWith("998")) local = digits.slice(3);
  else if (digits.length === 10 && digits.startsWith("0"))
    local = digits.slice(1);
  else if (digits.length === 9) local = digits;
  else return null;

  if (local.length !== 9) return null;
  if (!MOBILE_PREFIXES.has(local.slice(0, 2))) return null;
  return `+998${local}`;
}

// "+998901234567" → "+998 90 123 45 67" for readable display.
export function formatUzPhone(canonical: string): string {
  const digits = canonical.replace(/\D/g, "");
  if (digits.length !== 12 || !digits.startsWith("998")) return canonical;
  const l = digits.slice(3);
  return `+998 ${l.slice(0, 2)} ${l.slice(2, 5)} ${l.slice(5, 7)} ${l.slice(7, 9)}`;
}

// Telegram handles are stored without the leading "@".
export function normalizeTelegram(input: string): string {
  return input.trim().replace(/^@+/, "");
}
