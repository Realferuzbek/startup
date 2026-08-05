import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  filtersToQuery,
  PAGE_SIZE,
  type ListingFilters,
} from "@/features/discovery/search-params";

const control =
  "inline-flex h-9 items-center rounded-md border border-rule-strong px-3 text-button text-ink " +
  "transition-colors duration-150 hover:border-ink-muted " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-registry/40 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

export async function Pagination({
  filters,
  total,
}: {
  filters: ListingFilters;
  total: number;
}) {
  const t = await getTranslations("discovery");
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) => {
    const q = filtersToQuery(filters, p);
    return `/${q ? `?${q}` : ""}`;
  };

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-between gap-3"
    >
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={control}>
          {t("prev")}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-small text-ink-secondary font-mono">
        {t("pageOf", { page, total: totalPages })}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={control}>
          {t("next")}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
