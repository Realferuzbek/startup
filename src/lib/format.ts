// Locale-aware display formatting for money and measurements.
//
// The units here — `soʻm`/`сум`, `$`, `m²`, and the period words `oy`/`kun` ·
// `мес`/`сут` — are locale-specific FORMATTING tokens, kept in one place so a
// price reads identically on every surface. (UI copy still lives in next-intl;
// these are the same class of thing as `$` and `m²`.) Number grouping goes
// through Intl.NumberFormat with the active locale; both `uz` and `ru` group
// with a non-breaking space, which we normalize to a plain space so the output
// is the exact `3 500 000` the design system specifies.

type Locale = "uz" | "ru";
type Period = "monthly" | "daily";

// Non-breaking / narrow-no-break / thin spaces → a regular ASCII space.
const NBSP = /[   ]/g;

function nf(locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "uz-UZ", opts);
}

function uzru(locale: string): Locale {
  return locale === "ru" ? "ru" : "uz";
}

// "3 500 000" — no decimals, whole units, space thousands.
export function formatNumber(value: number, locale: string): string {
  return nf(locale, { maximumFractionDigits: 0 })
    .format(Math.round(value))
    .replace(NBSP, " ");
}

const CURRENCY_UNIT: Record<string, Record<Locale, string>> = {
  UZS: { uz: "soʻm", ru: "сум" },
};

// UZS → "3 500 000 soʻm"; USD → "$1 200" ($ before the number, both locales).
export function formatPrice(
  amount: number,
  currency: string,
  locale: string,
): string {
  const n = formatNumber(amount, locale);
  if (currency === "USD") return `$${n}`;
  const unit = CURRENCY_UNIT[currency]?.[uzru(locale)] ?? currency;
  return `${n} ${unit}`;
}

const PERIOD_UNIT: Record<Period, Record<Locale, string>> = {
  monthly: { uz: "oy", ru: "мес" },
  daily: { uz: "kun", ru: "сут" },
};

// "3 500 000 soʻm / oy"
export function formatPriceWithPeriod(
  amount: number,
  currency: string,
  period: Period,
  locale: string,
): string {
  return `${formatPrice(amount, currency, locale)} / ${PERIOD_UNIT[period][uzru(locale)]}`;
}

// Area: at most one decimal, trailing `.0` stripped (Intl does both), then ` m²`.
export function formatArea(area: number, locale: string): string {
  const n = nf(locale, { maximumFractionDigits: 1 })
    .format(area)
    .replace(NBSP, " ");
  return `${n} m²`;
}
