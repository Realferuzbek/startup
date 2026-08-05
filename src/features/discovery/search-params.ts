import { z } from "zod";

export const PAGE_SIZE = 20;

export const SORTS = ["newest", "price_asc", "price_desc"] as const;
export type Sort = (typeof SORTS)[number];

export type ListingFilters = {
  region?: number;
  district?: number;
  currency?: "UZS" | "USD";
  priceMin?: number;
  priceMax?: number;
  roomsMin?: number;
  roomsMax?: number;
  period?: "monthly" | "daily";
  amenities: number[];
  sort: Sort;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const positiveId = z.coerce.number().int().positive().max(1_000_000);
const money = z.coerce.number().nonnegative().max(1_000_000_000_000);
const roomsN = z.coerce.number().int().min(1).max(20);

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
function many(v: string | string[] | undefined): string[] {
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}
function opt<T>(r: z.ZodSafeParseResult<T>): T | undefined {
  return r.success ? r.data : undefined;
}

// Parse + clamp every URL search param. Nothing is trusted or interpolated;
// invalid values fall back to a safe default or are dropped.
export function parseListingFilters(sp: RawSearchParams): ListingFilters {
  return {
    region: opt(positiveId.safeParse(first(sp.region))),
    district: opt(positiveId.safeParse(first(sp.district))),
    currency: opt(z.enum(["UZS", "USD"]).safeParse(first(sp.currency))),
    priceMin: opt(money.safeParse(first(sp.priceMin))),
    priceMax: opt(money.safeParse(first(sp.priceMax))),
    roomsMin: opt(roomsN.safeParse(first(sp.roomsMin))),
    roomsMax: opt(roomsN.safeParse(first(sp.roomsMax))),
    period: opt(z.enum(["monthly", "daily"]).safeParse(first(sp.period))),
    amenities: many(sp.amenity)
      .map((s) => positiveId.safeParse(s))
      .flatMap((r) => (r.success ? [r.data] : []))
      .slice(0, 14),
    sort: z
      .enum(SORTS)
      .catch("newest")
      .parse(first(sp.sort) ?? "newest"),
    page: z.coerce
      .number()
      .int()
      .min(1)
      .max(10_000)
      .catch(1)
      .parse(first(sp.page) ?? "1"),
  };
}

// Serialize filters back to a clean query string (drops empties/defaults),
// optionally overriding the page. Used by the filter form, pagination, and
// canonical/alternate URLs.
export function filtersToQuery(
  filters: ListingFilters,
  overridePage?: number,
): string {
  const p = new URLSearchParams();
  if (filters.region) p.set("region", String(filters.region));
  if (filters.district) p.set("district", String(filters.district));
  if (filters.currency) p.set("currency", filters.currency);
  if (filters.priceMin !== undefined)
    p.set("priceMin", String(filters.priceMin));
  if (filters.priceMax !== undefined)
    p.set("priceMax", String(filters.priceMax));
  if (filters.roomsMin !== undefined)
    p.set("roomsMin", String(filters.roomsMin));
  if (filters.roomsMax !== undefined)
    p.set("roomsMax", String(filters.roomsMax));
  if (filters.period) p.set("period", filters.period);
  for (const a of filters.amenities) p.append("amenity", String(a));
  if (filters.sort !== "newest") p.set("sort", filters.sort);
  const page = overridePage ?? filters.page;
  if (page > 1) p.set("page", String(page));
  return p.toString();
}
