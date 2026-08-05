import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  filtersToQuery,
  type ListingFilters,
} from "@/features/discovery/search-params";
import { formatNumber } from "@/lib/format";

type Option = { id: number; name_uz: string; name_ru: string };

// Removable chips for the active filters, above the results. Each chip is a
// locale-aware link to the SAME search minus that one filter (page reset to 1)
// — removal is entirely URL-driven, no client JS. Sort is not a filter, so it
// gets no chip.
export async function ActiveFilters({
  filters,
  regions,
  districts,
  amenities,
  locale,
}: {
  filters: ListingFilters;
  regions: Option[];
  districts: Option[];
  amenities: Option[];
  locale: string;
}) {
  const t = await getTranslations("discovery");
  const label = (o: Option) => (locale === "ru" ? o.name_ru : o.name_uz);
  const name = (list: Option[], id: number) => {
    const o = list.find((x) => x.id === id);
    return o ? label(o) : String(id);
  };
  const href = (next: ListingFilters) => {
    const q = filtersToQuery(next, 1);
    return `/${q ? `?${q}` : ""}`;
  };

  const chips: { key: string; text: string; to: string }[] = [];

  if (filters.region !== undefined) {
    chips.push({
      key: "region",
      text: name(regions, filters.region),
      // Clearing the region orphans the district, so drop both.
      to: href({ ...filters, region: undefined, district: undefined }),
    });
  }
  if (filters.district !== undefined) {
    chips.push({
      key: "district",
      text: name(districts, filters.district),
      to: href({ ...filters, district: undefined }),
    });
  }
  if (filters.currency !== undefined) {
    chips.push({
      key: "currency",
      text: filters.currency,
      to: href({ ...filters, currency: undefined }),
    });
  }
  if (filters.priceMin !== undefined) {
    chips.push({
      key: "priceMin",
      text: `${t("priceMin")}: ${formatNumber(filters.priceMin, locale)}`,
      to: href({ ...filters, priceMin: undefined }),
    });
  }
  if (filters.priceMax !== undefined) {
    chips.push({
      key: "priceMax",
      text: `${t("priceMax")}: ${formatNumber(filters.priceMax, locale)}`,
      to: href({ ...filters, priceMax: undefined }),
    });
  }
  if (filters.roomsMin !== undefined) {
    chips.push({
      key: "roomsMin",
      text: `${t("roomsMin")}: ${filters.roomsMin}`,
      to: href({ ...filters, roomsMin: undefined }),
    });
  }
  if (filters.roomsMax !== undefined) {
    chips.push({
      key: "roomsMax",
      text: `${t("roomsMax")}: ${filters.roomsMax}`,
      to: href({ ...filters, roomsMax: undefined }),
    });
  }
  if (filters.period !== undefined) {
    chips.push({
      key: "period",
      text:
        filters.period === "monthly" ? t("periodMonthly") : t("periodDaily"),
      to: href({ ...filters, period: undefined }),
    });
  }
  for (const id of filters.amenities) {
    chips.push({
      key: `amenity-${id}`,
      text: name(amenities, id),
      to: href({
        ...filters,
        amenities: filters.amenities.filter((a) => a !== id),
      }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <Link
          key={c.key}
          href={c.to}
          aria-label={t("removeFilter", { label: c.text })}
          className="bg-rule text-ink-secondary text-caption hover:bg-rule-strong inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-registry/40 focus-visible:outline-none"
        >
          <span>{c.text}</span>
          <span aria-hidden="true" className="text-ink-muted">
            ×
          </span>
        </Link>
      ))}
    </div>
  );
}
