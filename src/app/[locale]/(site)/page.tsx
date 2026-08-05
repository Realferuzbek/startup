import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link, getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import {
  parseListingFilters,
  type RawSearchParams,
} from "@/features/discovery/search-params";
import { searchListings, getFilterOptions } from "@/features/discovery/queries";
import { getCurrentUser } from "@/features/auth/session";
import { getFavoriteIds } from "@/features/favorites/queries";
import { FilterBar } from "@/features/discovery/components/filter-bar";
import { ListingCard } from "@/features/discovery/components/listing-card";
import { Pagination } from "@/features/discovery/components/pagination";
import { ActiveFilters } from "@/features/discovery/components/active-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = SITE_URL + (await getPathname({ locale: l, href: "/" }));
  }
  const url = SITE_URL + (await getPathname({ locale, href: "/" }));
  // Canonical stays the bare feed so filtered variants never split the page.
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: url, languages },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      type: "website",
      siteName: "Makleer",
      url,
      locale: locale === "ru" ? "ru_RU" : "uz_UZ",
      // Naming an openGraph object here replaces the one the file convention
      // would have contributed, so the generated card has to be re-attached by
      // hand or the page ships with no og:image at all.
      images: [
        {
          url: `/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "Makleer",
        },
      ],
    },
  };
}

// The home page IS the feed. No hero, no trust strip, no how-it-works, no host
// CTA — it opens directly onto houses. Browsing never requires a session.
export default async function FeedPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const filters = parseListingFilters(await searchParams);
  const t = await getTranslations("discovery");

  const [{ listings, total }, options, current] = await Promise.all([
    searchListings(filters),
    getFilterOptions(),
    getCurrentUser(),
  ]);
  const signedIn = Boolean(current);
  const favoriteIds = current
    ? await getFavoriteIds(current.user.id)
    : new Set<string>();

  const label = (o: { name_uz: string; name_ru: string }) =>
    locale === "ru" ? o.name_ru : o.name_uz;
  const regionName = (id: number | null) => {
    const r = options.regions.find((x) => x.id === id);
    return r ? label(r) : "";
  };
  const districtName = (id: number | null) => {
    if (id == null) return null;
    const d = options.districts.find((x) => x.id === id);
    return d ? label(d) : null;
  };

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-6 md:px-6">
      {/* The page leads with houses, but a document still needs a heading. */}
      <h1 className="sr-only">{t("browseTitle")}</h1>

      <FilterBar
        locale={locale}
        filters={filters}
        regions={options.regions}
        districts={options.districts}
        amenities={options.amenities}
        tashkentCityRegionId={options.tashkentCityRegionId}
      />

      <ActiveFilters
        filters={filters}
        regions={options.regions}
        districts={options.districts}
        amenities={options.amenities}
        locale={locale}
      />

      <p className="text-small text-ink-secondary">
        {t("resultsCount", { count: total })}
      </p>

      {listings.length === 0 ? (
        <EmptyState
          heading={t("emptyTitle")}
          body={t("emptyHint")}
          action={
            <Link href="/" className={buttonVariants({ variant: "secondary" })}>
              {t("reset")}
            </Link>
          }
        />
      ) : (
        <>
          {/* 1 / 2 / 3 columns. `xl` here meant 1280px while the page caps at
              1200px, so the feed was 2-up at every real desktop width and a
              single card rendered ~568px wide with a 426px-tall photo. */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((c) => (
              <ListingCard
                key={c.id}
                card={c}
                regionName={regionName(c.region_id)}
                districtName={districtName(c.district_id)}
                isFavorited={favoriteIds.has(c.id)}
                signedIn={signedIn}
              />
            ))}
          </div>
          <Pagination filters={filters} total={total} />
        </>
      )}
    </main>
  );
}
