import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import {
  getPublicListing,
  getListingPhotos,
  getListingAmenities,
  getFilterOptions,
  incrementListingView,
} from "@/features/discovery/queries";
import { Gallery } from "@/features/discovery/components/gallery";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { formatPriceWithPeriod, formatArea } from "@/lib/format";
import { getCurrentUser } from "@/features/auth/session";
import { getRevealedContact } from "@/features/reveal/queries";
import { ContactReveal } from "@/features/reveal/components/contact-reveal";
import { getFavoriteIds } from "@/features/favorites/queries";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";

// Data changes and listings expire, and each view is counted per request, so
// the detail page is rendered fresh on every request rather than cached.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await getPublicListing(id);
  if (!listing) return {};

  const photos = await getListingPhotos(listing.property_id);
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] =
      SITE_URL + (await getPathname({ locale: l, href: `/listings/${id}` }));
  }
  const description = (listing.description ?? listing.title).slice(0, 160);

  return {
    title: listing.title,
    description,
    alternates: { languages },
    openGraph: {
      title: listing.title,
      description,
      type: "website",
      images: photos[0] ? [{ url: photos[0].url }] : [],
    },
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const listing = await getPublicListing(id);
  if (!listing) {
    notFound();
  }

  const [photos, amenities, options] = await Promise.all([
    getListingPhotos(listing.property_id),
    getListingAmenities(listing.id),
    getFilterOptions(),
  ]);
  await incrementListingView(listing.id);

  // User-specific state, kept off the anon path. The phone is fetched ONLY for a
  // caller who has already revealed (get_revealed_contact) — otherwise it never
  // enters the payload.
  const current = await getCurrentUser();
  const signedIn = Boolean(current);
  const [initialContact, favoriteIds] = await Promise.all([
    signedIn ? getRevealedContact(listing.id) : Promise.resolve(null),
    current
      ? getFavoriteIds(current.user.id)
      : Promise.resolve(new Set<string>()),
  ]);
  const isFavorited = favoriteIds.has(listing.id);

  const t = await getTranslations("discovery");
  const label = (o: { name_uz: string; name_ru: string }) =>
    locale === "ru" ? o.name_ru : o.name_uz;
  const region = options.regions.find((r) => r.id === listing.region_id);
  const district = options.districts.find((d) => d.id === listing.district_id);

  // Spec block — mono values, only the fields that are set.
  const spec: { label: string; value: string }[] = [];
  if (listing.rooms)
    spec.push({ label: t("rooms"), value: String(listing.rooms) });
  if (listing.area_sqm)
    spec.push({
      label: t("area"),
      value: formatArea(listing.area_sqm, locale),
    });
  if (listing.floor !== null)
    spec.push({
      label: t("floor"),
      value: `${listing.floor}${listing.total_floors ? ` / ${listing.total_floors}` : ""}`,
    });
  if (listing.available_from)
    spec.push({ label: t("availableFrom"), value: listing.available_from });

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-6">
      <div className="lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        {/* Gallery (col 1, row 1) */}
        <Gallery photos={photos} />

        {/* Info (col 2, row 1) — sticky through the gallery's height */}
        <aside className="mt-6 flex flex-col gap-5 lg:mt-0 lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-h1 text-ink">{listing.title}</h1>
              <FavoriteButton
                listingId={listing.id}
                initialFavorited={isFavorited}
                signedIn={signedIn}
                locale={locale}
                className="shrink-0"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-h2 text-ink font-mono">
                {formatPriceWithPeriod(
                  listing.price_amount,
                  listing.price_currency,
                  listing.rental_period,
                  locale,
                )}
              </p>
              {listing.verification_status === "verified" ? (
                <VerifiedBadge label={t("verified")} />
              ) : null}
            </div>
            <p className="text-body text-ink-secondary">
              {region ? label(region) : ""}
              {district ? ` — ${label(district)}` : ""}
            </p>
          </div>

          {spec.length > 0 ? (
            <dl className="border-rule grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4">
              {spec.map((s) => (
                <div key={s.label} className="flex flex-col gap-0.5">
                  <dt className="text-caption text-ink-muted">{s.label}</dt>
                  <dd className="text-body text-ink font-mono">{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <ContactReveal
            signedIn={signedIn}
            locale={locale}
            listingId={listing.id}
            revealCount={listing.reveal_count}
            initialContact={initialContact}
          />

          <p className="text-caption text-ink-muted font-mono">
            {t("posted")}: {listing.created_at.slice(0, 10)}
          </p>
        </aside>

        {/* Prose (col 1, row 2) — description, amenities, and the report link */}
        <div className="mt-8 flex flex-col gap-6">
          {listing.description ? (
            <p className="text-body text-ink whitespace-pre-wrap">
              {listing.description}
            </p>
          ) : null}

          {amenities.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-h3 text-ink">{t("amenities")}</h2>
              <ul className="text-body text-ink flex flex-wrap gap-x-5 gap-y-1">
                {amenities.map((a) => (
                  <li key={a.id}>{label(a)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-caption text-ink-muted mt-2">{t("report")}</p>
        </div>
      </div>
    </main>
  );
}
